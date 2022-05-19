const _ = require('lodash');

const { evalWindowProperties, getNativeWindowProperties } = require('../parse/window-properties');
const parseResponse = require('../parse/xhr-requests');

const IGNORED_EXTENSIONS = ['.css', '.png', '.jpg', '.svg', '.gif'];

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/604.3.5 (KHTML, like Gecko) Version/11.0.1 Safari/604.3.5',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:56.0) Gecko/20100101 Firefox/56.0',
    'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko',
];

const PAGE_EVALUATE_TIMEOUT = 20 * 1000;

const promiseWithTimeout = (promise, timeout) => Promise.race([
    promise,
    new Promise((resolve, reject) => setTimeout(reject, timeout)),
]);

/**
 * Takes input http://<hostname>/<path>?<query>#<location> and outputs
 * array containing up to 8 urls:
 * http://<hostname>/<path>?<query>#<location>,
 * http://<hostname>/<path>?<query>,
 * http://<hostname>/<path>#<location>,
 * http://<hostname>/<path>,
 * http://<hostname>/<path>/?<query>#<location>,
 * http://<hostname>/<path>/?<query>,
 * http://<hostname>/<path>/#<location>,
 * http://<hostname>/<path>/
 */
function getValidUrls(url) {
    const possibleBaseUrls = [];
    const [path, location] = url.split('#');
    const [baseUrl, query] = path.split('?');
    // remove ending slash
    const baseUrlWithoutSlash = baseUrl.replace(/^(.*)\/$/, '$1');
    const baseUrlVariations = [baseUrlWithoutSlash];
    if (baseUrl !== baseUrlWithoutSlash) baseUrlVariations.push(baseUrl);
    else baseUrlVariations.push(`${baseUrlWithoutSlash}/`);
    baseUrlVariations.forEach(variation => {
        if (query && location) {
            possibleBaseUrls.push(`${variation}?${query}#${location}`);
        }
        if (query) {
            possibleBaseUrls.push(`${variation}?${query}`);
        }
        if (location) {
            possibleBaseUrls.push(`${variation}#${location}`);
        }
        possibleBaseUrls.push(variation);
    });
    return possibleBaseUrls;
}

class PageScrapper {
    constructor(browser, tests) {
        this.browser = browser;
        this.tests = tests;
        this.requests = {};
        this.handlers = {};
        this.mainRequestId = null;
        this.initialResponse = null;

        this.on = this.on.bind(this);
        this.call = this.call.bind(this);
        this.start = this.start.bind(this);
        this.getOrCreateRequestRecord = this.getOrCreateRequestRecord.bind(this);
        this.onRequest = this.onRequest.bind(this);
        this.onResponse = this.onResponse.bind(this);
        this.onPageError = this.onPageError.bind(this);
        this.cookies  = null;
    }

    on(action, handler) {
        this.handlers[action] = handler;
    }

    call(action, data) {
        if (this.handlers[action]) {
            this.handlers[action](data);
        }
    }

    getOrCreateRequestRecord(requestId) {
        let rec = this.requests[requestId];
        if (!rec) {
            rec = {
                url: null,
                method: null,
                headers: null,
                postData: null,
                responseStatus: null,
                responseHeaders: null,
            };
            this.requests[requestId] = rec;
        }
        return rec;
    }

    // 'requests'
    onRequest(request) {
        const ignore = IGNORED_EXTENSIONS.reduce((ignored, extension) => {
            if (ignored) return ignored;
            return request.url().endsWith(extension);
        }, false);

        if (ignore) {
            request.abort();
            return;
        }
        request.continue();

        const rec = this.getOrCreateRequestRecord(request.url());
       
        rec.url = request.url();
        // console.log(rec.url);

        rec.method = request.method();
        rec.postData = request.postData();
        rec.headers = request.headers();

        this.call('request', request);

        if (rec.url === this.url || rec.url.replace(this.url, '') === '/') {
            this.initialResponse = rec;
        }
    }

    async onResponse(response) {
        const request = response.request();
        // console.log("Request url from onResponse: "  + request.url());
        const requestHeaders = response.request().headers();
        // console.log("Headers after response: " + JSON.stringify(requestHeaders));

        const rec = this.requests[request.url()];

        if (!rec) return;

        const data = await parseResponse(response);

        if (!data.ignore) {
            rec.responseStatus = data.status;
            rec.responseHeaders = data.headers;
            rec.responseBody = data.body;
            this.requests[rec.url] = rec;
        } else {
            this.requests[rec.url] = undefined;
        }

        let possibleBaseUrls = getValidUrls(this.url);

        let matchesBaseUrls = possibleBaseUrls.indexOf(rec.url) !== -1;

        if (matchesBaseUrls && rec.responseStatus >= 300 && rec.responseStatus < 400) {
            const newLocation = rec.responseHeaders.location;
            const isRelative = !newLocation.startsWith('http');
            if (!isRelative) this.url = newLocation;
            else {
                const newUrl = this.url.replace(/(http:\/\/[^/]*).*/, `$1${newLocation}`);
                this.url = newUrl;
            }

            // regenerate urls if we performed redirect
            possibleBaseUrls = getValidUrls(this.url);
        }

        matchesBaseUrls = possibleBaseUrls.indexOf(rec.url) !== -1;

        if (matchesBaseUrls) {
            this.initialResponse = rec;
            this.call('initial-response', rec);
        } else {
            this.call('response', rec);
        }
    }

    async onPageError(err) {
        this.call('page-error', err);
        this.closePage();
    }

    async closePage() {
        try {
            await this.page.close();
        } catch (error) {
            this.call('error', {
                message: 'Error closing page',
                error,
            });
        }
    }

    async start(url) {
        this.requests = {};
        this.mainRequestId = null;
        this.page = null;
        this.url = url;

        try {
            this.page = await this.browser.newPage();
            const agentID = Math.floor(Math.random() * 4);
            await this.page.setUserAgent(USER_AGENTS[agentID]);

            this.page.setRequestInterception(true);
            this.page.setDefaultNavigationTimeout(40 * 1000); // navigation timeout of 30s

            this.page.on('error', this.onPageError);

            let nativeWindowsProperties = {};
            if (this.tests.includes('WINDOW')) {
                nativeWindowsProperties = await getNativeWindowProperties(this.page);
            }
            this.page.on('request', this.onRequest);
            this.page.on('response', this.onResponse);

            this.call('started', { url, timestamp: new Date() });

            try {
                await this.page.goto(url, { waitUntil: 'networkidle2' });
                // await this.page.waitForTimeout(5000);
                this.cookies = await this.page.cookies();
                // await this.page.reload({ waitUntil: ["networkidle2", "domcontentloaded"] });
            } catch (error) {
                this.call('error', error);
                console.error(error);
            }

            this.call('loaded', { url, timestamp: new Date() });

            const rec = this.initialResponse;

            if (!rec) {
                this.closePage();
                this.call('done', { timestamp: new Date() });
                return;
            }

            if (this.tests.includes('XHR')) {
                this.call(
                    'requests',
                    Object.keys(this.requests)
                        .filter(requestUrl => {
                            if (requestUrl === this.initialResponse.url) return false;
                            if (!this.requests[requestUrl]) return false;
                            if (!this.requests[requestUrl].responseBody) return false;
                            return true;
                        })
                        .map(requestUrl => this.requests[requestUrl]),
                );
            } else {
                this.call(
                    'requests',
                    [],
                );
            }

            try {
                await new Promise(resolve => setTimeout(resolve, 10000));
                const { html } = await promiseWithTimeout(
                    this.page.evaluate(() => ({
                        html: document.documentElement.innerHTML, // eslint-disable-line
                    })),
                    PAGE_EVALUATE_TIMEOUT,
                );
                this.call('html', html);
            } catch (error) {
                this.call('error', { message: 'HTML Load timed out', error });
                console.error(error);
            }

            try {
                if (this.tests.includes('WINDOW')) {
                    const { allWindowProperties } = await promiseWithTimeout(
                        this.page.evaluate(() => ({
                            allWindowProperties: Object.keys(window), // eslint-disable-line
                        })),
                        PAGE_EVALUATE_TIMEOUT,
                    );
                    // Extract list of non-native window properties
                    let windowProperties = _.filter(allWindowProperties, (propName) => !nativeWindowsProperties[propName]);
                    windowProperties = await promiseWithTimeout(
                        this.page.evaluate(evalWindowProperties, windowProperties),
                        PAGE_EVALUATE_TIMEOUT,
                    );
                    this.call('window-properties', windowProperties);
                } else {
                    this.call('window-properties', {});
                }
            } catch (error) {
                this.call('error', { message: 'Get window properties timed out', error });
                console.error(error);
            }

            this.closePage();
            this.call('done', new Date());
        } catch (e) {
            this.call('error', `Loading of web page failed (${url}): ${e}`);
            this.closePage();
        }
    }
}

module.exports = PageScrapper;

const cheerio = require('cheerio');
const Apify = require('apify');
const { isString } = require('lodash');
const PageScrapper = require('./scrap/page');
const parseMetadata = require('./parse/metadata');
const parseSchemaOrgData = require('./parse/schema-org');
const parseJsonLD = require('./parse/json-ld');
const DOMSearcher = require('./search/DOMSearcher');
const TreeSearcher = require('./search/TreeSearcher');
const OutputGenerator = require('./generate/Output');
const { findCommonAncestors, getHostName } = require('./utils');
const { readInputAsync } = require('./input/inputReader');
const htmlGenerator = require('./generate/HtmlOutput');
const { ValidatorReloaded } = require('./validate/validatorReloaded');
var util = require('util');
const { hostname } = require('os');

let lastLog = Date.now();

const log = (message) => {
    const currentLog = Date.now();
    console.log(new Date(), `${Math.round((currentLog - lastLog) / 10) / 100}s`, message);
    lastLog = currentLog;
};

function wait(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}


let output = null;

async function waitForEnd(field) {
    let done = output.get(field);
    while (!done) {
        await wait(100); // eslint-disable-line
        done = output.get(field);
    }
    return done;
}

async function analysePage(browser, url, searchFor, tests, inputIndex) {
    output.setNewUrl(url);
    console.log('================================');
    console.log(url);
    console.log('================================');


    //create filenames for initial html response and html validation output
    const domainName = getHostName(url);
    console.log(domainName);

    const initialResposneFileName = domainName + inputIndex;
    const validationFileName = domainName + 'Validation' + inputIndex;

    log('analysisStarted');
    output.set('analysisStarted', new Date());

    const scrappedData = {
        windowProperties: {},
        html: '<body></body>',
    };

    const scrapper = new PageScrapper(browser, tests);

    scrapper.on('started', (data) => {
        log('scrapping started');
        scrappedData.loadingStarted = data;
        output.set('scrappingStarted', data.timestamp);
    });

    scrapper.on('loaded', (data) => {
        log('loaded');
        scrappedData.loadingFinished = data;
        output.set('pageNavigated', data.timestamp);
    });

    scrapper.on('initial-response', async (response) => {
        log('initial response');

        output.set('initialResponse', {
            url: response.url,
            status: response.status,
            headers: response.responseHeaders,
        });

        const html = response.responseBody;
        const treeSearcher = new TreeSearcher();

        try {
            await Apify.setValue("initialResponse", html, { contentType: 'text/html' });
            // await Apify.setValue(initialResposneFileName, html, { contentType: 'text/html' });
        } catch (err) {
            log("Failed to save initial response!");
            console.log(err.message);
        }

        try {
            log(`start of html: ${html && html.substr && html.substr(0, 500)}`);
            const $ = cheerio.load(html);
            if (tests.includes('META')) {
                const metadata = parseMetadata({ $ });
                await output.set('metaDataParsed', true);
                await output.set('metaData', metadata);
                const foundMetadata = treeSearcher.find(metadata, searchFor);
                await output.set('metaDataFound', foundMetadata);
            } else {
                await output.set('metaDataParsed', true);
                await output.set('metaData', []);
                await output.set('metaDataFound', []);
            }
            log('metadata searched');
            await output.set('metadataSearched', new Date());

            if (tests.includes('JSON-LD')) {
                const jsonld = parseJsonLD({ $ });
                await output.set('jsonLDDataParsed', true);
                await output.set('allJsonLDData', jsonld);
                const foundJsonLD = treeSearcher.find(jsonld, searchFor);
                await output.set('jsonLDDataFound', foundJsonLD);
                await output.set(
                    'jsonLDData',
                    findCommonAncestors(
                        jsonld,
                        foundJsonLD,
                    ),
                );
            } else {
                await output.set('jsonLDDataParsed', true);
                await output.set('allJsonLDData', []);
                await output.set('jsonLDDataFound', []);
                await output.set('jsonLDData', []);
            }
            log('json-ld searched');
            await output.set('jsonLDSearched', new Date());

            if (tests.includes('SCHEMA.ORG')) {
                const schemaOrgData = parseSchemaOrgData({ $ });
                await output.set('schemaOrgDataParsed', true);
                await output.set('allSchemaOrgData', schemaOrgData);
                const foundSchemaOrg = treeSearcher.find(schemaOrgData, searchFor);
                await output.set('schemaOrgDataFound', foundSchemaOrg);
                await output.set(
                    'schemaOrgData',
                    findCommonAncestors(
                        schemaOrgData,
                        foundSchemaOrg,
                    ),
                );
            } else {
                await output.set('schemaOrgDataParsed', true);
                await output.set('allSchemaOrgData', []);
                await output.set('schemaOrgDataFound', []);
                await output.set('schemaOrgData', []);
            }
            log('schema org searched');
            await output.set('schemaOrgSearched', new Date());


            await output.set('htmlParsed', true);
            if (tests.includes('HTML')) {
                const domSearcher = new DOMSearcher({ $ });
                const foundSelectors = domSearcher.find(searchFor);
                await output.set('htmlFound', foundSelectors);
            } else {
                await output.set('htmlFound', []);
            }
            log('initial html searched');

        } catch (error) {
            console.error('Intitial response parsing failed');
            console.error(error);
        }
    });

    scrapper.on('html', async (html) => {
        log('html');
        scrappedData.html = html;
        output.set('htmlFullyParsed', true);
        try {
            if (tests.includes('HTML')) {
                const $ = cheerio.load(scrappedData.html || '<body></body>');
                const domSearcher = new DOMSearcher({ $ });
                const foundSelectors = domSearcher.find(searchFor);
                await output.set('htmlFound', foundSelectors);
            } else {
                await output.set('htmlFound', []);
            }
        } catch (error) {
            console.error('HTML search failed');
            console.error(error);
        }
        log('html searched');
        await output.set('htmlSearched', new Date());
    });

    scrapper.on('window-properties', async (properties) => {
        log('window properties');
        scrappedData.windowProperties = properties;
        output.set('windowPropertiesParsed', true);
        output.set('allWindowProperties', properties);
        // Evaluate non-native window properties

        const treeSearcher = new TreeSearcher();
        try {
            const foundWindowProperties = treeSearcher.find(scrappedData.windowProperties, searchFor);
            output.set('windowPropertiesFound', foundWindowProperties);
            output.set(
                'windowProperties',
                findCommonAncestors(
                    scrappedData.windowProperties,
                    foundWindowProperties,
                    true,
                ),
            );
            log('window properties searched');
        } catch (error) {
            console.error('Window properties parsing failed');
            console.error(error);
        }
        output.set('windowPropertiesSearched', new Date());
    });

    scrapper.on('screenshot', (data) => {
        log('screenshot');
        output.set('screenshot', data);
    });

    scrapper.on('requests', async (requests) => {
        log('requests');
        scrappedData.xhrRequests = requests;
        output.set('xhrRequestsParsed', true);
        output.set('xhrRequests', requests);

        if (!requests.length) {
            output.set('xhrRequestsFound', []);
            output.set('xhrRequestsSearched', new Date());
            return;
        }

        try {
            const treeSearcher = new TreeSearcher();
            const xhrRequestResults = [];
            requests.forEach(request => {
                let results;

                // if response body is html in string format
                if (isString(request.responseBody)) {
                    const searcher = new DOMSearcher({ html: request.responseBody });
                    results = searcher.find(searchFor);

                    // if response body is json 
                } else {
                    results = treeSearcher.find(request.responseBody.data, searchFor);

                    //look for html objects inside json 


                }
                if (results.length > 0) {
                    xhrRequestResults.push({
                        url: `${request.url}`,
                        method: `${request.method}`,
                        requestHeaders: request.requestHeaders,
                        request: request,
                        searchResults: results,
                    });
                }
            });
            output.set('xhrRequestsFound', xhrRequestResults);
            log('xhrRequests searched');
        } catch (err) {
            log('XHR Request search failed');
            console.error(err);
        }
        output.set('xhrRequestsSearched', new Date());
    });

    scrapper.on('done', (data) => {
        log('scrapping finished');
        output.set('scrappingFinished', data.timestamp);
    });

    scrapper.on('page-error', (data) => {
        log('page error');
        scrappedData.pageError = data;
        output.set('pageError', data);
    });

    scrapper.on('error', (data) => {
        log('error');
        scrappedData.pageError = data;
        output.set('error', data);
    });

    try {
        const fullUrl = url.match(/^http(s)?:\/\//i) ? url : `http://${url}`;
        log(`Starting scraper for: ${fullUrl}`);
        await scrapper.start(fullUrl);
        // prevent act from closing before all data is asynchronously parsed and searched
        await waitForEnd('analysisEnded');


        // validate single url
        // const validator = new Validator(url, searchFor, tests, output.fields, scrapper.cookies);

        const validator = new ValidatorReloaded(url, searchFor, tests, output.fields, domainName, inputIndex, scrapper.cookies);
        output.set('validationStarted', new Date());
        await validator.validate();
        output.set('validationFinished', new Date());

        //generate validation html output 
        this.htmlGenerator = new htmlGenerator(output.fields);

        await this.htmlGenerator.generateHtmlFile("Validation");

        // await this.htmlGenerator.generateHtmlFile(validationFileName);

        // force last write of output data
        log('Force write of output with await');

        await output.writeOutput();
    } catch (error) {
        console.error(error);
    }
}

Apify.main(async () => {
    log('Loading data from input');
    try {

        // Fetch the input and check it has a valid format
        // You don't need to check the input, but it's a good practice.
        const inputFileName = 'INPUT';
        let input = await readInputAsync(inputFileName);
        // TODO: Per page tests
        const tests = input.tests || ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML'];
        output = new OutputGenerator(tests);

        const launchPuppeteerContext = {
            // fix CORS error
            launchOptions: {
                args: [
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins',
                    '--disable-site-isolation-trials'
                ]
            }
        };

        console.log("env objct: " + util.inspect(process.env, { depth: null }));

        // if (process.env.APIFY_PROXY_PASSWORD) {
        //     const proxyConfiguration = await Apify.createProxyConfiguration(
        //     );
        //     launchPuppeteerContext.proxyUrl = proxyConfiguration.newUrl();

        //     console.log("Proxy configuration" + util.inspect(proxyConfiguration, { depth: null }));
        // }

        // if (process.env.PROXY_GROUP && process.env.PROXY_PASSWORD) {
        //     const { PROXY_PASSWORD, PROXY_GROUP, PROXY_ADDRESS } = process.env;
        //     const proxyAddress = PROXY_ADDRESS || 'proxy.apify.com:8000';
        //     launchPuppeteerContext.proxyUrl = `http://groups-${PROXY_GROUP}:${PROXY_PASSWORD}@${proxyAddress}`;
        // }
        const browser = await Apify.launchPuppeteer(launchPuppeteerContext);

        let pageToAnalyze = null;
        for (let i = 0; i < input.pages.length; i++) {
            pageToAnalyze = input.pages[i];
            // eslint-disable-next-line no-await-in-loop
            await analysePage(browser, pageToAnalyze.url, pageToAnalyze.searchFor, pageToAnalyze.tests || tests, i);
        }

        log('Analyzer finished');
    } catch (error) {
        log('Top level error');
        console.error(error);
    }
    
});

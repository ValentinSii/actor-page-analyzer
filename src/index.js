const cheerio = require('cheerio');
const Apify = require('apify');
const { log } = Apify.utils;
const { isString } = require('lodash');

const InputReader = require('./input/inputReader')
const PageScrapper = require('./scrap/page');
const parseMetadata = require('./parse/metadata');
const parseSchemaOrgData = require('./parse/schema-org');
const parseJsonLD = require('./parse/json-ld');
const DOMSearcher = require('./search/DOMSearcher');
const TreeSearcher = require('./search/TreeSearcher');
const OutputGenerator = require('./generate/Output');
const { findCommonAncestors } = require('./utils');
const { Validator } = require('./validate/validator');

const fs = require('fs');

let lastLog = Date.now();


// TODO: fix logging
// const log = (message) => {
//     const currentLog = Date.now();
//     console.log(new Date(), `${Math.round((currentLog - lastLog) / 10) / 100}s`, message);
//     lastLog = currentLog;
// };

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


async function analysePage(browser, url, searchFor, tests) {
    output.setNewUrl(url);
    output.set('searchFor', searchFor);
    console.log('================================');
    console.log(url);
    console.log('================================');
    log.debug('analysisStarted');
    output.set('analysisStarted', new Date());

    const scrappedData = {
        windowProperties: {},
        html: '<body></body>',
    };

    // browser = await Apify.launchPuppeteer(launchPuppeteerContext);
    const scrapper = new PageScrapper(browser, tests);

    scrapper.on('started', (data) => {
        log.debug('scrapping started');
        scrappedData.loadingStarted = data;
        output.set('scrappingStarted', data.timestamp);
    });

    scrapper.on('loaded', (data) => {
        log.debug('loaded');
        scrappedData.loadingFinished = data;
        output.set('pageNavigated', data.timestamp);
    });

    scrapper.on('initial-response', async (response) => {
        log.debug('initial response');

        output.set('initialResponse', {
            url: response.url,
            status: response.status,
            headers: response.responseHeaders,
        });

        const html = response.responseBody;
        const treeSearcher = new TreeSearcher();
        const htmlJson = JSON.stringify(response.responseBody);

        await Apify.setValue('html', htmlJson, { contentType: 'text/html' });

        try {
            log.debug(`start of html: ${html && html.substr && html.substr(0, 500)}`);
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
            log.debug('metadata searched');
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
            log.debug('json-ld searched');
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
            log.debug('schema org searched');
            await output.set('schemaOrgSearched', new Date());


            await output.set('htmlParsed', true);
            if (tests.includes('HTML')) {
                const domSearcher = new DOMSearcher({ $ });
                const foundSelectors = domSearcher.find(searchFor);
                await output.set('htmlFound', foundSelectors);
            } else {
                await output.set('htmlFound', []);
            }
            log.debug('initial html searched');
        } catch (error) {
            console.error('Intitial response parsing failed');
            console.error(error);
        }
    });

    scrapper.on('html', async (html) => {
        log.debug('html');
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
        log.debug('html searched');
        await output.set('htmlSearched', new Date());
    });

    scrapper.on('window-properties', async (properties) => {
        log.debug('window properties');
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
            log.debug('window properties searched');
        } catch (error) {
            console.error('Window properties parsing failed');
            console.error(error);
        }
        output.set('windowPropertiesSearched', new Date());
    });

    scrapper.on('screenshot', (data) => {
        log.debug('screenshot');
        output.set('screenshot', data);
    });

    scrapper.on('requests', async (requests) => {
        log.debug('requests');
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
                if (isString(request.responseBody)) {
                    const searcher = new DOMSearcher({ html: request.responseBody });
                    results = searcher.find(searchFor);
                } else {
                    results = treeSearcher.find(request.responseBody, searchFor);
                }
                if (results.length > 0) {
                    xhrRequestResults.push({
                        request: `${request.method} ${request.url}`,
                        response: request.responseBody,
                        searchResults: results,
                    });
                }
            });
            output.set('xhrRequestsFound', xhrRequestResults);
            log.debug('xhrRequests searched');
        } catch (err) {
            log.debug('XHR Request search failed');
            console.error(err);
        }
        output.set('xhrRequestsSearched', new Date());
    });

    scrapper.on('done', (data) => {
        log.debug('scrapping finished');
        output.set('scrappingFinished', data.timestamp);
    });

    scrapper.on('page-error', (data) => {
        log.debug('page error');
        scrappedData.pageError = data;
        output.set('pageError', data);
    });

    scrapper.on('error', (data) => {
        log.debug('error');
        scrappedData.pageError = data;
        output.set('error', data);
    });

    try {
        const fullUrl = url.match(/^http(s)?:\/\//i) ? url : `http://${url}`;
        await scrapper.start(fullUrl);
        // prevent act from closing before all data is asynchronously parsed and searched
        await waitForEnd('analysisEnded');
        // force last write of output data
        log.debug('Force write of output with await');
        // push all data to finishedData
        output.finish();

        await output.writeOutput();
    } catch (error) {
        console.error(error);
    }
}

Apify.main(async () => {


    log.debug('Loading data from input');
    try {


        // Fetch the input and check it has a valid format
        let input = await InputReader.readInputAsync();

        output = new OutputGenerator(input.tests);

        // this is here for dev purposes, validation step can be performed using OUTPUT.json file from previous runs
        const performAnalysis = true;

        if (performAnalysis) {

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

            if (process.env.PROXY_GROUP && process.env.PROXY_PASSWORD) {
                const { PROXY_PASSWORD, PROXY_GROUP, PROXY_ADDRESS } = process.env;
                const proxyAddress = PROXY_ADDRESS || 'proxy.apify.com:8000';
                launchPuppeteerContext.proxyUrl = `http://groups-${PROXY_GROUP}:${PROXY_PASSWORD}@${proxyAddress}`;
            }
            const browser = await Apify.launchPuppeteer(launchPuppeteerContext);

            let pageToAnalyze = null;
            for (let i = 0; i < input.pages.length; i++) {
                pageToAnalyze = input.pages[i];
                // eslint-disable-next-line no-await-in-loop
                await analysePage(browser, pageToAnalyze.url, pageToAnalyze.searchFor, input.tests);
            }
        }

        const validator = new Validator(input.pages[0], input.tests, input.pages[0].searchFor);
        await validator.validate();




        log.debug('Analyzer finished');
    } catch (error) {
        log.debug('Top level error');
        console.error(error);
    }
});

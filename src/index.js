const cheerio = require('cheerio');
const Apify = require('apify');
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
const fs = require('fs');

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
async function validate() {
    this.initialjsonld = {};
    this.$ = null;
    await tryCheerioCrawlerExample();
    

    //deserialzie output from file /home/vladopisko/source/apify/actor-page-analyzer/apify_storage/key_value_stores/default/OUTPUT.json
    const file = '/home/vladopisko/source/apify/actor-page-analyzer/apify_storage/key_value_stores/default/OUTPUT.json';
    const fileContents = fs.readFileSync(file, 'utf8');
    const outputData = JSON.parse(fileContents);
    const jsonld = outputData[0].jsonLDData;
    const jsonldFound = outputData[0].jsonLDDataFound;

    // validate html selectors 
    const htmlDataFound = outputData[0].htmlFound;

    //insert html that wont be found
    htmlDataFound.push({
        selector: "nonexistentSelector",
        text: "Non existent html text"

    });


    htmlDataFound.map(htmlData => {

        const htmlExpected = htmlData.text;
        const htmlFound = ($(htmlData.selector)).text();
        console.log('\x1b[30m%s\x1b[0m', `Html selector found: ${htmlData.selector}`);
        console.log('\x1b[30m%s\x1b[0m', `Html expected: ${htmlExpected}`);
        console.log('\x1b[30m%s\x1b[0m', `Html found in initial response with selector: ${htmlFound}`);        

        if (htmlExpected == htmlFound) {
            console.log('\x1b[32m%s\x1b[0m', `Expected html was found in initial reposnse, can be scraped with plain HTTP client.`);

        } else {
            console.log('\x1b[31m%s\x1b[0m', `Expected html was NOT found in initial reposnse, can be scraped with plain HTTP client.`);

        }
        console.log('==========================================================================');


    })

    
    // validate jsonld
    console.log(jsonldFound);

    jsonldFound.map(data => {
        console.log(data.path);
        console.log(data.value);

        const words = data.path.split('.');
        // const value = initialjsonld.;

        //find data based on selector

    })




}
async function tryCheerioCrawlerExample() {
    try {

        // Prepare a list of URLs to crawl
        const requestList = new Apify.RequestList({
            sources: [{ url: 'https://www.yelp.com/biz/cuisine-of-nepal-san-francisco' }],
        });
        await requestList.initialize();

        // Crawl the URLs
        const crawler = new Apify.CheerioCrawler({
            requestList,
            handlePageFunction: async ({ request, response, body, contentType, $ }) => {
                const data = [];

                // Extract data from the page using cheerio.
                const title = $('title').text();
                // console.log(`Title: ${title}`);
                this.initialjsonld = $('script[type="application/ld+json"]');
                // console.log(`Json-LD: ${initialjsonld}`);

                this.$ = $;
                const h1texts = [];
                $('h2').each((index, el) => {
                    h1texts.push({
                        text: $(el).text(),
                    });
                });

                h1texts.map((h2) => {
                    console.log(`H2: ${h2.text} from: ${request.url}`);
                });

            },
        });

        await crawler.run();
        console.log('Crawler finishedd.');



    } catch (err) {
        console.log(err);
        throw err;
    }
}

async function analysePage(browser, url, searchFor, tests) {
    output.setNewUrl(url);
    output.set('searchFor', searchFor);
    console.log('================================');
    console.log(url);
    console.log('================================');
    log('analysisStarted');
    output.set('analysisStarted', new Date());

    const scrappedData = {
        windowProperties: {},
        html: '<body></body>',
    };

    // browser = await Apify.launchPuppeteer(launchPuppeteerContext);
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

        await Apify.setValue('html', html, { contentType: 'text/html' });

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
        await scrapper.start(fullUrl);
        // prevent act from closing before all data is asynchronously parsed and searched
        await waitForEnd('analysisEnded');
        // force last write of output data
        log('Force write of output with await');
        // push all data to finishedData
        output.finish();

        await output.writeOutput();
    } catch (error) {
        console.error(error);
    }
}

Apify.main(async () => {
    log('Loading data from input');
    try {


        // Fetch the input and check it has a valid format
        let input = await InputReader.readInputAsync();

        output = new OutputGenerator(input.tests);

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

        // const validator = new Validator(output, input.url, input.pages);
        // await validator.tryExample();

        await tryCheerioCrawlerExample(input.pages, input.tests);
        await validate();


        log('Analyzer finished');
    } catch (error) {
        log('Top level error');
        console.error(error);
    }
});

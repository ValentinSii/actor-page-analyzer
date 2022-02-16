const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = require('got-scraping');
const {JSONPath} = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
const html = require('../generate/HtmlOutput');


// const got = require('got');



class Validator {

    constructor (inputPage, inputTests, inputSearchFor, analyzerOutput = null) {
        this.inputPageUrl = inputPage.url;
        this.inputTests = inputTests;
        this.inputSearchFor = inputSearchFor;

        this.analyzerOutputData = null;
        this.validatorOutputData = [];
        this.currentlyValidatedData = {};
        this.$ = null;

        // populate anlyzerOutputData
        // data from page analysis, reading from OUTPUT file
        this.readOutput();


        this.currentlyValidatedData.url = this.inputPageUrl;
        this.currentlyValidatedData.searchFor = this.inputSearchFor;

        log.info('Information message', { someData: 123 }); // prints message
        

    }

    async validate() {
        this.initialjsonld = {};
        this.$ = null;

        // load initial html with cheerioCrawler, populate variablle $
        await this.loadInitialHtml();

        

        this.validateHtml();


        // following will be done in similiar fashion as validateHtml
        // this.validateJsonLD();
        // this.validateSchemaOrg();
        // this.validateWindowProperties();

        await this.validateXhrRequests();

        // await gotScraping
        //             .get( {
        //                 url: requestUrl,
        //                 headerGeneratorOptions:{
        //                     browsers: [
        //                         {
        //                             name: 'chrome',
        //                             minVersion: 87,
        //                             maxVersion: 89
        //                         }
        //                     ],
        //                     devices: ['desktop'],
        //                     locales: ['de-DE', 'en-US'],
        //                     operatingSystems: ['windows', 'linux']
        //                 }
        //             })
        //             .then(({body}) => console.log(body));


        await this.dumpValidatorData();
    }
    async validateXhrRequests() {
        this.analyzerOutputData[0].xhrRequestsFound.map( (xhrRequest) => {
            console.log(xhrRequest);

            const splitRequest = xhrRequest.request.split(' ');
            const requestMethod = splitRequest[0];
            const requestUrl = splitRequest[1];

            

        });
    }

    validateJsonLD() {

        const jsonldmfk = this.initialjsonld;
        this.analyzerOutputData[0].jsonLDDataFound.map( (jsonLDDataFound) => {
            const result = JSONPath({path: jsonLDDataFound.path, json: jsonldmfk});
            console.log(result);

        });
    }
    validateHtml() {

        let htmlDataValidated = [];
        let allDataFound = true; 
        this.analyzerOutputData[0].htmlFound.map((htmlData) => {

            console.log(htmlData);

            const htmlFound = (this.$(htmlData.selector)).text();
            console.log('\x1b[30m%s\x1b[0m', `Html selector found: ${htmlData.selector}`);
            console.log('\x1b[30m%s\x1b[0m', `Html expected: ${htmlData.text}`);
            console.log('\x1b[30m%s\x1b[0m', `Html found: ${htmlFound}`);

            const htmlValidationResult = { 
                selector : htmlData.selector,
                htmlExpected : htmlData.text,
                htmlFound: htmlFound || null

            };
            htmlDataValidated.push(htmlValidationResult);

            // apify utils log.
            if (htmlData.text == htmlFound) {
                console.log('\x1b[32m%s\x1b[0m', `Expected  =  Found`);

            } else {
                console.log('\x1b[31m%s\x1b[0m', `Expected != Found`);
                allDataFound = false;

            }
            console.log('==========================================================================');
        });

        
        this.currentlyValidatedData.htmlDataValidated = htmlDataValidated; 
        console.log('==========================================================================');

        if (allDataFound) {
            console.log('\x1b[32m%s\x1b[0m', `All expected html data was found in initial reposnse`);

        } else {
            console.log('\x1b[31m%s\x1b[0m', `Not all expected html data was found in initial reposnse`);
            allDataFound = false;

        }

        console.log('==========================================================================');
        console.log('==========================================================================');

        const htmlGen = new html(this.currentlyValidatedData);
        htmlGen.generateHtmlFile();
    }


    async dumpValidatorData() {
        
        

        try {
            this.validatorOutputData.push(this.currentlyValidatedData);
            const data = JSON.stringify(this.validatorOutputData, null, 2);
            await Apify.setValue('VALIDATION', data, { contentType: 'application/json' });
            log.debug('VALIDATION written into file');
            
        } catch (error) {
            log.debug('could not save validator output');
            log.debug(error);
            throw error;
        }
    }
    async loadInitialHtml() {
        // Prepare a list of URLs to crawl
        const requestList = new Apify.RequestList({
            sources: [{ url: this.inputPageUrl }],
        });
        requestList.initialize();

        // Crawl the URLs
        const crawler = new Apify.CheerioCrawler({
            requestList,

            //this will retry 
            handlePageFunction: async ({ request, response, body, contentType, $ }) => {
                const data = [];

                // Extract data from the page using cheerio.
                const title = $('title').text();
                log.debug(`Title: ${title}`);
                // console.log(`Json-LD: ${initialjsonld}`);

                this.initialjsonld = parseJsonLD({ $ });


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
    }

    async readOutput() {

        //deserialzie output from file /home/vladopisko/source/apify/actor-page-analyzer/apify_storage/key_value_stores/default/OUTPUT.json
        const file = '/home/vladopisko/source/apify/actor-page-analyzer/apify_storage/key_value_stores/default/OUTPUT.json';
        const fileContents = fs.readFileSync(file, 'utf8');

        this.analyzerOutputData = JSON.parse(fileContents);

        this.analyzerOutputData[0].htmlFound
        this.analyzerOutputData[0].htmlFound.push({
            selector: "nonexistentSelector",
            text: "Non existent html text"
    
        });
    }
    
}


module.exports = { Validator }
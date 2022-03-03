const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = require('got-scraping');
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
const html = require('../generate/HtmlOutput');
const { result } = require('lodash');


// const got = require('got');



class Validator {

    constructor(inputPage, inputTests, inputSearchFor, analyzerOutput = null) {
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
        this.validateJsonLD();
        



        if (this.analyzerOutputData[0].xhrRequests.length > 0) {
            const xhrRequest = this.analyzerOutputData[0].xhrRequests[7];
            const requestMethod = xhrRequest.method;
            const requestUrl = xhrRequest.url;
            const requestHeaders = xhrRequest.requestHeaders;

            const requestResponse = null;
            if (requestMethod === "POST") {

                // const options = new Options({
                //     headers: requestHeaders
                // });

                const requestResponse = await gotScraping.post(
                    requestUrl, 
                    { 
                        headers: requestHeaders, 
                        json: { commodityId: 6398627 } 
                    });
                console.log(requestResponse);
                console.log(requestResponse.body);

                this.currentlyValidatedData.xhr = {
                    url: requestUrl,
                    method: requestMethod,
                    headers: requestHeaders,
                    responseBody: requestResponse.body
                }
                    // const data = JSON.stringify(await result, null, 2);
                    // await Apify.setValue('responseeeee', data, { contentType: 'application/text' });

                    // console.log(`Response from ${requestMethod} received sucessfully: \n ${requestResponse}`);
            }                

            
        }

        await this.dumpValidatorData();

        const htmlGen = new html(this.currentlyValidatedData);
        htmlGen.generateHtmlFile();


        // await this.validateXhrRequests();

        // following will be done in similiar fashion as validateHtml
        // this.validateJsonLD();
        // this.validateSchemaOrg();
        // this.validateWindowProperties();

        // await this.validateXhrRequests();

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



    }
    // validateXhrRequests() {
    //     this.analyzerOutputData[0].xhrRequestsFound.map( (xhrRequest) => {
    //         console.log(xhrRequest);


    //         const requestMethod = xhrRequest.requestMethod;
    //         const requestUrl = xhrRequest.requestUrl;
    //         const requestHeaders = xhrRequest.requestHeaders; 

    //         if (requestMethod === "GET") {

    //             // const options = new Options({
    //             //     headers: requestHeaders
    //             // });

    //             return gotScraping.get(requestUrl, {headers: requestHeaders }).then(({ body }) => console.log(body));
    //             // console.log(`Response from ${requestMethod} received sucessfully: \n ${requestResponse}`);
    //         } else if (requestMethod === "POST") {

    //         } else {
    //             console.log("Method not supported... yet");
    //         }




    //     });
    // }

    validateJsonLD() {

        const jsonld = { jsonLdArray: this.initialjsonld };
        let jsonLDDValidated = [];
        this.analyzerOutputData[0].jsonLDDataFound.map((jsonLDDataUnit) => {
            const jsonldFound = JSONPath({ path: 'jsonLdArray' + jsonLDDataUnit.path, json: jsonld });
            console.log(jsonldFound);

            const jsonldValidationResult = {
                path: jsonLDDataUnit.path,
                dataExpected: jsonLDDataUnit.value,
                dataFound: jsonldFound
            };
            jsonLDDValidated.push(jsonldValidationResult);

        });

        this.currentlyValidatedData.jsonLDDValidated = jsonLDDValidated;
        console.log('HTML validation end');
    }
    validateHtml() {

        let htmlDataValidated = [];
        let allDataFound = true;
        this.analyzerOutputData[0].htmlFound.map((htmlData) => {

            console.log(htmlData);
            const htmlFound = (this.$(htmlData.selector)).text();
            const htmlValidationResult = {
                selector: htmlData.selector,
                htmlExpected: htmlData.text,
                htmlFound: htmlFound || null

            };
            htmlDataValidated.push(htmlValidationResult);

        });

        this.currentlyValidatedData.htmlDataValidated = htmlDataValidated;
        console.log('HTML validation end');
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
        console.log('Initial html loaded sucessfully.');
    }

    async readOutput() {

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
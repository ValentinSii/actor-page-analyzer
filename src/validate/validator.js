const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = require('got-scraping');
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
// const html = require('../generate/HtmlOutput');
const { result } = require('lodash');

class Validator {

    constructor(inputUrl, inputSearchFor, inputTests,  analyzerOutput) {
        // data from user input
        this.inputPageUrl = inputUrl;
        this.inputSearchFor = inputSearchFor;
        this.inputTests = inputTests;
        this.analyzerOutput = analyzerOutput;

        // propagate data to validator output
        this.vod = {};
        this.vod.url = this.inputPageUrl;
        this.vod.searchFor = this.inputSearchFor;
        this.vod.tests = this.inputTests;

        // variable for cheeriocrawler object
        this.$ = null;
        
        console.log('Validator instance created sucessfully. ')
    }

    async validate() {

        // load initial html with cheerioCrawler into variable $
        await this.loadInitialHtml();



        this.validateHtml();
        this.analyzerOutput.validation = this.vod;
        // this.validateJsonLD();
        



        // if (this.analyzerOutputData[0].xhrRequests.length > 0) {
        //     const xhrRequest = this.analyzerOutputData[0].xhrRequests[7];
        //     const requestMethod = xhrRequest.method;
        //     const requestUrl = xhrRequest.url;
        //     const requestHeaders = xhrRequest.requestHeaders;

        //     const requestResponse = null;
        //     if (requestMethod === "POST") {

        //         // const options = new Options({
        //         //     headers: requestHeaders
        //         // });

        //         const requestResponse = await gotScraping.post(
        //             requestUrl, 
        //             { 
        //                 headers: requestHeaders, 
        //                 json: { commodityId: 6398627 } 
        //             });
        //         console.log(requestResponse);
        //         console.log(requestResponse.body);

        //         this.currentlyValidatedData.xhr = {
        //             url: requestUrl,
        //             method: requestMethod,
        //             headers: requestHeaders,
        //             responseBody: requestResponse.body
        //         }
        //             // const data = JSON.stringify(await result, null, 2);
        //             // await Apify.setValue('responseeeee', data, { contentType: 'application/text' });

        //             // console.log(`Response from ${requestMethod} received sucessfully: \n ${requestResponse}`);
        //     }                

            
        // }

        // await this.dumpValidatorData();

        // const htmlGen = new html(this.currentlyValidatedData);
        // htmlGen.generateHtmlFile();  
    }

    validateHtml() {

        let htmlDataValidated = [];

        this.analyzerOutput.htmlFound.map((htmlData) => {

            console.log(htmlData);
            const htmlFound = (this.$(htmlData.selector)).text();
            const htmlValidationResult = {
                selector: htmlData.selector,
                htmlExpected: htmlData.text,
                htmlFound: htmlFound || null

            };
            htmlDataValidated.push(htmlValidationResult);

        });

        this.vod.htmlDataValidated = htmlDataValidated;
        console.log('HTML validation end');
    }

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
                
                this.initialjsonld = parseJsonLD({ $ });
                this.$ = $;

            },
        });

        await crawler.run();
        console.log('Initial html loaded sucessfully.');
    }

}


module.exports = { Validator }
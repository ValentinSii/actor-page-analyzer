const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = require('got-scraping');
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
// const html = require('../generate/HtmlOutput');
const { result } = require('lodash');
const parseMetadata = require('../parse/metadata');
const parseSchemaOrgData = require('../parse/schema-org');

class Validator {

    constructor(inputUrl, inputSearchFor, inputTests, analyzerOutput) {
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
        this.initialjsonld = null;
        this.initialMetadata = null;
        this.initialSchema = null;
        this.initialWindowPorperties = null;

        this.errorList = [];
        this.initializeConclusionData();

        console.log('Validator instance created sucessfully. ')
    }

    async validate() {

        try {
            // load initial html with cheerioCrawler into variable $
            await this.loadInitialHtml();
            const jsonResposnse = await this.validateXHR();
            console.log(jsonResposnse.responseBody);



            this.validateHtml();
            this.validateJsonLD();
            // this.validateMetaData();
            this.analyzerOutput.validation = this.vod;
            // await this.validateXHR();
            // schema org 
            // metadata

            this.vod.validationConclusion = this.validationConclusion;
        } catch (err) {
            console.log("Failed to load initial html during validation.");
            console.log(err.message);
            this.errorList.push(err);
        }


    }
    // each searched string will have a conclusion "tab" telling user where the string was found and in wich data sources
    initializeConclusionData() {
        this.validationConclusion = {};
        this.inputSearchFor.forEach(searchedString => {
            this.validationConclusion[searchedString] = {
                html: [],
                json: [],
                meta: [],
                xhr: [],
                schema: [],
                window: [],
            }
        });

    }
    validateMetaData() {
        let metadataValidated = [];

        this.analyzerOutput.metaDataFound.forEach((metaUnit) => {
            try {
                console.log(metaUnit);

                const metaDataFound = (this.$(metaUnit.path)).text();

                const metaDataValidationResult = {
                    selector: metaUnit.path,
                    metaExpected: metaUnit.value,
                    metaFound: metaDataFound || null

                };
                metadataValidated.push(metaDataValidationResult);
            } catch (err) {
                console.log(err);
            }

        });

        this.vod.metaDataValidated = metadataValidated;
        console.log('Meta validation end');
    }
    validateHtml() {

        let htmlDataValidated = [];

        this.analyzerOutput.htmlFound.map((htmlData) => {

            try {
                console.log(htmlData);
                const htmlFound = (this.$(htmlData.selector)).text();
                const htmlExpected = htmlData.text;
                const htmlValidationResult = {
                    selector: htmlData.selector,
                    htmlExpected: htmlExpected,
                    htmlFound: htmlFound || null,
                    foundinLists: htmlData.foundinLists || null

                };
                htmlDataValidated.push(htmlValidationResult);

                // html in browser for given selector is the same as in initial response
                if (htmlFound == htmlExpected) {
                    this.validationConclusion[htmlData.foundSearchedStrings].html.push({
                        selector: htmlData.selector,
                        text: htmlFound
                    });
                }
            } catch (error) {
                console.log("Error during html validation")
                console.log(error.message);
                this.errorList.push(error);
            }

        });


        this.vod.htmlDataValidated = htmlDataValidated;
        console.log('HTML validation end');
    }

    validateJsonLD() {

        const jsonld = { jsonLdArray: this.initialjsonld };
        let jsonLDDValidated = [];

        this.analyzerOutput.jsonLDDataFound.map((jsonLDDataUnit) => {
            try {
                const jsonldFound = JSONPath({ path: 'jsonLdArray' + jsonLDDataUnit.path, json: jsonld });
                // console.log(jsonldFound);

                const jsonldValidationResult = {
                    path: jsonLDDataUnit.path,
                    dataExpected: jsonLDDataUnit.value,
                    dataFound: jsonldFound,
                    foundinLists: jsonLDDataUnit.foundinLists || null
                };
                jsonLDDValidated.push(jsonldValidationResult);

                if (jsonldFound == jsonLDDataUnit.value) {
                    this.validationConclusion[jsonLDDataUnit.originalSearchString].json.push({
                        selector: jsonLDDataUnit.path,
                        text: jsonldFound
                    });
                }

            } catch (error) {
                console.log("Error during jsonld validation")
                console.log(error.message);
                this.errorList.push(error);
            }

        });

        this.vod.jsonLDDValidated = jsonLDDValidated;
        console.log('Json-ld validation end');
    }

    async validateXHR() {


        const response = await gotScraping({
            responseType: 'json',
            url: 'https://api.apify.com/v2/browser-info',
        });
        return response;
        // this.analyzerOutput.xhrRequestsFound.forEach(async (xhr) => {
        //     const requestMethod = xhr.method;
        //     const requestUrl = xhr.url;
        //     const requestHeaders = xhr.request.headers;

        //     switch(requestMethod) {
        //         case 'GET' : {
        //             try {
        //                 const jsonResponse = await gotScraping.get(requestUrl, {
        //                     headers: requestHeaders 
        //                 }).json();

        //                 return jsonResponse;
        //             } catch (err) {
        //                 console.log(err);
                        
        //             }
        //             break;
        //         }
        //         case 'POST' : {

        //         break;
        //         }
        //         default: {
        //             console.log(`${requestMethod} is not supported (yet).`)
        //         }
        //     }


        // });

        // const { data } = await gotScraping.post('https://www.alza.sk/Services/EShopService.svc/GetCommodityAvailabilityControl', {
        //     json: {
        //         commodityId: 5669250
        //     }
        // }).json();
        // console.log(data.responseBody);
        // const requestMethod = xhrRequest.method;
        // const requestUrl = xhrRequest.url;
        // const requestHeaders = xhrRequest.requestHeaders;

        // const response = null;

        // if (requestMethod === "POST") {

        //     const options = new Opti    ons({
        //         headers: requestHeaders
        //     });

        //     const response = await gotScraping.post(
        //         requestUrl,
        //         {
        //             headers: requestHeaders
        //         });
        //     console.log(response.body);

        //     this.currentlyValidatedData.xhr = {
        //         url: requestUrl,
        //         method: requestMethod,
        //         headers: requestHeaders,
        //         responseBody: response.body
        //     }
        //     const data = JSON.stringify(await result, null, 2);
        //     await Apify.setValue('responseeeee', data, { contentType: 'application/text' });

        //     console.log(`Response from ${requestMethod} received sucessfully: \n ${requestResponse}`);
    
    // if (this.analyzerOutput.xhrRequestsFound.length > 0) {

    //     this.analyzerOutput.xhrRequestsFound.forEach(async (xhrRequest) => {
    //         const requestMethod = xhrRequest.method;
    //         const requestUrl = xhrRequest.url;
    //         const requestHeaders = xhrRequest.requestHeaders;

    //         const response = null;

    //         if (requestMethod === "POST") {

    //             const options = new Options({
    //                 headers: requestHeaders
    //             });

    //             const response = await gotScraping.post(
    //                 requestUrl, 
    //                 { 
    //                     headers: requestHeaders
    //                 });
    //             console.log(response.body);

    //             this.currentlyValidatedData.xhr = {
    //                 url: requestUrl,
    //                 method: requestMethod,
    //                 headers: requestHeaders,
    //                 responseBody: response.body
    //             }
    //             const data = JSON.stringify(await result, null, 2);
    //             await Apify.setValue('responseeeee', data, { contentType: 'application/text' });

    //             console.log(`Response from ${requestMethod} received sucessfully: \n ${requestResponse}`);
    //         }





    //     });
            
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

            // parse all available data
            this.initialjsonld = parseJsonLD({ $ });
            this.initialMetadata = parseMetadata({ $ });
            this.initialSchema = parseSchemaOrgData({ $ });

            this.$ = $;

        },
    });

    await crawler.run();
    console.log('Initial html loaded sucessfully.');
}

}


module.exports = { Validator }
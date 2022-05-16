const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = require('got-scraping');
// const {got} =  require('got');
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
// const html = require('../generate/HtmlOutput');
const { result, orderBy } = require('lodash');
const parseMetadata = require('../parse/metadata');
const parseSchemaOrgData = require('../parse/schema-org');

const DOMSearcher = require('../search/DOMSearcher');
const TreeSearcher = require('../search/TreeSearcher');
cheerio = require('cheerio');


class Validator {

    constructor(inputUrl, inputSearchFor, inputTests, analyzerOutput, allCookies) {
        // data from user input
        this.inputPageUrl = inputUrl;
        this.inputSearchFor = inputSearchFor;
        this.inputTests = inputTests;
        this.analyzerOutput = analyzerOutput;

        //cookies from page.cookies()
        this.allCookies = allCookies;

        // propagate data to validator output
        this.vod = {};
        this.vod.url = this.inputPageUrl;
        this.vod.searchFor = this.inputSearchFor;
        this.vod.tests = this.inputTests;

        //
        this.vod.cheerioInitialResponse = null;

        this.vod.cheerioCrawlerError = null;

        this.vod.xhrValidation = [];

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

            //request was sucessfully obtained by http request with cheerio crawler
            if (this.vod.cheerioCrawlerError == null) {
                this.validateHtml();
                // this.validateJsonLD();
                // this.validateMetaData();
                this.analyzerOutput.validation = this.vod;

                // console.log(gotResponse);
                // schema org 
                // metadata
            }

            await this.validateAllXHR();


            // const jsonResposnse = await this.validateXHR();
            // console.log(jsonResposnse.responseBody);





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

        //if we faield to load or par initial html response using cheerioCrawler
        if (this.$ == null) {
            //we load empty html so analysis can continue 
            //TODO: fix this terrible design
            this.$ == cheerio.load('');
        }

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


                this.validationConclusion[htmlData.foundSearchedStrings].html.push({
                    selector: htmlData.selector,
                    text: htmlFound,
                    textExpected: htmlExpected,
                    match: htmlFound == htmlExpected ? true : false
                });
            } catch (error) {
                console.log("Error during html validation")
                console.log(error.message);
                this.errorList.push(error);
            }

        });


        this.inputSearchFor.forEach(keyword => {

            this.validationConclusion[keyword].html = orderBy(this.validationConclusion[keyword].html, ['match'], ['desc']);
        })

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

    async validateAllXHR() {

        if (this.analyzerOutput.xhrRequestsFound.length > 0) {

            for (const xhrFound of this.analyzerOutput.xhrRequestsFound) {

                try {

                    let retryObject = {
                        callsMinimalHeaders: null,
                        callsWithoutCookie: null,
                        callsWithCookie: null
                    }

                    //first try to call request with minimum necessary headers
                    const minimalHeaders = {};
                    minimalHeaders["referer"] = xhrFound.request.headers["referer"];
                    minimalHeaders["user-agent"] = xhrFound.request.headers["user-agent"];
                    
                    let requestValidationObject = {
                        url: xhrFound.request.url,
                        method: xhrFound.request.method,
                        headers: minimalHeaders
                    };
                    //copy 
                    if (xhrFound.request.postData != null) {
                        requestValidationObject.body = xhrFound.request.postData;
                        requestValidationObject.headers["content-type"] = xhrFound.request.headers["content-type"];
                    }                 
                
                    retryObject.callsMinimalHeaders = await this.callGotRequest(requestValidationObject);

                    //use all headers from puppeteer session, these dont contain cookies
                    requestValidationObject.headers = xhrFound.request.headers;
                    retryObject.callsWithoutCookie = await this.callGotRequest(requestValidationObject);

                    //use all headers from puppeteer session, also add all cookies retrieved from puppeteer calling page.cookies();
                    const cookieString = this.allCookies.map((cookie) => {
                        return `${cookie.name}=${cookie.value}`;
                    }).join("; ");


                    requestValidationObject.headers["cookie"] = cookieString;
                    retryObject.callsWithCookie = await this.callGotRequest(requestValidationObject);

                    this.vod.xhrValidation.push(retryObject);
                }
                catch (err) {

                    console.log(err.message);
                }
            }

        }
    }
    async callGotRequest(requestObject) {
        const retryCount = 3;

        const requestCalls = [];
        for (let i = 0; i < retryCount; i++) {

            const response = await gotScraping(requestObject);
            const validationResult = this.validateGotResponse(requestObject, response);
            requestCalls.push(validationResult);

            //response success
            //TODO: maybe compare with original responseStatus?
            // if (validationResult.responseStatus >= 200 && validationResult.responseStatus < 300) {
            //     break;
            // }

        }

        return requestCalls;

    }
    validateGotResponse(requestObject, gotResponse) {

        let requestValidationEntry = {
            request: requestObject,
            response: {
                status: gotResponse.statusCode,
                body: gotResponse.body,
                headers: gotResponse.headers

            }
        }

        //TODO: how to deal with other content-types?        
        if (gotResponse.headers['content-type'].indexOf('json') != -1) {
            const responseBodyJson = JSON.parse(gotResponse.body);
            const treeSearcher = new TreeSearcher();
            requestValidationEntry.searchResults = treeSearcher.find(responseBodyJson, this.vod.searchFor);


        } else if (gotResponse.headers['content-type'].indexOf('html') != -1) {
            const domSearcher = new DOMSearcher({html: gotResponse.body});
            requestValidationEntry.searchResults = domSearcher.find(this.vod.searchFor);
        }

        return requestValidationEntry;
    }
    async loadInitialHtml() {
        // await Apify.utils.purgeLocalStorage();
        // Prepare a list of URLs to crawl

        const requestList = new Apify.RequestList({
            sources: [{ url: this.inputPageUrl }],
        });
        requestList.initialize();

        // Crawl the URLs
        const crawler = new Apify.CheerioCrawler({
            requestList,

            maxRequestRetries: 4,

            // Increase the timeout for processing of each page.
            handlePageTimeoutSecs: 30,

            //this will retry 
            handlePageFunction: async ({ request, response, body, contentType, $ }) => {

                // // parse all available data
                // this.initialjsonld = parseJsonLD({ $ });
                // this.initialMetadata = parseMetadata({ $ });
                // this.initialSchema = parseSchemaOrgData({ $ });

                this.$ = $;
                console.log("CheerioCrawler response status: " + request.url);
                console.log(response);

            },
            handleFailedRequestFunction: async ({ request }) => {
                log.debug(`Request ${request.url} failed 5 times.`);
                this.cheerioCrawlerError = request.errorMessages;
            },
        });

        await crawler.run();
        console.log('Initial html loaded sucessfully.');
    }

}


module.exports = { Validator }
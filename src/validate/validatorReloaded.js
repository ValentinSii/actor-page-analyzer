const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = require('got-scraping');
// const {got} =  require('got');
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
// const html = require('../generate/HtmlOutput');
const { result, orderBy, initial } = require('lodash');
const parseMetadata = require('../parse/metadata');
const parseSchemaOrgData = require('../parse/schema-org');
const validateAllXHR = require('./XHRValidation');

const DOMSearcher = require('../search/DOMSearcher');
const TreeSearcher = require('../search/TreeSearcher');
cheerio = require('cheerio');


class ValidatorReloaded {


    constructor(inputUrl, inputSearchFor, inputTests, analyzerOutput, allCookies) {

        // data from user input
        this.url = inputUrl;
        this.searchFor = inputSearchFor;
        this.tests = inputTests;
        this.analyzerOutput = analyzerOutput;

        //cookies from page.cookies()
        this.allCookies = allCookies;

        // create object for validator output
        this.vod = {};
        this.vod.htmlValidated = [];
        this.vod.jsonValidated = [];
        this.vod.metaDataValidated = [];
        this.vod.schemaValidated = [];
        this.vod.windowValidated = [];
        // copy input data to validator output object
        this.vod.url = this.url;
        this.vod.searchFor = this.searchFor;
        this.vod.tests = this.tests;

        //create local variables for validaiton purposes
        //cheerio object
        this.$ = null;
        this.initialResponseBody = null;

        this.vod.topLevelError = null;
        this.cheerioCrawlerError = null;

        this.initializeConclusionData();

        console.log('Validator instance created.');

    }


    // ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML', 'VALIDATE'];
    async validate() {
        try {

            await this.loadInitialHtml();
            const cherioResponseSuccess = this.$ == null ? false : true;

            // we sucessfully retrieved initial response using cheerio crawler, data validation can be performer
            if (cherioResponseSuccess) {  
                if (this.tests.includes('HTML')) {
                    this.validateHtml();
                }

                if (this.tests.includes('JSON-LD')) {
                    const initialJsonld = parseJsonLD({ $: this.$ });
                    this.validateJsonLDData(initialJsonld);
                }

                if (this.tests.includes('META')) {
                    const initialMetaData = parseMetadata({ $: this.$ });
                    this.validateMetaData(initialMetaData);

                }

                if (this.tests.includes('SCHEMA.ORG')) {
                    const initialSchema = parseSchemaOrgData({ $:this.$})
                    this.validateSchema(initialSchema);                    

                } 

                // if (this.tests.includes('WINDOW')) {

                // } else {

                // }

                
            } else {
                // cheeriocrawler failed, we sitll need to generate conclusion, so we will copy data found by analyzer
            }

            // we can still validate XHR regardless of the cheeriocrawler response
            if (this.tests.includes('XHR')) {
                const validatedXhr = await validateAllXHR(this.analyzerOutput, this.searchFor, this.allCookies);
                this.vod.validatedXhr = validatedXhr;
            }




            this.analyzerOutput.vod = this.vod;
        } catch (topErr) {
            console.log('Top level error during validation.');
            console.log(topErr);
            console.trace();
            this.vod.topLevelError = topErr;
        }
    }

    //function populates cheerio object this.$ with html using cheeriocrawler
    async loadInitialHtml() {

        const requestList = new Apify.RequestList({
            sources: [{ url: this.url }],
        });
        requestList.initialize();

        const crawler = new Apify.CheerioCrawler({
            requestList,

            maxRequestRetries: 4,
            // Increase the timeout for processing of each page.
            handlePageTimeoutSecs: 30,

            //this will retry 
            handlePageFunction: async ({ request, response, body, contentType, $ }) => {

                this.$ = $;
                this.initialResponseBody = body;
                console.log("CheerioCrawler response status: " + response.statusCode);

            },
            handleFailedRequestFunction: async ({ request }) => {
                log.debug(`Request ${request.url} failed 5 times.`);
                this.cheerioCrawlerError = request.errorMessages;
            },
            
        });

        await crawler.run();
        console.log('Initial html loaded sucessfully.');

    }

    validateHtml() {

        const htmlDataValidated = this.analyzerOutput.htmlFound.map((htmlFound) => {

            console.log(htmlFound);
            const valueFound = (this.$(htmlFound.path)).text();

            return {
                ...htmlFound,
                valueFound: valueFound ? valueFound : null
            }

            // try {
            //     console.log(htmlFound);
            //     const valueFound = (this.$(htmlFound.path)).text();
            //     return {
            //         ...htmlFound,
            //         valueFound
            //     }
            // } catch (error) {
            //     console.log(error);
            //     console.log("Cheerio error validitin with selector" + htmlFound.path);
            //     return {
            //         htmlFound,
            //         valueFound : null
            //     };
            // }

        });
        this.vod.htmlValidated = htmlDataValidated;
    }

    validateJsonLDData(initialDataArray) {
        const jsonDataValidated = this.analyzerOutput.jsonLDDataFound.map((jsonFound) => {

            const initialDataObject = { data: initialDataArray }
            // try {
            //     const searchResultArray = JSONPath({ path: 'data' + jsonFound.path, json: initialDataObject });

            //     const valueFound = searchResultArray.length ? searchResultArray[0] : null;
            //     return {
            //         ...jsonFound,
            //         valueFound
            //     }
            // } catch (error) {
            //     console.log(error);
            //     console.log("Json-ld validation error with selector" + jsonFound.path);
            //     return {
            //         jsonFound,
            //         valueFound : null
            //     };

            // }
            const searchResultArray = JSONPath({ path: 'data' + jsonFound.path, json: initialDataObject });

            const valueFound = searchResultArray.length ? searchResultArray[0] : null;
            return {
                ...jsonFound,
                valueFound
            }

        });
        this.vod.jsonValidated = jsonDataValidated;
    }

    validateMetaData(initialMetaData) {
        const metaDataValidated = this.analyzerOutput.metaDataFound.map(metaFound => {
            const valueFound = initialMetaData[metaFound.path.substring(1)];
            if (valueFound) {
                return {
                    ...metaFound,
                    valueFound: valueFound ? valueFound : null
                }
            }
        })
        this.vod.metaDataValidated = metaDataValidated;
    }

    validateSchema(initialSchema) {
        const initialDataObject = { data: initialSchema }
        const schemaValidated = this.analyzerOutput.schemaOrgDataFound.map(schemaFound => {

            const searchResultArray = JSONPath({ path: 'data' + schemaFound.path, json: initialDataObject });

            const valueFound = searchResultArray.length ? searchResultArray[0] : null;
            return {
                ...schemaFound,
                valueFound
            }

        });
        this.vod.schemaValidated = schemaValidated;
    }

    initializeConclusionData() {
        this.vod.validationConclusion = {};
        this.searchFor.forEach(searchedString => {
            this.vod.validationConclusion[searchedString] = {
                html: [],
                json: [],
                meta: [],
                xhr: [],
                schema: [],
                window: [],
            }
        });

    }
}
module.exports = { ValidatorReloaded }
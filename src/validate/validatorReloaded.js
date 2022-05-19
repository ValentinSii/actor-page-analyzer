const Apify = require('apify');
const { log } = Apify.utils;
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
const parseMetadata = require('../parse/metadata');
const parseSchemaOrgData = require('../parse/schema-org');
const validateAllXHR = require('./XHRValidation');
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
        this.vod.keywordMap = this.getKeywordMap(inputSearchFor);
        // copy input data to validator output object
        this.vod.url = this.url;
        this.vod.searchFor = this.searchFor;
        this.vod.tests = this.tests;
        this.vod.initialResponseRetrieved = false;

        //create local variables for validaiton purposes
        //cheerio object
        this.$ = null;
        this.initialResponseBody = null;

        this.vod.topLevelError = null;
        this.cheerioCrawlerError = null;


        this.initializeConclusionData();

        console.log('Validator instance created.');

        inputSearchFor.forEach(keyword => {
            console.log(this.getKeyByValue(this.vod.keywordMap, keyword));
        })

    }

    // TODO: Move to utils.
    getKeywordMap(keywordsArray){
        let keywordMap = {};
        for (let index = 0; index < keywordsArray.length; index++) {
            const keyword = keywordsArray[index];
            
            const keywordName = `keyword${index}`;
            keywordMap[keywordName] = keyword;
        }
        return keywordMap;
    }

    getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    };


    // ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML', 'VALIDATE'];
    async validate() {
        try {

            await this.loadInitialHtml();
            this.vod.initialResponseRetrieved = this.$ == null ? false : true;

            // we sucessfully retrieved initial response using cheerio crawler, data validation can be performer
            if (this.vod.initialResponseRetrieved) {
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
                    const initialSchema = parseSchemaOrgData({ $: this.$ })
                    this.validateSchema(initialSchema);
                }

                // if (this.tests.includes('WINDOW')) {

                // } else {

                // }


            } else {
                // cheeriocrawler failed, we sitll need to generate conclusion, so we will copy data found by analyzer to output html file
                    this.populateConclusionFromAnalysis();
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


            const htmlFoundValidated = {
                ...htmlFound,
                valueFound: valueFound ? valueFound : null
            };

            //push data into validation conclusion
            this.vod.validationConclusion[htmlFound.originalSearchString].html.push(htmlFoundValidated);
            if (htmlFoundValidated.valueFound == htmlFound.value) {
                this.vod.validationConclusion[htmlFound.originalSearchString].foundInInitial = true;
            }
            // if (htmlFound.foundinLists) {
            //     this.vod.validationConclusion[htmlFound.originalSearchString].html.lists.push(htmlFoundValidated.foundInLists);
            // }

            return htmlFoundValidated;

        });
        this.vod.htmlValidated = htmlDataValidated;
    }

    validateJsonLDData(initialDataArray) {
        const jsonDataValidated = this.analyzerOutput.jsonLDDataFound.map((jsonFound) => {

            const initialDataObject = { data: initialDataArray }
            const searchResultArray = JSONPath({ path: 'data' + jsonFound.path, json: initialDataObject });

            const jsonFoundValidated = {
                ...jsonFound,
                valueFound: searchResultArray.length ? searchResultArray[0] : null
            }

            //push data into validation conclusion
            this.vod.validationConclusion[jsonFound.originalSearchString].json.push(jsonFoundValidated);
            if (jsonFoundValidated.valueFound == jsonFound.value) {
                this.vod.validationConclusion[jsonFound.originalSearchString].foundInInitial = true;
            }
            // if (htmlFound.foundinLists) {
            //     this.vod.validationConclusion[jsonFound.originalSearchString].json.lists.push(jsonFoundValidated.foundInLists);
            // }

            return jsonFoundValidated;

        });
        this.vod.jsonValidated = jsonDataValidated;
    }

    validateMetaData(initialMetaData) {
        const metaDataValidated = this.analyzerOutput.metaDataFound.map(metaFound => {
            const valueFound = initialMetaData[metaFound.path.substring(1)];


            const metaFoundValidated = {
                ...metaFound,
                valueFound: valueFound ? valueFound : null
            }

            //push data into validation conclusion
            this.vod.validationConclusion[metaFound.originalSearchString].meta.push(metaFoundValidated);
            if (metaFoundValidated.valueFound == metaFound.value) {
                this.vod.validationConclusion[metaFound.originalSearchString].foundInInitial = true;
            }
            // if (metaFound.foundinLists) {
            //     this.vod.validationConclusion[metaFound.originalSearchString].meta.lists.push(metaFoundValidated.foundInLists);
            // }

            return metaFoundValidated;
        })
        this.vod.metaDataValidated = metaDataValidated;
    }

    validateSchema(initialSchema) {
        const initialDataObject = { data: initialSchema }
        const schemaValidated = this.analyzerOutput.schemaOrgDataFound.map(schemaFound => {

            const searchResultArray = JSONPath({ path: 'data' + schemaFound.path, json: initialDataObject });


            const schemaFoundValidated = {
                ...schemaFound,
                valueFound: searchResultArray.length ? searchResultArray[0] : null
            }

            //push data into validation conclusion
            this.vod.validationConclusion[schemaFound.originalSearchString].schema.push(schemaFoundValidated);
            if (schemaFoundValidated.valueFound == schemaFound.value) {
                this.vod.validationConclusion[schemaFound.originalSearchString].foundInInitial = true;
            }
            // if (valueFoundValidated.foundinLists) {
            //     this.vod.validationConclusion[schemaFound.originalSearchString].schema.lists.push(valueFoundValidated.foundInLists);
            // }

            return schemaFoundValidated;

        });
        this.vod.schemaValidated = schemaValidated;
    }

    initializeConclusionData() {
        this.vod.validationConclusion = {};

        this.vod.searchFor.forEach(searchedString =>{
            this.vod.validationConclusion[searchedString] = {
                html: [],
                json: [],
                meta: [],
                xhr: [],
                schema: [],
                window: [],
                foundInInitial: false
            }
        });
    }

    populateConclusionFromAnalysis() {

        // const testKeyOutput = [
        //     { key: 'SCHEMA.ORG', output: 'schemaOrgDataFound' },
        //     { key: 'JSON-LD', output: 'jsonLDDataFound' },
        //     { key: 'WINDOW', output: 'windowPropertiesFound'},
        //     { key: 'XHR', output: 'xhrRequestsFound' },
        //     { key: 'META', output: 'metaDataFound'},
        //     { key: 'HTML', output: 'htmlFound'}
        // ];

        this.analyzerOutput.htmlFound.map(searchResult => {
            this.vod.validationConclusion[searchResult.originalSearchString].html.push(searchResult);
        });
        this.analyzerOutput.jsonLDDataFound.map(searchResult => {
            this.vod.validationConclusion[searchResult.originalSearchString].json.push(searchResult);
        });
        this.analyzerOutput.windowPropertiesFound.map(searchResult => {
            this.vod.validationConclusion[searchResult.originalSearchString].window.push(searchResult);
        });
        this.analyzerOutput.metaDataFound.map(searchResult => {
            this.vod.validationConclusion[searchResult.originalSearchString].meta.push(searchResult);
        });


    }
}
module.exports = { ValidatorReloaded }
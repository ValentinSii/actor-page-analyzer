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


class ValidatorReloaded {

    
    constructor (inputUrl, inputSearchFor, inputTests, analyzerOutput, allCookies) {

        // data from user input
        this.url = inputUrl;
        this.searchFor = inputSearchFor;
        this.tests = inputTests;
        this.analyzerOutput = analyzerOutput;

        //cookies from page.cookies()
        this.allCookies = allCookies;


        // create object for validator output
        this.vod = {};

        // copy input data to validator output object
        this.vod.url = this.url;
        this.vod.searchFor = this.searchFor;
        this.vod.tests = this.tests;

        //create local variables for validaiton purposes
        //cheerio object
        this.$ = null;
        this.initialJsonld = null;
        this.initialMetadata = null;
        this.initialSchema = null;
        this.initialWindowProperties = null;

        //initialize array used to store errors during validation
        this.errors = [];
        this.topLevelError = null;
        this.cheerioCrawlerError = null;

        console.log('Validator instance created.');

    }

    async validate() {
        try {

            await this.loadInitialHtml();

            // we sucessfully obtained HTTP response with cheerio crawler
            if (this.cheerioCrawlerError == null) {

                // ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML', 'VALIDATE'];
                if (this.tests.includes('HTML')) {
                
                } else {
    
                }

                if (this.tests.includes('JSON-LD')) {
                
                } else {
    
                }

                if (this.tests.includes('META')) {
                
                } else {
    
                }

                if (this.tests.includes('WINDOW')) {
                
                } else {
    
                }

                if (this.tests.includes('SCHEMA.ORG')) {
                
                } else {
    
                }
                
            } else {
                // cheeriocrawler failed, validation can not be performed, we will just copy data from analysis
            }

            // we can still validate XHR regardless of the cheeriocrawler response
            if (this.tests.includes('XHR')) {

                
            } else {

            }





        } catch (topErr) {
            console.log('Top level error during validation.');
            console.log(topErr);
            console.trace();
            this.topLevelError = topErr;
        }
    }

    //function populates cheerio object $ with html using cheeriocrawler
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

}
module.exports = { ValidatorReloaded }
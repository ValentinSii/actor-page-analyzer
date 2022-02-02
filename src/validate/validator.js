const fs = require('fs');
const Apify = require('apify');
const { log } = Apify.utils;



class Validator {

    constructor (inputPage, inputTests, analyzerOutput = null) {
        this.inputPageUrl = inputPage.url;
        this.inputTests = inputTests;

        this.analyzerOutputData = null;
        this.validatorOutputData = [];
        this.$ = null;

        // populate anlyzerOutputData
        // data from page analysis, reading from OUTPUT file
        this.readOutput();


        log.info('Information message', { someData: 123 }); // prints message

    }

    async validate() {
        this.initialjsonld = {};
        this.$ = null;

        // load initial html with cheerioCrawler, populate variablle $
        await this.loadInitialHtml();

        

        this.validateHtml();

        // this.validateJsonLD();
        // this.validateSchemaOrg();
        // this.validate
        await this.dumpValidatorData();
    }

    validateJsonLD() {
        this.analyzerOutputData[0].jsonLDDataFound.map( (jsonLDDataFound) => {

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

        
        this.validatorOutputData.push({
            htmlDataValidated : htmlDataValidated
        });
        console.log('==========================================================================');

        if (allDataFound) {
            console.log('\x1b[32m%s\x1b[0m', `All expected html data was found in initial reposnse`);

        } else {
            console.log('\x1b[31m%s\x1b[0m', `Not all expected html data was found in initial reposnse`);
            allDataFound = false;

        }

        console.log('==========================================================================');
        console.log('==========================================================================');
    }


    async dumpValidatorData() {
        const data = JSON.stringify(this.validatorOutputData, null, 2);
        try {
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
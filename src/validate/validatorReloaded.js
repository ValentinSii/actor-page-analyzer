const Apify = require('apify');
const { log } = Apify.utils;
const { JSONPath } = require('jsonpath-plus');
const parseJsonLD = require('../parse/json-ld');
const parseMetadata = require('../parse/metadata');
const parseSchemaOrgData = require('../parse/schema-org');
const validateAllXHR = require('./XHRValidation');
cheerio = require('cheerio');
const { getKeyByValue, getKeywordMap } = require('../utils');
const ast = require('abstract-syntax-tree');
const TreeSearcher = require('../search/TreeSearcher');
var util = require('util');
const { timeStamp } = require('console');


class ValidatorReloaded {


    constructor(inputUrl, inputSearchFor, inputTests, analyzerOutput, allCookies) {

        // data from user input
        this.url = inputUrl;
        this.proxyUrl = '';
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
        // this object contains object for each keyword with entries for every data source separately
        this.vod.validationConclusion = {};
        this.vod.keywordMap = getKeywordMap(inputSearchFor);
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


    }

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

                if (this.tests.includes('WINDOW')) {
                    this.validateWindowProperties();

                }


            } else {
                // cheeriocrawler failed, we sitll need to generate conclusion, so we will copy data found by analyzer to output html file
                this.populateConclusionFromAnalysis();
            }

            // we can still validate XHR regardless of the cheeriocrawler response
            if (this.tests.includes('XHR')) {                
                const validatedXhr = await validateAllXHR(this.analyzerOutput, this.searchFor, this.allCookies, this.proxyUrl);

                
                for (let i = 0; i < this.analyzerOutput.xhrRequestsFound.length; i++) {
                    const xhr = this.analyzerOutput.xhrRequestsFound[i];
                    let keywordsFound = [];
                    // get list of keywords that have sucessfully been found in this xhr
                    for (const searchResult of xhr.searchResults) {

                        if(!keywordsFound.includes(searchResult.originalSearchString))
                        {
                            keywordsFound.push(searchResult.originalSearchString);
                        }                    

                    }


                    for (const keyword of keywordsFound) {
                        const xhrConclusionEntry = {
                            index: i,
                            url: xhr.url,
                            method: xhr.method,
                            success: validatedXhr[i].validationSuccess
                        }
                        const searchForKey = getKeyByValue(this.vod.keywordMap, keyword);
                        this.vod.validationConclusion[searchForKey].xhr.push(xhrConclusionEntry); 
                    }

                    validatedXhr[i].originalRequest["keywordsFound"] = keywordsFound;
                }
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

        let cheerioCrawlerOptions = {
            requestList,
            maxRequestRetries: 14,
            // Increase the timeout for processing of each page.
            handlePageTimeoutSecs: 30,

            //this will retry 
            handlePageFunction: async ({ request, response, body, contentType, $ }) => {

                this.$ = $;
                this.initialResponseBody = body;
                console.log("CheerioCrawler response status: " + response.statusCode);

            },
            handleFailedRequestFunction: async ({ request }) => {
                log.debug(`Request ${request.url} failed 15 times.`);
                this.cheerioCrawlerError = request.errorMessages;
            },

        }
        let proxyConfiguration = null;
        if (process.env.APIFY_PROXY_PASSWORD) {
            proxyConfiguration = await Apify.createProxyConfiguration(
            );
            console.log("Proxy configuration" + util.inspect(proxyConfiguration, { depth: null }));
            cheerioCrawlerOptions.proxyConfiguration = proxyConfiguration;
            this.proxyUrl = proxyConfiguration.newUrl();
        }


        const crawler = new Apify.CheerioCrawler(cheerioCrawlerOptions);

        await crawler.run();
        // console.log('Initial html loaded sucessfully.');

    }

    validateHtml() {

        const htmlDataValidated = this.analyzerOutput.htmlFound.map((htmlFound) => {

            // console.log(htmlFound);
            const valueFound = (this.$(htmlFound.path)).text();


            const htmlFoundValidated = {
                ...htmlFound,
                valueFound: valueFound ? valueFound : null
            };

            const searchForKey = getKeyByValue(this.vod.keywordMap, htmlFound.originalSearchString);

            //push data into validation conclusion
            this.vod.validationConclusion[searchForKey].html.push(htmlFoundValidated);
            if (htmlFoundValidated.valueFound == htmlFound.value) {
                this.vod.validationConclusion[searchForKey].foundInInitial = true;
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

            const searchForKey = getKeyByValue(this.vod.keywordMap, jsonFound.originalSearchString);
            //push data into validation conclusion
            this.vod.validationConclusion[searchForKey].json.push(jsonFoundValidated);
            if (jsonFoundValidated.valueFound == jsonFound.value) {
                this.vod.validationConclusion[searchForKey].foundInInitial = true;
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
            const searchForKey = getKeyByValue(this.vod.keywordMap, metaFound.originalSearchString);
            //push data into validation conclusion
            this.vod.validationConclusion[searchForKey].meta.push(metaFoundValidated);
            if (metaFoundValidated.valueFound == metaFound.value) {
                this.vod.validationConclusion[searchForKey].foundInInitial = true;
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

            const searchForKey = getKeyByValue(this.vod.keywordMap, schemaFound.originalSearchString);
            //push data into validation conclusion
            this.vod.validationConclusion[searchForKey].schema.push(schemaFoundValidated);
            if (schemaFoundValidated.valueFound == schemaFound.value) {
                this.vod.validationConclusion[searchForKey].foundInInitial = true;
            }
            // if (valueFoundValidated.foundinLists) {
            //     this.vod.validationConclusion[schemaFound.originalSearchString].schema.lists.push(valueFoundValidated.foundInLists);
            // }

            return schemaFoundValidated;

        });
        this.vod.schemaValidated = schemaValidated;
    }

    initializeConclusionData() {
        

        this.vod.searchFor.forEach(searchedString => {
            const searchForKey = getKeyByValue(this.vod.keywordMap, searchedString);
            this.vod.validationConclusion[searchForKey] = {
                keywordValue : searchedString,
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

    findObjectInScriptByPropertyKey = (scriptText, propertyKeyToFind) => {
        const parsed = ast.parse(scriptText);
        const objects = ast.find(parsed, 'ObjectExpression');
        const foundObjects = objects.filter((object) => object.properties.some((property) => {
            return property.key.value == propertyKeyToFind;
        }));

        let foundOBjectsParsed = [];
        if (foundObjects) {
            for (const object of foundObjects) {
                try {
                    const myJson = ast.generate(object);
                    foundOBjectsParsed.push(JSON.parse(myJson));
                } catch (err) {
                    console.log(err);

                }
            }
        } 
        return foundOBjectsParsed;
    };


    findObjectInHtml = ($, variableToFind, propertyToFind, ignoredScripts) => {
        const scripts = $(`script:contains(${variableToFind})`);
        if (scripts.length == 0) {
            console.log(`Did not find any script with substring(win dow property name): ${variableToFind}`);
            return [];

        }

        const scriptsArray = scripts.toArray();
        let scriptText = '';

        for (const script of scriptsArray) {
            const scriptId = $(script).attr('id');
            // filter scripts that have id and have previously been found and processed
            if (ignoredScripts.indexOf(scriptId) == -1) {

                const scriptHtml = $(script).html();

                // sometimes text of script is just json so we encapsulate it to prevent AST.parse from failing
                // replaces all the whitespace
                if (scriptHtml.replace(/\s/g, "").indexOf('{') == 0) {
                    if (scriptId) {
                        scriptText = scriptText.concat(`${scriptId} = { ${scriptHtml} };`);
                    } else {
                        scriptText = scriptText.concat(`dummy = { ${scriptHtml} };`);
                    }
                } else {
                    scriptText = scriptText.concat(scriptHtml);
                }

            }
        }

        let result = [];
        try {
            result = this.findObjectInScriptByPropertyKey(scriptText, propertyToFind);
        } catch (e) {
            //throw `Could not parse property: ${propertyToFind} from the script. Probably wrong HTML`;
            console.log(e);            
        }
        return result;
    };

    findJsonScripts($, scriptNames) {
        const result = [];
        $(`script[type="application/json"]`).each(function () {
            try {
                const jsonId = $(this).attr('id');
                // chceck if we are looking for this string
                if (scriptNames.indexOf(jsonId) !== -1) {
                    const jsonScript = JSON.parse($(this).html());
                    result.push({ jsonId, jsonScript });
                }

            } catch (err) {
                console.error(err);
            }
        });
        return result;
    }


    validateWindowProperties() {

        if (this.analyzerOutput.windowPropertiesFound) {

            let windowObjectSelectors = [];
            const windowObject = {};

            //get list of selectors
            for (const searchResult of this.analyzerOutput.windowPropertiesFound) {
                let windowPropertyDescription = {
                    // name of the object found in window properties, can be variable name or id of script tag 
                    name: null,
                    // selector is used to search AST to find object that conctains key with this selector
                    property: null,
                    fullPath: null
                };
                windowPropertyDescription.fullPath = searchResult.path;

                // remove leading dot and get path 
                const pathSplit = searchResult.path.substring(1).split('.');
                // if window property is not an array
                if (pathSplit.length >= 2 && pathSplit[0].indexOf('[') == -1) {
                    // first value is name of window variable
                    // the second string is property by which the object will be searched for in AST

                    // if we did not find this object yet, add it to objectSelectors array
                    if (!windowObjectSelectors.some(obj => { return obj.name == pathSplit[0] })) {

                        windowPropertyDescription.name = pathSplit[0];
                        console.log("Searchign for window variable : " +windowPropertyDescription.name);

                        // if property is array, extract name only
                        const bracketIndexProperty = pathSplit[1].indexOf('[');
                        if (bracketIndexProperty == -1) {
                            windowPropertyDescription.property = pathSplit[1];
                        } else {
                            windowPropertyDescription.property = pathSplit[1].substring(0, bracketIndexProperty);
                        }
                        windowObjectSelectors.push(windowPropertyDescription);
                    } else {
                        // we already found a property by which we will search for object
                        // TODO: allow for multiple property selectors
                        continue;
                    }

                }
                // TODO: Solve this for array and literals
                // //get list of literals or arrays
                // else if (propertyPathSplit.length == 1) {
                // }
            }

            console.log("Object selectors: " + util.inspect(windowObjectSelectors, { depth: null }));
            // some window properties are sent as json in script with id representing their name
            const scriptIds = windowObjectSelectors.map(wp => { return wp.name });
            // find all scripts of type application/json with given IDs and parse them to object 
            const jsonScriptsFound = this.findJsonScripts(this.$, scriptIds);
            // list of scripts already found
            const ignoreScripts = [];

            for (const scriptObject of jsonScriptsFound) {
                windowObject[scriptObject.jsonId] = scriptObject.jsonScript;
                windowObjectSelectors = windowObjectSelectors.filter(selector => {

                    if (selector.name == scriptObject.jsonId) {
                        ignoreScripts.push(scriptObject.jsonId);
                        return false;
                    }
                    return true;
                });
            }
            console.log("Object selectors left: " + util.inspect(windowObjectSelectors, { depth: null }));

            // if we didnt find window properties sent as script, we will look for them as object with property 
            for (const windowProperty of windowObjectSelectors) {
                const scriptJsonFound = this.findObjectInHtml(this.$, windowProperty.name, windowProperty.property, ignoreScripts);

                if (scriptJsonFound.length == 1) {
                    windowObject[windowProperty.name] = scriptJsonFound[0];
                    
                } //multiple objects with same property found
                else if( scriptJsonFound.length > 1) {
                    windowObject[windowProperty.name] = scriptJsonFound[0];
                }
            }

            // validate search results from browser with constructed window object
            const windowValidated = this.analyzerOutput.windowPropertiesFound.map((windowFound) => {

                const searchResultArray = JSONPath({ path: windowFound.path.substring(1), json: windowObject });

                const windowFoundValidated  = {
                    ...windowFound,
                    valueFound: searchResultArray.length ? searchResultArray[0] : null
                }

                const searchForKey = getKeyByValue(this.vod.keywordMap, windowFound.originalSearchString);
                //push data into validation conclusion
                this.vod.validationConclusion[searchForKey].window.push(windowFoundValidated);
                if (windowFoundValidated.valueFound == windowFound.value) {
                    this.vod.validationConclusion[searchForKey].foundInInitial = true;
                }

                return windowFoundValidated;

            });
            this.vod.windowValidated = windowValidated;
        }

    }
    // functions takes multiple potential objects that may represent window property  
    validatePotentialWindowPropertyObject

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
            const searchForKey = getKeyByValue(this.vod.keywordMap, searchResult.originalSearchString);
            this.vod.validationConclusion[searchForKey].html.push(searchResult);
        });
        this.analyzerOutput.jsonLDDataFound.map(searchResult => {
            const searchForKey = getKeyByValue(this.vod.keywordMap, searchResult.originalSearchString);
            this.vod.validationConclusion[searchForKey].json.push(searchResult);
        });
        this.analyzerOutput.windowPropertiesFound.map(searchResult => {
            const searchForKey = getKeyByValue(this.vod.keywordMap, searchResult.originalSearchString);
            this.vod.validationConclusion[searchForKey].window.push(searchResult);
        });
        this.analyzerOutput.metaDataFound.map(searchResult => {
            const searchForKey = getKeyByValue(this.vod.keywordMap, searchResult.originalSearchString);
            this.vod.validationConclusion[searchForKey].meta.push(searchResult);
        });
        this.analyzerOutput.schemaOrgDataFound.map(searchResult => {
            const searchForKey = getKeyByValue(this.vod.keywordMap, searchResult.originalSearchString);
            this.vod.validationConclusion[searchForKey].schema.push(searchResult);
        });


    }
}
module.exports = { ValidatorReloaded }
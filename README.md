# Page analyzer 3

This actor is fork from the original [Page Analyzer](https://github.com/apify/actor-page-analyzer). It is capable of everything the original analyzer was, and provides some additional features described below.

## Analysis vs Validation
In this document, we will refer to __Analysis__ as a process of searching the keywords from the INPUT in the data of the website loaded by Chromium controlled by Puppeteer. 
__Validation__ will be refered to as a process of checking, whether data from __analysis__ can be used for scraping given website. 

## Input
```javascript
{
    // url of a  website to be analyzed
    "url": "http://example.com",
    // array of strings too look for on the website, we will refer to those string as "keywords"
    "searchFor": [
        "About us",
        // numbers are also passed as strings
        "125"
        ],
    // array of strings specifying wich possible data sources should be searched, list in this example contains all of the possible tests
    "tests" : [
        // analyze data in content of html tags e.g. <h3 class="willBeFound> About us: </h3>
        "HTML",
        // analyze data in <meta> tags e.g.    <meta name="description" content="Example meta">
        "META"
        "SCHEMA.ORG",
        "JSON-LD",
        // analyze variables assigned to window object
        "WINDOW",
        // analyze requests called in puppeteer session
        "XHR"
    ]
}
```

## Output

Output of this actor is saved in Apify key-value store, it consists of these files: 
1. __OUTPUT.json__: Structure of the file is the same as the one generated by original page analyzer with the addition of field __vod__ wich stands for "validator output data"
```javascript
{
    ...
    "vod": {
        "validationConclusion": {
          "keyword0": {
              // original keyword string from INPUT
            "keywordValue": "example keyword",
            // html search results for this specific keyword only
            "html": [
              {
                "path": ".exampleSelector",
                "value": "Sentence containing example keyword",
                "originalSearchString": "example keyword",
                "foundInLists": [
                  {
                    ...                    
                  }
                ],
                // text of element found by path in initial response retrieved by cheeriocrawler
                "valueFound": null
              }
            ],
            // basically same as html for the rest of data sources
            "json": [],
            "meta": [],            
            "schema": [],
            "window": [],
            // xhr request in which this keyword was found
            "xhr": [
                 {
                     // index of this request in XHR validation file
                    "index": 0,
                    "url": "https://example.org...",
                    "method": "POST",
                    // this value is true if XHR request was called by gotScraping, returned with the same response status
                    // and found this keyword in response body 
                    "success": true
                }
            ],
            // true if keyword was found in initial response from cheerio crawler
            "foundInInitial": true,
            // true if keyword was found in XHR request that was sucessfully replicated by got
            "retrievedByXHR": false
          },
                 
        // true if initial response was retrieved and parsed sucessfully
        "initialResponseRetrieved": true,
        // if an error has occured during validation, it's message will be assigned to this variable
        "topLevelError": null
      }
}
```

2. __Validation.html__. 
Dashboard with visual presentation of the data found. There are multiple tabs in the top bar:
- __CONCLUSION__: Displays information about analysis: url, keywords, tests, cheerio crawler response parsing status...
- __Tabs for each keyword__: Here, analysis data is presented for each test performed.
 If table row is green, data in column __Initial value__was found in initial response. If cheerio crawler failed to retrieve initial response whole table will be red. 
- __XHR Found__: Information about xhr requests validation.
- __OUTPUT.json__: Clicking on this tab will open OUTPUT.json file with full analysis data. 
3. __InitialBrowser.html__. This file contains initial response from browser session.
4. __InitialCheerio.html__. This file contains initial response retrieved by cheerioCrawler.
5. __XHRValidation.json__. This file is only present if some keyword was found in XHR requests. It contains all necessary information about every request needed to replicate it and results from calls by gotScraping (url, method, headers, payload(request body), response status, response body) including information about the original request called by Chromium

## Validation process
1. Initial response is loaded and parsed into $.


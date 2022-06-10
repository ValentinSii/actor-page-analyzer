const { gotScraping } = require('got-scraping');
const DOMSearcher = require('../search/DOMSearcher');
const TreeSearcher = require('../search/TreeSearcher');
const _ = require('lodash');

async function validateAllXHR(analyzerOutput, searchFor, allCookies) {

    let validatedXhr = [];
    if (analyzerOutput.xhrRequestsFound.length > 0) {


        for (const xhrFound of analyzerOutput.xhrRequestsFound) {

            let retryObject = {
                originalRequest: {...xhrFound},
                callsMinimalHeaders: null,
                callsWithoutCookie: null,
                callsWithCookie: null
            }

            try {


                //first try to call request with minimum necessary headers
                const minimalHeaders = {};
                minimalHeaders["referer"] = xhrFound.request.headers["referer"];
                
                // minimalHeaders["user-agent"] = xhrFound.request.headers["user-agent"];
                
                let requestObject = {
                    url: xhrFound.request.url,
                    method: xhrFound.request.method
                };
                //copy request body and content type
                if (xhrFound.request.postData != null) {
                    requestObject.body = xhrFound.request.postData;
                    minimalHeaders["content-type"] = xhrFound.request.headers["content-type"];
                }                 
            
                retryObject.callsMinimalHeaders = await callGotRequest({...requestObject, headers: minimalHeaders }, searchFor);



                //use all headers from puppeteer session, these dont contain cookies
                const puppeteerHeaders = xhrFound.request.headers;
                retryObject.callsWithoutCookie = await callGotRequest({...requestObject, headers: puppeteerHeaders}, searchFor);

                //use all headers from puppeteer session, also add all cookies retrieved from puppeteer calling page.cookies();
                const cookieString = allCookies.map((cookie) => {
                    return `${cookie.name}=${cookie.value}`;
                }).join("; ");

                retryObject.callsWithCookie = await callGotRequest({...requestObject, headers:{...puppeteerHeaders, cookie: cookieString}}, searchFor);

                console.log(retryObject);
                
            }
            catch (err) {
                console.log(err.message);
                console.log(`Failed validation of XHR request: ${xhrFound.request.url}`);
                return null;
            }
            validatedXhr.push(retryObject);
        }
        
    }

    return validatedXhr;
}
async function callGotRequest(requestObject, searchFor) {
    const retryCount = 3;

    const requestCalls = [];
    for (let i = 0; i < retryCount; i++) {

        const response = await gotScraping(requestObject);
        const validationResult = validateGotResponse(requestObject, response, searchFor);
        requestCalls.push(validationResult);

        //response success
        //TODO: maybe compare with original responseStatus?
        // if (validationResult.responseStatus >= 200 && validationResult.responseStatus < 300) {
        //     break;
        // }

    }

    return requestCalls;

}
function validateGotResponse(requestObject, gotResponse, searchFor) {

    let requestValidationEntry = {
        request: requestObject,
        response: {
            status: gotResponse.statusCode,
            body: gotResponse.body,
            headers: gotResponse.headers,
            searchResults: null,
            sucess: false

        }
    }

    //TODO: how to deal with other content-types?  
    let searchResults = null      
    if (gotResponse.headers['content-type'].indexOf('json') != -1) {
        const responseBodyJson = JSON.parse(gotResponse.body);
        const treeSearcher = new TreeSearcher();
        searchResults = treeSearcher.find(responseBodyJson, searchFor);


    } else if (gotResponse.headers['content-type'].indexOf('html') != -1) {
        const domSearcher = new DOMSearcher({html: gotResponse.body});
        searchResults = domSearcher.find(searchFor);
    } 

    requestValidationEntry.searchResults = searchResults;


    return requestValidationEntry;
}

module.exports = validateAllXHR;
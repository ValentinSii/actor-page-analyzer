const Apify = require('apify');
const { last } = require('lodash');
const { getKeyByValue } = require('../utils');

// Apify.main(async () => {
//   //generate validation html output 
//   const file = 'apify_storage/key_value_stores/default/OUTPUT.json';
//   const fileContents = fs.readFileSync(file, 'utf8');
//   const htmlGeneratorInstance = new htmlGenerator(fileContents.fields);
//   htmlGeneratorInstance.generateHtmlFile('dev');
// });
const SUCCESS_COLOR = "#D0F0C0";
const FAILURE_COLOR = "#F78DA7";
class htmlGenerator {

    constructor(analyzerOutput) {
        this.analyzerOutput = analyzerOutput;
        //vod stands for validator output data
        this.vod = analyzerOutput.vod;
        //array used to store lines of html code
        this.htmlOutput = [];
    }

    async generateHtmlFile(fileName) {
        this.generateHeaderAndCss();
        this.htmlOutput.push(`<body>`);
        //generate top bar tab for each searched keyword from input file
        this.generateTabs();
        //tab for CONCLUSION
        this.generateConclusionTab();
        this.vod.searchFor.forEach(keyword => {
            this.generateKeyWordTab(keyword);
        })
        this.xhrTab();
        this.appendScript();

        this.cleanOutput();
        await this.saveValidatorOutput(fileName);



    }
    async saveValidatorOutput(fileName) {
        try {
            await Apify.setValue(fileName, this.htmlOutput.join(""), { contentType: 'text/html' });
        } catch (err) {
            console.log(err);
        }
    }

    generateTabs() {
        // start of top bar
        this.htmlOutput.push(`<div class="tab">`);
        this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, 'CONCLUSION')">CONCLUSION</button>`
        );
        // generate tabs per keyword
        this.vod.searchFor.forEach(keyword => {
            const searchForKey = getKeyByValue(this.vod.keywordMap, keyword)

            let keyWordTabString = keyword;
            if (keyword.length >= 15) {
                keyWordTabString = keyword.substring(0, 14) + "..";
            }

            this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, '${searchForKey}')">${keyWordTabString}</button>`)
        });

        // Generate tab for XHR found requests
        this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, 'XHR')">XHR Found</button>`);
        // open OUTPUT.json in new tab
        this.htmlOutput.push(`<button class="tablinks" onclick=" window.open('./OUTPUT','_blank')">OUTPUT.JSON</button>`);
        //end of top bar 
        this.htmlOutput.push(`</div>`);
    }

    xhrTab() {

        this.htmlOutput.push(`<div id="XHR" class="tabcontent" >`);

        if (!this.vod.tests.includes('XHR')) {
            this.htmlOutput.push(`<h3><b>XHR</b> analysis was not performed.</h3>`);
        } else if (!this.vod.validatedXhr.length) {
            this.htmlOutput.push(`<h3>There were no XHR requests found containing given keywords.</h3>`);
        } else {
            this.htmlOutput.push(`<h3>Click <a href="./XHRValidation" target="_blank">HERE</a> to open file with full details of XHR validation.</h3>`);
            // <a href="#"></a>
            // this.htmlOutput.push(`<button onclick=" window.open('./OUTPUT.json','_blank')">OUTPUT.JSON</button>`);

            this.htmlOutput.push('<table class="pure-table pure-table-bordered">');
            this.htmlOutput.push('<tbody>');


            for (let i = 0; i < this.vod.validatedXhr.length; i++) {


                const xhr = this.vod.validatedXhr[i];

                const validationResultColor = xhr.validationSuccess ? SUCCESS_COLOR : FAILURE_COLOR;

                this.htmlOutput.push(`<tr style="background-color: ${validationResultColor};">`);
                this.htmlOutput.push(`<td colspan=100%>`);
                this.htmlOutput.push(`<h4><b> ${i}: </b> ${xhr.originalRequest.url}</h4>`);
                this.htmlOutput.push('</td>');
                this.htmlOutput.push('</tr>');

                this.htmlOutput.push('<tr>');
                this.htmlOutput.push('<td>');
                this.htmlOutput.push(`<div class ="collapsible">Clicke to reveal more info about request</div>`);

                this.htmlOutput.push('<div style="white-space: pre-wrap; display: none">');
                this.htmlOutput.push(`<p><b>Validation result:</b> ${xhr.validationSuccess ? "SUCCESS" : "FAIL"}</p>`);


                this.htmlOutput.push(`<p><b>Method:</b> ${xhr.originalRequest.method}</p>`);
                this.htmlOutput.push(`<p><b>Response status:</b> ${xhr.originalRequest.request.responseStatus}</p>`);
                this.htmlOutput.push(`<p><b>Keywords found:</b>${xhr.originalRequest.keywordsFound} </p>`);

                this.htmlOutput.push(`<p><b>Puppeteer request headers: </b> </p>`);
                this.htmlOutput.push(`<pre>`);
                this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest.request.headers, null, 4)}`);
                this.htmlOutput.push(`</pre>`);


                this.htmlOutput.push(`<p><b>Puppeteer response headers: </b> </p>`);
                this.htmlOutput.push(`<pre>`);
                this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest.request.responseHeaders, null, 4)}`);
                this.htmlOutput.push(`</pre>`);

                this.generateXHRRetriesTable(xhr);

                this.htmlOutput.push('</div>');
                this.htmlOutput.push('</td>');
                this.htmlOutput.push('</tr>');

            }
            this.htmlOutput.push('</tbody>');

            this.htmlOutput.push('</table>');


        }

        this.htmlOutput.push(`</div>`);
    }
    generateXHRRetriesTable(validatedXHR) {
        this.htmlOutput.push('<table class="pure-table pure-table-bordered">');
        this.htmlOutput.push('<tbody>');

        this.XHRRetryTableRow(
            validatedXHR.callsMinimalHeaders[validatedXHR.callsMinimalHeaders.length - 1],
            "Call with minimal headers"
        );


        if (validatedXHR.callsPuppeteerHeaders) {
            this.XHRRetryTableRow(
                validatedXHR.callsPuppeteerHeaders[validatedXHR.callsPuppeteerHeaders.length - 1],
                "Call with headers obtained from puppeteer"
            );
        }
        if (validatedXHR.callsPuppeteerHeadersCookie) {
            validatedXHR.callsPuppeteerHeadersCookie[validatedXHR.callsPuppeteerHeadersCookie.length - 1],
                "Call with headers obtained from puppeteer"
        }

        this.htmlOutput.push('</tbody>');
        this.htmlOutput.push('</table>');
    }

    XHRRetryTableRow(lastRetry, callType) {
        const validationResultColor = lastRetry.validationSuccess ? SUCCESS_COLOR : FAILURE_COLOR;

        this.htmlOutput.push(`<tr style="background-color: ${validationResultColor}">`);
        this.htmlOutput.push(`<td>`);
        this.htmlOutput.push(`<p><b>${callType}:</b> ${lastRetry.validationSuccess ? "SUCCESS" : "FAIL"}</p>`);
        this.htmlOutput.push(`</td>`);
        this.htmlOutput.push(`</tr>`);

        this.htmlOutput.push('<tr>');
        this.htmlOutput.push('<td>');
        this.htmlOutput.push(`<div class ="collapsible">Clicke to reveal more info about request</div>`);
        this.htmlOutput.push(`<div style="display: none">`);

        this.htmlOutput.push(`<p><b>Response status: </b> ${lastRetry.error ? "Response was not sucessfully retrieved." : lastRetry.response.status} </p>`);

        this.htmlOutput.push(`<p><b>Error: </b> ${lastRetry.error ?? "No errors"} </p>`);

        this.htmlOutput.push(`<p><b>Headers:</b></p>`);
        this.htmlOutput.push(`<pre>`);
        this.htmlOutput.push(`${JSON.stringify(lastRetry.request.headers, null, 4)}`);
        this.htmlOutput.push(`</pre>`);

        this.htmlOutput.push(`<p><b>GotScraping headers:</b></p>`);
        this.htmlOutput.push(`<pre>`);
        this.htmlOutput.push(`${JSON.stringify(lastRetry.gotHeaders, null, 4)}`);
        this.htmlOutput.push(`</pre>`);

        this.htmlOutput.push(`</div>`);
        this.htmlOutput.push('</td>');
        this.htmlOutput.push('</tr>');

    }

    generateConclusionTab() {
        this.htmlOutput.push(`<div id="CONCLUSION" class="tabcontent active" style="display: block;" >`);
        this.htmlOutput.push(`
            <div>
            <h4><b>URL: </b><a href="${this.vod.url}" target="_blank">${this.vod.url}</a></h4>
            <h4><b>Searched for:</b> ${this.vod.searchFor}</h4>
            <h4><b>Tests:</b> ${this.vod.tests}</h4>
        `);

        if (this.vod.initialResponseRetrieved) {
            this.htmlOutput.push(`<div style="background-color: ${SUCCESS_COLOR};">`);
            this.htmlOutput.push(`<h4>Cheerio crawler has sucessfully retrieved and parsed initial response. </h4>`);
            this.htmlOutput.push(`</div>`);

        } else {
            this.htmlOutput.push(`<div style="background-color: ${FAILURE_COLOR};">`);
            this.htmlOutput.push(`<h4>Cheerio crawler failed to retrieve or parse initial response 15 times.</h4>`);
            this.htmlOutput.push(`<h5>Data shown comes from analysis during puppeteer session</h5>`);
            this.htmlOutput.push(`</div>`);
        }

        this.htmlOutput.push(`</div>`);
        this.generateSummaryTable();
        this.generateExampleTable();
        this.generateTimeStamps();
        this.htmlOutput.push(`</div>`);


        // error
        // pageError

        this.htmlOutput.push(`</div>`);
    }
    generateSummaryTable() {
        this.htmlOutput.push('<table class="pure-table pure-table-bordered" >');

        // table headers row
        this.htmlOutput.push('<thead><tr>');
        this.htmlOutput.push(`<th>Keyword</th>`);

        this.htmlOutput.push(`<th>html</th>`);
        this.htmlOutput.push(`<th>json</th>`);
        this.htmlOutput.push(`<th>meta</th>`);
        this.htmlOutput.push(`<th>xhr</th>`);
        this.htmlOutput.push(`<th>schema</th>`);
        this.htmlOutput.push(`<th>window</th>`);

        //column for signalizing if keyword was found sucessfully found in initial html
        this.htmlOutput.push(`<th class="tooltip">Found in initial HTML**</th>`);
        // this.htmlOutput.push(`<th class="tooltip">Found in initial HTML 
        // <span class="tooltiptext">
        // Value indicates whether it's possible to scrape given keyword from initial response retrieved by CheerioCrawler. 
        // </span>
        // </th>`);
        this.htmlOutput.push(`<th>Retrieved by XHR***</th>`);


        this.htmlOutput.push('</tr></thead>');

        // table body start
        this.htmlOutput.push('<tbody>');

        this.vod.searchFor.forEach(keyword => {
            this.htmlOutput.push('<tr>');
            const searchForKey = getKeyByValue(this.vod.keywordMap, keyword);
            const keywordData = this.vod.validationConclusion[searchForKey];
            this.htmlOutput.push(`<td>${keyword}</td>`);

            this.htmlOutput.push(`<td>${keywordData.html.length}</td>`);
            this.htmlOutput.push(`<td>${keywordData.json.length}</td>`);
            this.htmlOutput.push(`<td>${keywordData.meta.length}</td>`);
            this.htmlOutput.push(`<td>${keywordData.xhr.length}</td>`);
            this.htmlOutput.push(`<td>${keywordData.schema.length}</td>`);
            this.htmlOutput.push(`<td>${keywordData.window.length}</td>`);


            this.htmlOutput.push(`<td>${keywordData.foundInInitial}</td>`);
            if (keywordData.xhr.length) {
                this.htmlOutput.push(`<td>${keywordData.retrievedByXHR}</td>`);
            } else {
                this.htmlOutput.push(`<td>---</td>`);
            }
            this.htmlOutput.push('</tr>');
        })


        //table end 
        this.htmlOutput.push('</tbody>');
        this.htmlOutput.push('</table>');
        this.htmlOutput.push(`<p>* Table contains number of possible options to retrieve keywords from given data source</p>`);
        this.htmlOutput.push(`<p>** Value indicates whether it's possible to scrape given keyword from initial response retrieved by CheerioCrawler.</p>`);
        this.htmlOutput.push(`<p>***  Value " -- " indicates, that keyword was not found in any XHR requests. Value "false" indicates, that keyword was found in some XHR request, but analyzer failed to replicate the call. Value "true" indicates, that keyword was found in some XHR request and request was sucessfully replicated by simple HTTP client (gotScraping)</p>`);





    }

    generateExampleTable() {
        const exampleTableData = [
            {
                path: ".exampleSelector",
                value: "data",
                valueFound: "data",
                foundInLists: null,
            },
            {
                path: ".another.exampleSelector",
                value: "Some data",
                valueFound: "Different data",
                foundInLists: null,
            },
            {
                path: ".anotherSelector",
                value: "data",
                valueFound: null,
                foundInLists: null,
            },
            {
                path: ".pathToArray[0].object.value",
                value: "keyword data is substring of this entry",
                valueFound: "keyword data is substring of this entry",
                originalSearchString: "data",
                foundInLists: [
                  {
                    arrayPath: ".pathToArray",
                    childPath: ".object.value",
                    possibleIndexes: {
                      0: "keyword data is substring of this entry",
                      1: "different entry in the same list at index 1",
                      2: "different entry in the same list at index 2",
                      3: "...",
                    }
                  }
                ]
              },

        ]

        this.htmlOutput.push(`<h3><b>Interpretation of the result in tables. </b></h3>`);
        this.htmlOutput.push(`<p>For each keyword, multiple tables are presented in it's tab. Table contains 3 columns. </p>`);
        this.htmlOutput.push(`<p>1. Path: In case of html table it contains selector, that can be directly used to retrieve the data </p>`);
        this.htmlOutput.push(`<p>2. Value: data matching the keyword or containign the keyword as a substring obtained during validation</p>`);
        this.htmlOutput.push(`<p>2. Value: data foudn with given selector in initial response</p>`);
        this.htmlOutput.push(`<p>If the row is <b style="background-color: ${SUCCESS_COLOR}">GREEN</b> data found during analysis was sucessfully validated (it is the same) and can be found in initial response. </p>`);
        this.htmlOutput.push(`<p>If the row is <b style="background-color: ${FAILURE_COLOR}">RED</b> data found with selector from initial response is <b>NOT</b> matching value found during analysis or it's not present at all - value of the cell will be null). This selector can not be used for scraping.</p>`);
        this.htmlOutput.push(`<p>Some keywords can also be found in lists. In such case, additional row will be displayed, this row can be expaneded by clicking and will show additional information on how to find the array and it's possible indexes. </p>`);





        // this.generateDataSourceTable('Example search results ', "example keyword: \"data\"", true, exampleTableData);

        this.htmlOutput.push('<table class="pure-table pure-table-bordered" >');

        // table headers row
        this.htmlOutput.push('<thead><tr>');
        this.htmlOutput.push(`<th>Path</th>`);
        this.htmlOutput.push(`<th>Value</th>`);
        this.htmlOutput.push(`<th>Value found</th>`);
        this.htmlOutput.push('</tr></thead>');

        this.htmlOutput.push('<tbody>');

        exampleTableData.forEach(data => {
            //if html was found in initial response and is the same as the one ine browser 
            const validationResultColor = data.value == data.valueFound ? SUCCESS_COLOR : FAILURE_COLOR;
            this.htmlOutput.push(`<tr style="background-color: ${validationResultColor};">`);
            this.htmlOutput.push(`<td>${data.path}</td>`);
            this.htmlOutput.push(`<td>${data.value}</td>`);
            this.htmlOutput.push(`<td>${data.valueFound}</td>`);

            this.htmlOutput.push('</tr>');
            if (data.foundInLists) {
                this.htmlOutput.push('<tr>');
                this.htmlOutput.push('<td colspan=100%>');
                this.htmlOutput.push(`<div class ="collapsible">Element above was also found in some lists. Click here to expand</div>`);
                this.htmlOutput.push(`<pre style="display:none">`);
                this.htmlOutput.push(`${JSON.stringify(data.foundInLists, null, 4)}`)
                this.htmlOutput.push(`</pre>`);
                this.htmlOutput.push('</td>');
                this.htmlOutput.push('</tr>');
            }
        });




        //table end 
        this.htmlOutput.push('</tbody>');
        this.htmlOutput.push('</table>');


    }

    //generates data for TAB with validated data found for each keyword
    generateKeyWordTab(keyword) {
        //start of tab 
        const searchForKey = getKeyByValue(this.vod.keywordMap, keyword);
        this.htmlOutput.push(`<div id="${searchForKey}" class="tabcontent " >`);

        this.htmlOutput.push(`<h3>Keyword:  "${keyword}" </h3>`);

        const initialSuccess = this.vod.initialResponseRetrieved;
        if (!initialSuccess) {
            this.htmlOutput.push(`<h4><b>Cheeriocrawler request for initial html failed, data displayed was obtained during analysis and it's not validated!</b></h4>`);
        }


        // all tests =  ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML']
        this.generateDataSourceTable('HTML', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].html);
        this.generateDataSourceTable('JSON-LD', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].json);
        this.generateDataSourceTable('SCHEMA.ORG', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].schema);
        this.generateDataSourceTable('META', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].meta);
        this.generateDataSourceTable('WINDOW', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].window);
        this.generateXhrTable(keyword);


        // end of tab
        this.htmlOutput.push(`</div>`);

    }

    generateDataSourceTable(test, keyword, analyzed, dataSource) {

        if (!this.vod.tests.includes(test)) {
            this.htmlOutput.push(`<h3><b>${test}</b> analysis was not performed.</h3>`);
        } else if (!dataSource.length) {
            this.htmlOutput.push(`<h3><b>${test}</b> No ${test} data was found for this keyword.</h3>`);
        } else {
            this.htmlOutput.push(`<h3><b>${test} found for ${keyword}:</b></h3>`);

            this.htmlOutput.push('<table class="pure-table pure-table-bordered">');

            // table headers row
            this.htmlOutput.push('<thead><tr>');
            this.htmlOutput.push(`<th>Path</th>`);
            this.htmlOutput.push(`<th>Value</th>`);
            if (analyzed) {
                this.htmlOutput.push(`<th><b>Initial html value</b></th>`);
            }
            this.htmlOutput.push('</tr></thead>');

            // table body start
            this.htmlOutput.push('<tbody>');
            //html table start
            this.htmlOutput.push('<tr>');
            this.htmlOutput.push('</tr>');
            dataSource.forEach(data => {
                //if html was found in initial response and is the same as the one ine browser 
                const validationResultColor = data.value == data.valueFound ? SUCCESS_COLOR : FAILURE_COLOR;
                this.htmlOutput.push(`<tr style="background-color: ${validationResultColor};">`);
                this.htmlOutput.push(`<td>${data.path}</td>`);
                this.htmlOutput.push(`<td>${data.value}</td>`);
                if (analyzed) {
                    this.htmlOutput.push(`<td>${data.valueFound}</td>`);
                }

                this.htmlOutput.push('</tr>');
                if (data.foundInLists) {
                    this.htmlOutput.push('<tr>');
                    this.htmlOutput.push('<td colspan=100%>');
                    this.htmlOutput.push(`<div class ="collapsible">Element above was also found in some lists. Click here to expand</div>`);
                    this.htmlOutput.push(`<pre style="display:none">`);
                    this.htmlOutput.push(`${JSON.stringify(data.foundInLists, null, 4)}`)
                    this.htmlOutput.push(`</pre>`);
                    this.htmlOutput.push('</td>');
                    this.htmlOutput.push('</tr>');
                }
            });
            this.htmlOutput.push('</tbody>');
            this.htmlOutput.push('</table>');

        }

    }

    generateXhrTable(keyword) {
        const searchForKey = getKeyByValue(this.vod.keywordMap, keyword);
        if (!this.vod.tests.includes('XHR')) {
            this.htmlOutput.push(`<h3><b>XHR</b> analysis was not performed.</h3>`);
        } else if (!this.vod.validationConclusion[searchForKey].xhr.length) {
            this.htmlOutput.push(`<h3>Keyword was not found in any XHR requests. </h3>`);
        } else {
            this.htmlOutput.push(`<h3><b>XHR found for ${keyword}: </h3> `);

            this.htmlOutput.push('<table class="pure-table pure-table-bordered" >');
            // table headers row
            this.htmlOutput.push('<thead><tr>');
            this.htmlOutput.push(`<th>XHR index</th>`);
            this.htmlOutput.push(`<th>Url</th>`);
            this.htmlOutput.push(`<th>Method</th>`);
            this.htmlOutput.push(`<th>Validation</th>`);
            this.htmlOutput.push('</tr></thead>');

            // table body start
            this.htmlOutput.push('<tbody>');
            for (const xhrFound of this.vod.validationConclusion[searchForKey].xhr) {
                this.htmlOutput.push('<tr>');
                this.htmlOutput.push(`<td>${xhrFound.index}</td>`);
                this.htmlOutput.push(`<td>${xhrFound.url}</td>`);
                this.htmlOutput.push(`<td>${xhrFound.method}</td>`);
                this.htmlOutput.push(`<td>${xhrFound.success}</td>`);
                this.htmlOutput.push('</tr>');
            }
            this.htmlOutput.push('</tbody>');
            this.htmlOutput.push('</table>');


        }

    }

    generateTimeStamps() {
        const timeStampKeys = [
            "analysisStarted",
            "scrappingStarted",
            "pageNavigated",
            "windowPropertiesSearched",
            "metadataSearched",
            "schemaOrgSearched",
            "jsonLDSearched",
            "htmlSearched",
            "xhrRequestsSearched",
            "analysisEnded"
        ];
        this.htmlOutput.push(`<h3>Timestamps:</h3>`);


        this.htmlOutput.push('<table class="pure-table pure-table-bordered">');

        // table headers row
        this.htmlOutput.push('<thead><tr>');
        this.htmlOutput.push(`
      <th>Event</th>
      `);

        this.htmlOutput.push(`
      <th>Time</th>
      `);
        this.htmlOutput.push('</tr></thead>');
        // timestamp value rows
        this.htmlOutput.push('<tbody>');

        timeStampKeys.forEach(timeStamp => {

            this.htmlOutput.push('<tr>');

            this.htmlOutput.push(`
      <td>${timeStamp}</td>
      <td>${this.analyzerOutput[timeStamp]}</td>
      `);

            this.htmlOutput.push('</tr>');
        });
        this.htmlOutput.push('</tbody>');

        this.htmlOutput.push('</table>');
    }

    generateHeaderAndCss() {
        const header = `<!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://unpkg.com/purecss@2.1.0/build/pure-min.css" integrity="sha384-yHIFVG6ClnONEA5yB5DJXfW2/KC173DIQrYoZMEtBvGzmf0PKiGyNEqe9N6BNDBH" crossorigin="anonymous">
        

        <style>
        
        body {font-family: Arial;}
        
        /* Style the tab */
        .tab {
          overflow: hidden;
          border: 1px solid #ccc;
          background-color: #f1f1f1;
        }
        
        /* Style the buttons inside the tab */
        .tab button {
          background-color: inherit;
          float: left;
          border: none;
          outline: none;
          cursor: pointer;
          padding: 14px 16px;
          transition: 0.3s;
          font-size: 17px;
        }
        
        /* Change background color of buttons on hover */
        .tab button:hover {
          background-color: #ddd;
        }
        
        /* Create an active/current tablink class */
        .tab button.active {
          background-color: #ccc;
        }
        
        /* Style the tab content */
        .tabcontent {
          display: none;
          padding: 6px 12px;
        }
        .collapsible {
            cursor: pointer;
        }
        table {
            width:100%;
        }

        pre {
            white-space: pre-wrap;
        }

        .tooltip {
            position: relative;
            display: inline-block;
            border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
          }
          
          /* Tooltip text */
          .tooltip .tooltiptext {
            visibility: hidden;
            width: 240px;
            background-color: black;
            color: #fff;
            text-align: center;
            padding: 5px 0;
            border-radius: 6px;           
            position: absolute;
            z-index: 1;
            bottom: 100%;
            left: 50%;
            margin-left: -120px; /* Use half of the width (120/2 = 60), to center the tooltip */
          }
          
          /* Show the tooltip text when you mouse over the tooltip container */
          .tooltip:hover .tooltiptext {
            visibility: visible;
          }
        </style>
        </head>`;

        this.htmlOutput.push(header);
    }



    appendScript() {
        const content = `
        
        <script>
        function openTab(evt, tabName) {
          var i, tabcontent, tablinks;
          tabcontent = document.getElementsByClassName("tabcontent");
          for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
          }
          tablinks = document.getElementsByClassName("tablinks");
          for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");
          }
          document.getElementById(tabName).style.display = "block";
          evt.currentTarget.className += " active";
        }
        

        
        </script>        
        <script type="module">
        var coll = document.getElementsByClassName("collapsible");
        var i;
        
        for (i = 0; i < coll.length; i++) {
          coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
              content.style.display = "none";
            } else {
              content.style.display = "block";
            }
          });
        } 
        </script>
        </body>
        </html> `;
        this.htmlOutput.push(content);
    }

    cleanOutput() {
        // TODO: fix this temporary solution
        // cleanup data that does not need to be duplicate in the output
        delete this.analyzerOutput.vod.url;
        delete this.analyzerOutput.vod.keywordMap;
        delete this.analyzerOutput.vod.searchFor;
        delete this.analyzerOutput.vod.tests;
        delete this.analyzerOutput.vod.validatedXhr;
    }
}
module.exports = htmlGenerator;
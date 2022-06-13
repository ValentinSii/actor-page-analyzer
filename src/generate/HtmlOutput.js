const Apify = require('apify');
const { getKeyByValue } = require('../utils');
// Apify.main(async () => {
//   //generate validation html output 
//   const file = 'apify_storage/key_value_stores/default/OUTPUT.json';
//   const fileContents = fs.readFileSync(file, 'utf8');
//   const htmlGeneratorInstance = new htmlGenerator(fileContents.fields);
//   htmlGeneratorInstance.generateHtmlFile('dev');
// });
const SUCCESS_COLOR =  "#D0F0C0";
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
            if (keyword.length >= 10) {
                keyWordTabString = keyword.substring(0, 9) + "..";
            }

            this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, '${searchForKey}')">${keyWordTabString}</button>`)
        });

        // Generate tab for XHR found requests
        this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, 'XHR')">XHR Found</button>`);
        // open OUTPUT.json in new tab
        this.htmlOutput.push(`<button class="tablinks" onclick=" window.open('./OUTPUT.json','_blank')">OUTPUT.JSON</button>`);
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

            this.htmlOutput.push('<table class="pure-table pure-table-bordered" style="width:100%";table-layout: fixed>');

            for (let i = 0; i < this.vod.validatedXhr.length; i++) {
               
                
                const xhr = this.vod.validatedXhr[i];

                const validationResultColor = xhr.validationSuccess ? SUCCESS_COLOR : FAILURE_COLOR;
                this.htmlOutput.push('<tr>');
                this.htmlOutput.push(`<td colspan=100%>`);
                this.htmlOutput.push(`<h4 class ="collapsible"><b> ${i}: </b> ${xhr.originalRequest.url} <b style="float: right; ">Click to expand.</b></h4>`);
                


                this.htmlOutput.push('<div style="white-space: pre-wrap; display:none;">');
                this.htmlOutput.push(`<p style="background-color: ${validationResultColor};"><b>Validation result:</b> ${xhr.validationSuccess ? "SUCCESS" : "FAIL" }</p>`);
                this.htmlOutput.push(`<p><b>Method:</b> ${xhr.originalRequest.method}</p>`);
                this.htmlOutput.push(`<p><b>Response status:</b> ${xhr.originalRequest.request.responseStatus}</p>`);
                this.htmlOutput.push(`<p><b>Keywords found:</b>${xhr.originalRequest.keywordsFound} </p>`);              

                // this.htmlOutput.push(`<div class ="collapsible"> Click to open original request: </div>`);
                // this.htmlOutput.push(`<pre style="white-space: pre-wrap; display:none; border-style: solid;border-width: thin;">`);
                // this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest, null, 4)}`);
                // this.htmlOutput.push(`</pre>`);
                
                this.htmlOutput.push(`<p><b>Request headers: </b> </p>`);
                this.htmlOutput.push(`<pre style="white-space: pre-wrap;">`);
                this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest.request.headers, null, 4)}`);
                this.htmlOutput.push(`</pre>`);


                this.htmlOutput.push(`<p><b>Response headers: </b> </p>`);
                this.htmlOutput.push(`<pre style="white-space: pre-wrap;">`);
                this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest.request.responseHeaders, null, 4)}`);
                this.htmlOutput.push(`</pre>`);

                this.htmlOutput.push(`<p class ="collapsible"><b>Response body: </b> Click to expand. </p>`);
                this.htmlOutput.push(`<pre style="white-space: pre-wrap;display:none;">`);
                this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest.request.responseBody, null, 4)}`);
                this.htmlOutput.push(`</pre>`);


                // this.htmlOutput.push(`<div><b>Method:</b> ${xhr.originalRequest.method}</div>`);
                // this.htmlOutput.push(`<div><b>Response status:</b> ${xhr.originalRequest.request.responseStatus}</div>`);
                // this.htmlOutput.push(`<div><b>Keywords found:</b> </div>`);
                // request headers
                //response headers 
                // response body
                // searchresults
                
                // take last call 
                //calls minimal headers
                    // headers
                    // got headers
                    // validation result
                //calls original headers
                //calls with cookie
                this.htmlOutput.push('</div>');
                this.htmlOutput.push('</td>');

                this.htmlOutput.push('</tr>');

            }
            this.htmlOutput.push('</table>');


        }

        this.htmlOutput.push(`</div>`);
    }

    generateConclusionTab() {
        this.htmlOutput.push(`<div id="CONCLUSION" class="tabcontent active" style="display: block;" >`);
        this.htmlOutput.push(`
            <div>
            <h2><b>URL: </b><a href="${this.vod.url}" target="_blank">${this.vod.url}</a></h2>
            <h4><b>Searched for:</b> ${this.vod.searchFor}</h4>
            <h4><b>Tests:</b> ${this.vod.tests}</h4>
        `);

        if(this.vod.initialResponseRetrieved) {
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
        // this.analyzerOutput.validation.searchFor.forEach(keyword => {
        //     this.generateKeywordConclusion(keyword);

        // });
        this.generateSummaryTable();
        this.generateTimeStamps();
        this.htmlOutput.push(`</div>`);


        // error
        // pageError

        this.htmlOutput.push(`</div>`);
    }
    generateSummaryTable() {
        this.htmlOutput.push('<table class="pure-table pure-table-bordered" >');

        const tableKeys = [
            'html',
            'json',
            'meta',
            'xhr',
            'schema',
            'window'
        ];
        // table headers row
        this.htmlOutput.push('<thead><tr>');
        this.htmlOutput.push(`<th>Keyword</th>`);
        tableKeys.forEach(key => {
            this.htmlOutput.push(`<th>${key}</th>`);
        })

        //column for signalizing if keyword was found sucessfully found in initial html
        this.htmlOutput.push(`<th>Found in initial HTML</th>`);

        this.htmlOutput.push('</tr></thead>');

        // table body start
        this.htmlOutput.push('<tbody>');

        this.vod.searchFor.forEach(keyword => {
            this.htmlOutput.push('<tr>');
            const searchForKey = getKeyByValue(this.vod.keywordMap, keyword);
            const keywordData = this.vod.validationConclusion[searchForKey];
            this.htmlOutput.push(`<td>${keyword}</td>`);
            tableKeys.forEach(key => {
                this.htmlOutput.push(`<td>${keywordData[key].length}</td>`);
            })
            this.htmlOutput.push(`<td>${keywordData["foundInInitial"]}</td>`)
            this.htmlOutput.push('</tr>');
        })


        //table end 
        this.htmlOutput.push('</tbody>');
        this.htmlOutput.push('</table>');
        this.htmlOutput.push(`<p>* Table contains number of possible options to retrieve keywords from given source</p>`);
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

            this.htmlOutput.push('<table class="pure-table pure-table-bordered" style="width:100%";table-layout: fixed>');

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
                    this.htmlOutput.push(`<pre style="white-space: pre-wrap; display:none">`);
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
            this.htmlOutput.push(`<h3><b>XHR found for ${keyword}:`);

            this.htmlOutput.push('<table class="pure-table pure-table-bordered" style="width:100%";table-layout: fixed>');

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
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" integrity="sha512-894YE6QWD5I59HgZOGReFYm4dnWc1Qt5NtvYSaNcOP+u1T9qYdvdihz0PPSiiqn/+/3e7Jo4EaG7TubfWGUrMQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        
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
}
module.exports = htmlGenerator;
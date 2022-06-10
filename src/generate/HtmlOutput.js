const Apify = require('apify');
const { getKeyByValue } = require('../utils');
// Apify.main(async () => {
//   //generate validation html output 
//   const file = 'apify_storage/key_value_stores/default/OUTPUT.json';
//   const fileContents = fs.readFileSync(file, 'utf8');
//   const htmlGeneratorInstance = new htmlGenerator(fileContents.fields);
//   htmlGeneratorInstance.generateHtmlFile('dev');
// });

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
            this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, '${searchForKey}')">${searchForKey}</button>`)
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

       if(this.vod.validatedXhr) {

        this.vod.validatedXhr.map(xhr => {
            this.htmlOutput.push(`<h3><b>Request:</b> ${xhr.originalRequest.url}</h3>`);
            this.htmlOutput.push(`<h3><b>Method:</b> ${xhr.originalRequest.method}</h3>`);
            this.htmlOutput.push(`<div class ="collapsible"> Click to open original request: </div>`);
            this.htmlOutput.push(`${JSON.stringify(xhr.originalRequest, null, 4)}`);
            this.htmlOutput.push(`<pre style="white-space: pre-wrap; display:none">`);
            this.htmlOutput.push(`</pre>`);


        });
       }

        this.htmlOutput.push(`</div>`);
    }

    generateConclusionTab() {
        this.htmlOutput.push(`<div id="CONCLUSION" class="tabcontent active" style="display: block;" >`);

        this.htmlOutput.push(`
            <div class="green htmlRow">
            <h2><b>Url:</b> ${this.vod.url}</h2>
            <h4><b>Searched for:</b> ${this.vod.searchFor}</h4>
            <h4><b>Tests:</b> ${this.vod.tests}</h4>
            </div>          
            `);

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

        const initialSuccess = this.vod.initialResponseRetrieved;
        if (!initialSuccess) {
            this.htmlOutput.push(`<h4><b>Cheeriocrawler request for initial html failed, data displayed was obtained during analysis and it's not validated!</b></h4>`);
        }


        // all tests =  ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML']
        this.generateDataSourceTable('HTML', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].html);
        this.generateDataSourceTable('XHR', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].xhr);
        this.generateDataSourceTable('JSON-LD', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].json);
        this.generateDataSourceTable('SCHEMA.ORG', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].schema);
        this.generateDataSourceTable('META', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].meta);
        this.generateDataSourceTable('WINDOW', keyword, initialSuccess, this.vod.validationConclusion[searchForKey].window);


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
                if (data.value == data.valueFound) {
                    this.htmlOutput.push('<tr style="background-color: #D0F0C0;">');
                } else {
                    this.htmlOutput.push('<tr style="background-color: #F78DA7;">');
                }
                this.htmlOutput.push(`<td>${data.path}</td>`);
                this.htmlOutput.push(`<td>${data.value}</td>`);
                if (analyzed) {
                    this.htmlOutput.push(`<td>${data.valueFound}</td>`);
                }

                this.htmlOutput.push('</tr>');
                if (data.foundInLists) {
                    this.htmlOutput.push('<tr>');
                    this.htmlOutput.push('<td colspan=100%>');
                    this.htmlOutput.push(`<div class ="collapsible">Element above was also found in some lists. Click here to reveal</div>`);
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-jsonview/1.2.3/jquery.jsonview.css" integrity="sha512-6dqKyKlSER24gVyNQkP3cUfIaA5OfAEHxDBRiElKxSmlZTTdY6Z7uiUW5pADcTzqjEmli6Dv+IuTPsMLuFPeBg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
        <script type="module" src="https://cdn.jsdelivr.net/npm/json-formatter-js@2.3.4/dist/json-formatter.umd.min.js" defer></script>

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
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/jstree.min.js" integrity="sha512-TGClBy3S4qrWJtzel4qMtXsmM0Y9cap6QwRm3zo1MpVjvIURa90YYz5weeh6nvDGKZf/x3hrl1zzHW/uygftKg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>         
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/jstree.min.js" integrity="sha512-TGClBy3S4qrWJtzel4qMtXsmM0Y9cap6QwRm3zo1MpVjvIURa90YYz5weeh6nvDGKZf/x3hrl1zzHW/uygftKg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-jsonview/1.2.3/jquery.jsonview.min.js" integrity="sha512-ff/E/8AEnLDXnTCyIa+l80evPRNH8q5XnPGY/NgBL645jzHL1ksmXonVMDt7e5D34Y4DTOv+P+9Rmo9jBSSyIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        <script src="https://cdn.jsdelivr.net/npm/json-formatter-js@2.3.4/dist/json-formatter.umd.min.js" defer>
          
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
}
module.exports = htmlGenerator;
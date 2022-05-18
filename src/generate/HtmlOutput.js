const Apify = require('apify');
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

    //array used to store lines of html code
    this.htmlOutput = [];
  }
  
  async generateHtmlFile(fileName) {
    this.generateHeaderAndCss();
    this.htmlOutput.push(`<body>`);
    //generate top bar tab for each searched keyword from input file
    this.tabsPerKeyword();
    //tab for CONCLUSION
    this.generateConclusionTab();
    this.analyzerOutput.validation.searchFor.forEach(keyword => {
      this.generateKeywordConclusion(keyword);
    })

    // this.htmlTab();
    // this.jsonLDDataTab();
    // this.windowPropertiesTab();
    // this.generateSchemaTab();
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

  tabsPerKeyword() {
    this.htmlOutput.push(`
      <div class="tab">
      <button class="tablinks" onclick="openTab(event, 'CONCLUSION')">CONCLUSION</button>`
    );
    // generate tabs per keyword
    this.analyzerOutput.validation.searchFor.forEach(keyword => {
      this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, '${keyword}')">${keyword}</button>`)
    });

    // Generate tab for XHR found requests
    this.htmlOutput.push(`<button class="tablinks" onclick="openTab(event, 'XHR')">XHR Found</button>`);
    // open OUTPUT.json in new tab
    this.htmlOutput.push(`<button class="tablinks" onclick=" window.open('./OUTPUT.json','_blank')">OUTPUT.JSON</button>`);
    this.htmlOutput.push(`</div>`);
  }

  xhrTab() {
    this.htmlOutput.push(`<div id="XHR" class="tabcontent" >`);
    for (const xhrFound of this.analyzerOutput.xhrRequestsFound) {
      this.htmlOutput.push(
      `<div class="htmlRow">
      <h3>Request: ${xhrFound.method} : ${xhrFound.url}</h3>
      <pre>
      ${JSON.stringify(xhrFound.searchResults, null, 4)}
      </pre>
      </div>`);
    }
    this.htmlOutput.push(`</div>`);

    // this.htmlOutput.push(`
    //         <div class="${color} htmlRow">
    //         <h3>Request: ${xhr.url}</h3>
    //         <p><b>Method</b>: ${xhr.method}</p>
    //         <p><b>Headers</b>: ${JSON.stringify(xhr.headers, null, 2)}</p>
    //         <p><b>Response body</b>: ${JSON.stringify(xhr.responseBody, null, 2)}</p>
    //         </div>          
    //         `);
    this.htmlOutput.push(`</div>`);
  }

  generateConclusionTab() {
    this.htmlOutput.push(`<div id="CONCLUSION" class="tabcontent active" style="display: block;" >`);

    this.htmlOutput.push(`
            <div class="green htmlRow">
            <h2><b>Url:</b> ${this.analyzerOutput.validation.url}</h2>
            <h4><b>Searched for: ${this.analyzerOutput.validation.searchFor}</b></h4>
            </div>          
            `);
    // this.analyzerOutput.validation.searchFor.forEach(searchFor => {
    //   this.htmlOutput.push(`<h3>${searchFor}</h3>`);
    // });

    // this.analyzerOutput.validation.searchFor.forEach(keyword => {
    //     this.generateKeywordConclusion(keyword);
    // });
    this.generateSummaryTable()
    this.generateTimeStamps();
    this.htmlOutput.push(`<div id="jsonContainer">`);
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
    this.htmlOutput.push('</tr></thead>');

    // table body start
    this.htmlOutput.push('<tbody>');

    this.analyzerOutput.validation.searchFor.forEach(keyword => {
      this.htmlOutput.push('<tr>');
      const keywordData = this.analyzerOutput.validation.validationConclusion[keyword];
      this.htmlOutput.push(`<td>${keyword}</td>`);
      tableKeys.forEach(key => {
        this.htmlOutput.push(`<td>${keywordData[key].length}</td>`);
      })
      this.htmlOutput.push('<tr>');
    })


    //table end 
    this.htmlOutput.push('</tbody>');
    this.htmlOutput.push('</table>');
    this.htmlOutput.push(`<p>* Table contains number of possible options to retrieve keywords from given source</p>`);
  }

  generateKeywordConclusion(keyword) {
    // this.htmlOutput.push(`<div id="WINDOW" class="tabcontent" >`);


    const conclusionData = this.analyzerOutput.validation.validationConclusion[keyword];
    this.keywordTabHtmlTable(keyword, conclusionData);

  }
  keywordTabHtmlTable(keyword, conclusionData) {

    this.htmlOutput.push(`<div id="${keyword}" class="tabcontent " >`);
    //html found
    if (conclusionData.html.length != 0) {
      this.htmlOutput.push(`<h3><b>Html found for ${keyword}:</b></h3>`);

      this.htmlOutput.push('<table class="pure-table pure-table-bordered" >');

      // table headers row
      this.htmlOutput.push('<thead><tr>');
      this.htmlOutput.push(`<th>Selector</th>`);
      this.htmlOutput.push(`<th>Text found</th>`);
      this.htmlOutput.push(`<th>Text expected</th>`);
      this.htmlOutput.push('</tr></thead>');

      // table body start
      this.htmlOutput.push('<tbody>');
      //html table start
      this.htmlOutput.push('<tr>');
      this.htmlOutput.push('</tr>');
      conclusionData.html.forEach(html => {
        //if html was found in initial response and is the same as the one ine browser 
        if (html.match) {
          this.htmlOutput.push('<tr style="background-color: #D0F0C0;">');
        } else {
          this.htmlOutput.push('<tr style="background-color: #F78DA7;">');
        }
        this.htmlOutput.push(`<td>${html.selector}</td>`);
        this.htmlOutput.push(`<td>${html.text}</td>`);
        this.htmlOutput.push(`<td>${html.textExpected}</td>`);


        this.htmlOutput.push('</tr>');
      });
      this.htmlOutput.push('</tbody>');
      this.htmlOutput.push('</table>');
      this.htmlOutput.push(`<p>* Table contains data that can be obtained from initial html with given selectors</p>`);


    } else {
      this.htmlOutput.push(`<h3><b>No html found for ${keyword}</b></h3>`);
    }
    this.htmlOutput.push(`</div>`);

    this.htmlOutput.push(`<div class="json">`);
    this.htmlOutput.push(`</div>`);
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
      "analysisEnded",
      "outputFinished"
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

  generateDataCountTable() {

    const dataCountKeys = [
      "metaData",
      "metaDataFound",
      "jsonLDData",
      "jsonLDDataFound",
      "allJsonLDData",
      "htmlFound",
      "xhrRequests",
      "xhrRequestsFound"
    ];

    dataCountKeys.forEach(dataCountKey => {
      const dataCountValue = this.analyzerOutput[dataCountKey]?.length;
      const color = this.analyzerOutput[dataCountKey]?.length == null || dataCountValue == 0 ? 'red' : 'green';
      this.htmlOutput.push(`
      <div class="${color} htmlRow">
      <h3><b>${dataCountKey}:</b> ${dataCountValue}</h3>
      </div>          
      `);

    });
  }
  generateSchemaTab() {
    this.htmlOutput.push(`<div id="SCHEMA" class="tabcontent" >`);

    const color = "green";

    this.htmlOutput.push(`
            <div class="${color} htmlRow">
            <h3>TODO: Propagate schema.org data found in jsonld/application contex= "schema.org"</h3>            
            </div>          
            `);

    this.htmlOutput.push(`</div>`);
  }
  // generateMetaTab(){
  //   this.htmlOutput.push(`<div id="META" class="tabcontent" >`);
  //   this.analyzerOutput.validation.jsonLDDValidated.forEach(jsonldDataUnit => {
  //     const color = jsonldDataUnit.htmlExpected === jsonldDataUnit.htmlFound ? "green" : "red";

  //     this.htmlOutput.push(`
  //           <div class="${color} htmlRow">
  //           <h3>Path: ${jsonldDataUnit.path}</h3>
  //           <p><b>Jsonld data expected</b>: ${jsonldDataUnit.dataExpected}</p>
  //           <p><b>Data found</b>: ${jsonldDataUnit.dataFound}</p>
  //           </div>          
  //           `);
  //   });
  //   this.htmlOutput.push(`</div>`);
  // }

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
         import JSONFormatter from 'json-formatter-js';
         const myJSON = {ans: 42};

        const formatter = new JSONFormatter(myJSON);

        document.body.appendChild(formatter.render());

        </script>
        </body>
        </html> `;
    this.htmlOutput.push(content);
  }
}
module.exports = htmlGenerator;
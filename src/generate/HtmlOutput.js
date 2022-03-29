const Apify = require('apify');
const fs = require('fs');
const time = require('moment');


// Apify.main(async () => {
//   //generate validation html output 
//   const file = 'apify_storage/key_value_stores/default/OUTPUT.json';
//   const fileContents = fs.readFileSync(file, 'utf8');
//   const htmlGeneratorInstance = new htmlGenerator(fileContents.fields);
//   htmlGeneratorInstance.generateHtmlFile('dev');
// });

class htmlGenerator {

  constructor(analyzerOutput) {
    // general OUTPUT.json file object
    this.analyzerOutput = analyzerOutput;

    this.htmlOutput = [];
  }
  // readAnalyzerOutput() {

  //   //deserialzie output from file /home/vladopisko/source/apify/actor-page-analyzer/apify_storage/key_value_stores/default/OUTPUT.json
  //   const file = 'apify_storage/key_value_stores/default/OUTPUT.json';
  //   const fileContents = fs.readFileSync(file, 'utf8');

  //   this.analyzerOutput = JSON.parse(fileContents);
  //   this.htmlOutput = [];

  // }

  async generateHtmlFile(fileName) {
    this.generateHeaderAndCss();
    this.htmlOutput.push(`<body>`);
    this.tabs();
    this.generateConclusionTab();
    this.htmlTab();
    this.jsonLDDataTab();
    this.windowPropertiesTab();
    this.generateSchemaTab();
    // this.xhrTab();
    this.appendScript();



    // console.log(this.htmlOutput.join(""));
    fs.writeFileSync('page.html', this.htmlOutput.join(""), function (err) {
      if (err) return console.log(err);
    });

    await this.saveValidatorOutput(fileName);



  }
  async saveValidatorOutput(fileName) {
    try {
      await Apify.setValue(fileName, this.htmlOutput.join(""), { contentType: 'text/html' });
    } catch (err) {
      console.log(err);
    }
  }
  tabs() {
    const tabs = `<div class="tab">
    <button class="tablinks" onclick="openTab(event, 'CONCLUSION')">CONCLUSION</button>
    <button class="tablinks" onclick="openTab(event, 'HTML')">HTML</button>
    <button class="tablinks" onclick="openTab(event, 'JSONLD')">JSONLD</button>
    <button class="tablinks" onclick="openTab(event, 'SCHEMA')">SCHEMA.ORG</button>
    <button class="tablinks" onclick="openTab(event, 'XHR')">XHR</button>
    <button class="tablinks" onclick="openTab(event, 'WINDOW')">WINDOW</button>
    <button class="tablinks" onclick="openTab(event, 'META')">META</button>
    </div>`;
    this.htmlOutput.push(tabs);
  }
  htmlTab() {
    this.htmlOutput.push(`<div id="HTML" class="tabcontent" >`);
    this.analyzerOutput.validation.htmlDataValidated.forEach(htmlValidated => {
      const color = htmlValidated.htmlExpected === htmlValidated.htmlFound ? "green" : "red";

      this.htmlOutput.push(`
          <div class="${color} htmlRow">
          <h3>Selector: ${htmlValidated.selector}</h3>
          <p><b>Html expected</b>: ${htmlValidated.htmlExpected}</p>
          <p><b>Html found</b>: ${htmlValidated.htmlFound}</p>
          </div>          
          `);
    });
    this.htmlOutput.push(`</div>`);

  }

  jsonLDDataTab() {
    this.htmlOutput.push(`<div id="JSONLD" class="tabcontent" >`);
    this.analyzerOutput.validation.jsonLDDValidated.forEach(jsonldDataUnit => {
      const color = jsonldDataUnit.htmlExpected === jsonldDataUnit.htmlFound ? "green" : "red";

      this.htmlOutput.push(`
            <div class="${color} htmlRow">
            <h3>Path: ${jsonldDataUnit.path}</h3>
            <p><b>Jsonld data expected</b>: ${jsonldDataUnit.dataExpected}</p>
            <p><b>Data found</b>: ${jsonldDataUnit.dataFound}</p>
            </div>          
            `);
    });
    this.htmlOutput.push(`</div>`);

  }
  windowPropertiesTab() {
    this.htmlOutput.push(`<div id="WINDOW" class="tabcontent" >`);
    this.analyzerOutput.windowPropertiesFound.forEach(windowProperty => {
      const color = "green";

      this.htmlOutput.push(`
            <div class="${color} htmlRow">
            <p><b>Path:</b> ${windowProperty.path} <b>Value:</b>${windowProperty.value}</p>
            </div>          
            `);
    });
    this.htmlOutput.push(`</div>`);
  }
  xhrTab() {
    this.htmlOutput.push(`<div id="XHR" class="tabcontent" >`);

    const xhr = this.analyzerOutput.xhr;

    const color = "green";

    this.htmlOutput.push(`
            <div class="${color} htmlRow">
            <h3>Request: ${xhr.url}</h3>
            <p><b>Method</b>: ${xhr.method}</p>
            <p><b>Headers</b>: ${JSON.stringify(xhr.headers, null, 2)}</p>
            <p><b>Response body</b>: ${JSON.stringify(xhr.responseBody, null, 2)}</p>
            </div>          
            `);

    this.htmlOutput.push(`</div>`);
  }

  generateConclusionTab() {
    this.htmlOutput.push(`<div id="CONCLUSION" class="tabcontent active" style="display: block;" >`);

    this.htmlOutput.push(`
            <div class="green htmlRow">
            <h2><b>Url:</b> ${this.analyzerOutput.validation.url}</h2>
            <h3><b>Searched for:</b> ${this.analyzerOutput.validation.searchFor}</h3>
            </div>          
            `);
    this.generateTimeStamps();


    // error
    // pageError

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

  generateHeaderAndCssMin() {
    const header = `<!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
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
          border: 1px solid #ccc;
          border-top: none;
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
        </body>
        </html> `;
    this.htmlOutput.push(content);
  }
}
module.exports = htmlGenerator;
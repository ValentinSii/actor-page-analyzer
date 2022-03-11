const fs = require('fs');

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

  //   this.validatorOutputData = JSON.parse(fileContents);
  //   this.htmlOutput = [];

  // }

  generateHtmlFile() {
    this.generateHeaderAndCss();
    this.htmlOutput.push(`<body>`);
    this.tabs();
    this.htmlTab();
    
    // this.jsonLDDataTab();
    // this.xhrTab();
    this.appendScript();



    console.log(this.htmlOutput.join(""));
    fs.writeFileSync('page.html', this.htmlOutput.join(""), function (err) {
      if (err) return console.log(err);
    });

  }

  tabs() {
    const tabs = `<div class="tab">
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
    this.analyzerOutput.jsonLDDValidated.forEach(jsonldValidated => {
      const color = jsonldValidated.htmlExpected === jsonldValidated.htmlFound ? "green" : "red";

      this.htmlOutput.push(`
            <div class="${color} htmlRow">
            <h3>Path: ${jsonldValidated.path}</h3>
            <p><b>Jsonld data expected</b>: ${jsonldValidated.dataExpected}</p>
            <p><b>Data found</b>: ${jsonldValidated.dataFound}</p>
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

  generateHeaderAndCss() {
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
        .London {
            background-color: aquamarine;
        }

        .htmlRow {
          border: 1px solid #ccc;
          margin-bottom: 14px;
          margin-left: 0px;
        }
        .green {
          background-color: #b5e3af;
        }
        .red {
          background-color: #f88687;
        }
        p {
          padding-left: 14px;
        }
        h3 {
          padding: 6px 14px;
        }

        </style>
        </head>`;

    this.htmlOutput.push(header);
  }

  appendScript() {
    const content = `

        <script>
        function openTab(evt, cityName) {
          var i, tabcontent, tablinks;
          tabcontent = document.getElementsByClassName("tabcontent");
          for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
          }
          tablinks = document.getElementsByClassName("tablinks");
          for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");
          }
          document.getElementById(cityName).style.display = "block";
          evt.currentTarget.className += " active";
      }
        </script>           
        </body>
        </html> `;
    this.htmlOutput.push(content);
  }
}
module.exports = htmlGenerator;
const fs = require('fs');

class htmlGenerator {

  constructor(validatorOutput) {
    this.readValidatorOutput();
    this.validatorOutput = validatorOutput;
  }
  readValidatorOutput() {

    //deserialzie output from file /home/vladopisko/source/apify/actor-page-analyzer/apify_storage/key_value_stores/default/OUTPUT.json
    const file = './src/VALIDATION.json';
    const fileContents = fs.readFileSync(file, 'utf8');

    this.validatorOutputData = JSON.parse(fileContents);
    this.htmlOutput = [];

  }

  generateHtmlFile(jsonValidator) {
    this.generateHeaderAndCss();
    this.htmlOutput.push(`<body>`);
    this.tabs();
    this.htmlTab();
    this.generateContent();




    fs.writeFile('page.html', this.htmlOutput.join(""), function (err) {
      if (err) return console.log(err);
    });

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
    this.validatorOutput.htmlDataValidated.forEach(htmlValidated => {
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
  generateContent() {
    const content = `      
              
        <div id="Paris" class="tabcontent">
          <h3>Paris</h3>
          <p>Paris is the capital of France.</p> 
        </div>        
        <div id="Tokyo" class="tabcontent">
          <h3>Tokyo</h3>
          <p>Tokyo is the capital of Japan.</p>
        </div>        
        <script src="htmlPage.js"></script>           
        </body>
        </html> `;
    this.htmlOutput.push(content);
  }

  generateHtmlValidatorOutput() {
    this.validatorOutputData[0].htmlDataValidated.map((validatedHtml) => ({


    }));
  }
}
module.exports = htmlGenerator;
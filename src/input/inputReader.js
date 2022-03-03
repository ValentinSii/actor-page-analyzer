const Apify = require('apify');
const { typeCheck } = require('type-check');

// Definition of the global input
const INPUT_TYPE = `{
    pages: Array,
    tests: Maybe Array
}`;

// Definition of the page input
const PAGE_INPUT_TYPE = `{
    url: String,
    searchFor: Array,
    tests: Maybe Array
}`;

const TESTS_ALL = ['SCHEMA.ORG', 'JSON-LD', 'WINDOW', 'XHR', 'META', 'HTML'];

class input {

    pages = [];
    tests = [];
    // TODO: ask about this.foundPaths in DOMsearcher ~line 271
    constructor() {

    }
       
}

async function readInputAsync(inputFileName) {

    let inputObject = new input();
    console.log('This is console.log from inputReader: Loading data from input');
    try {
        // Fetch the input and check it has a valid format
        // You don't need to check the input, but it's a good practice.
        let input = await Apify.getValue(inputFileName);

        const isSinglePageInput = typeCheck(PAGE_INPUT_TYPE, input);
        const isMultiPageInput = typeCheck(INPUT_TYPE, input);

        if (!isMultiPageInput && !isSinglePageInput) {
            console.log('Expected input:');
            console.log(INPUT_TYPE);
            console.log('or');
            console.log(PAGE_INPUT_TYPE);
            console.log('Received input:');
            console.dir(input);
            throw new Error('Received invalid input');
        }

        if (isMultiPageInput) {
            input.pages.forEach(page => {
                if (!typeCheck(PAGE_INPUT_TYPE, page) && !isSinglePageInput) {
                    console.log('Expected input:');
                    console.log(INPUT_TYPE);
                    console.log('Received input:');
                    console.dir(input);
                    throw new Error('Received invalid input');
                }
            });

            inputObject.pages = input.pages;
        } else if (isSinglePageInput) {
         
            inputObject.pages = [input];
        }

        inputObject.tests = input.tests || TESTS_ALL;
        // TODO: fix and verify for all possible inputs 

        return inputObject;
    } catch (err) {
        console.log("An error has okurek while reading input");
        console.log(err);
        throw err;
    }
} 


module.exports = {
    readInputAsync
};
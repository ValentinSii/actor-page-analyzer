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

async function readInputAsync(inputFileName) {

    let input = await Apify.getValue(inputFileName);

    const isSinglePageInput = typeCheck(PAGE_INPUT_TYPE, input);
    const isMultiPageInput = typeCheck(INPUT_TYPE, input);

    if (!isMultiPageInput && !isSinglePageInput) {
        console.log('Expected input:');
        console.log(INPUT_TYPE);
        console.og('or');
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
    } else if (isSinglePageInput) {
        input = {
            pages: [
                input,
            ],
        };
    }

    return input;

}


module.exports = {
    readInputAsync
};
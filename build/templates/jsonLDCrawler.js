'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = jsonLDCrawler;
function jsonLDCrawler(searchString, path) {
    const position = path.substr(1, path.substr(']'));
    const jsonLDPath = path.substr(3);
    return `
var parsedData['${searchString}'] = JSON.parse($('script[type="application/ld+json"]').get(${position}).text())${jsonLDPath}
    `;
}
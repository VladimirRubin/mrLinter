var fs = require('fs');
var http = require('https');
var utils = require('./index');
var CHECKED_DIR = require('../constants').CHECKED_DIR;


const multiloaderPromise = files => new Promise((resolve, reject) => {
    const loadNextFile = files => {
        if (files.length == 0) {
            resolve();
            return;
        }
        const file = files[0];
        const outputFilename = file.filename.split('/').slice(-1)[0];
        const fileStream = fs.createWriteStream(`${CHECKED_DIR}/${outputFilename}`);
        const requestOptions = utils.getRawGitHubOptions(file);
        const request = http.get(requestOptions, function (response) {
            response.pipe(fileStream);
            response.on('end', () => {
                files.shift();
                loadNextFile(files);
            });
        });
    };

    loadNextFile(files);
});

module.exports = multiloaderPromise;
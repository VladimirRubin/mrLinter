var fs = require('fs');
var http = require('https');
var utils = require('./index');

const multiloaderPromise = (directoryPath, files) => new Promise((resolve, reject) => {
    const loadNextFile = files => {
        if (files.length == 0) {
            console.log('All files was downloaded');
            resolve();
            return;
        }
        const file = files[0];
        const outputFilename = file.filename.split('/').slice(-1)[0];
        console.log(`Start loading ${file.filename}`);
        const fileStream = fs.createWriteStream(`${directoryPath}/${outputFilename}`);
        const requestOptions = utils.getRawGitHubOptions(file);
        const request = http.get(requestOptions, function (response) {
            response.pipe(fileStream);
            response.on('end', () => {
                console.log(`${file.filename} fully loaded`);
                files.shift();
                console.log('Start loadNextFile');
                loadNextFile(files);
            });
        });
    };

    loadNextFile(files);
});

module.exports = multiloaderPromise;
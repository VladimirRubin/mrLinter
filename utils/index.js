var parseDiff = require('parse-diff');
var https = require('https');
var fs = require('fs');
var rmdirSync = require('./rmdir');

const getFilesFromDiff = diff => parseDiff(diff);

const regExpFilter = regExp => filename => regExp.text(filename);

const getRawGithubUrl = (repositoryOwner, repositoryName, sha, filename) =>
    `https://raw.githubusercontent.com/${repositoryOwner}/${repositoryName}/${sha}/${filename}`;


fs.mkdir('checkedDir', () => {
    var file = fs.createWriteStream('checkedDir/index.js');
    var request = https.get("https://raw.githubusercontent.com/VladimirRubin/mrlinter/master/package.json", function(response) {
        response.pipe(file);
    });
    rmdirSync('checkedDir');
});

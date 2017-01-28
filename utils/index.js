var http = require('https');
var request = require('request');
var fs = require('fs');

var parseDiff = require('parse-diff');
var CLIEngine = require("eslint").CLIEngine;

var rmdirSync = require('./rmdir');

const CHECKED_DIR = 'checkedDir';

const ORGANIZATION = 'liveyourmessage';
const REPOSITORY = 'heroik-v2';
const SHA = 'master';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const PR_NUMBER = 3;

var eslintCli = new CLIEngine({
    fix: false,
    envs: [
        "node",
        "browser",
        "worker",
        "jquery"
    ],
    useEslintrc: true,
    configFile: '../.eslintrc.js',
    rules: {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
});

const getFilesFromDiff = diff => parseDiff(diff);

const regExpFilter = regExp => filename => regExp.text(filename);

const getFilePath = (repositoryOwner, repositoryName, sha, filename) =>
    `/${repositoryOwner}/${repositoryName}/${sha}/${filename}`;

const getGitHubHeaders = () => Object(
    {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
        'User-Agent': 'mrlinter',
        'content-type': 'application/json',
    }
)

const getRawGitHubOptions = filename => Object(
    {
        protocol: 'https:',
        host: 'raw.githubusercontent.com',
        path: getFilePath(ORGANIZATION, REPOSITORY, SHA, filename),
        headers: getGitHubHeaders(),
    }
);

const getGitHubFile = (url, cb) => {
    const githubRequestOptions = {
        url: url,
        headers: getGitHubHeaders(),
    };   
    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            cb(response.json());
        }
    });
};

const prepareComment = report => {
    const author = 'mrlinter';
    const commentHeader = `Hello @${author}! Thanks for submitting the PR.\n\n`;
    // const commentHeader = `Hello ${author}! Thanks for updating the PR.\n\n`;
    let commentBody = report.errorCount
        ? `- In the file [**${report.inputFilename}**], following are the ESLint issues :\n`
        : `- There are no ESLint issues in the file [**${report.inputFilename}**]\n`;
    report.results[0].messages.forEach(message => {
        commentBody += `> ${message.line}:${message.column}\terror\t${message.message}\t${message.ruleId}\n`
    });
    commentBody += "\n\n"
    return {
        header: commentHeader,
        body: commentBody,
    }
}

module.exports = {
    getGitHubFile: getGitHubFile,
    getFilesFromDiff: getFilesFromDiff,
    regExpFilter: regExpFilter,
    getFilePath: getFilePath,
    getGitHubHeaders: getGitHubHeaders,
    getRawGitHubOptions: getRawGitHubOptions,
    prepareComment: prepareComment,
}

// const inputFilename = 'editor/src/containers/main/editor/textEditors/tinyMceEditor/tinymce/tinymce.js';
// const outputFilename = inputFilename.split('/').slice(-1)[0];

// fs.mkdir(CHECKED_DIR, () => {
//     const file = fs.createWriteStream(`${CHECKED_DIR}/${outputFilename}`);
//     const requestOptions = getRawGitHubOptions(inputFilename);

//     var request = http.get(requestOptions, function (response) {
//         response.pipe(file);
//         response.on('end', () => {
//             const report = Object.assign(eslintCli.executeOnFiles([`${CHECKED_DIR}/`]), { inputFilename });
//             if (report.errorCount > 0) {
//                 console.log('Have errors\n');
//             };
//             const comment = prepareComment(report);
//             const commentText = comment.header + comment.body;

//             const commentRequestOptions = {
//                 protocol: 'https:',
//                 host: 'api.github.com',
//                 method: 'POST',
//                 path: `/repos/${ORGANIZATION}/${REPOSITORY}/issues/${PR_NUMBER}/comments`,
//                 headers: getGitHubHeaders(),
//             }
//             var req = http.request(commentRequestOptions, function (res) {
//                 var chunks = [];
//                 res.on("data", function (chunk) {
//                     chunks.push(chunk);
//                 });
//                 res.on("end", function () {
//                     var body = Buffer.concat(chunks);
//                     console.log(body.toString());
//                 });
//             });
//             req.write(JSON.stringify({ body: commentText }));
//             req.end();
//             rmdirSync('checkedDir');
//         });
//     });
// });

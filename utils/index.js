var http = require('https');
var request = require('request');
var fs = require('fs');

var parseDiff = require('parse-diff');
var CLIEngine = require("eslint").CLIEngine;

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

const checkEslint = pathList => {
    return eslintCli.executeOnFiles(pathList);
}

const getFilesFromDiff = diff => parseDiff(diff);

const regExpFilter = regExp => filename => regExp.test(filename);

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

const getRawGitHubOptions = opts => Object(
    {
        protocol: 'https:',
        host: 'raw.githubusercontent.com',
        path: getFilePath(opts.owner, opts.repository, opts.sha, opt.filename),
        headers: getGitHubHeaders(),
    }
);

const getGitHubFilePromise = url => new Promise((resolve, reject) => {
    const githubRequestOptions = {
        url: url,
        headers: getGitHubHeaders(),
    };
    if (url.includes('.diff')) {
        githubRequestOptions['Accept'] = 'application/vnd.github.v3.diff';
    }
    request(githubRequestOptions, (error, response, body) => {
        const statusCode = response.statusCode;
        console.log('Headers: ', response.headers);
        if (statusCode === 200) {
            resolve(body);
        } else {
            if (statusCode === 301 && response.headers.location) {
                resolve(getGitHubFilePromise(response.headers.location));
            } else {
                reject(statusCode);
            }
        }
    });
});

const prepareComment = (report, author) => {
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
    getGitHubFilePromise: getGitHubFilePromise,
    getFilesFromDiff: getFilesFromDiff,
    regExpFilter: regExpFilter,
    getFilePath: getFilePath,
    getGitHubHeaders: getGitHubHeaders,
    getRawGitHubOptions: getRawGitHubOptions,
    checkEslint: checkEslint,
    prepareComment: prepareComment,
}

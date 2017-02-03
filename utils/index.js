var http = require('https');
var request = require('request');
var fs = require('fs');

var parseDiff = require('parse-diff');
var CLIEngine = require("eslint").CLIEngine;
const CHECKED_DIR = require('../constants').CHECKED_DIR;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';


var eslintCli = new CLIEngine({
    fix: false,
    envs: [
        "node",
        "browser",
        "worker",
        "jquery"
    ],
    baseConfig: {
        extends: ["airbnb"],
    },
    rules: {
        "new-cap": [
            2,
            {
                "capIsNewExceptions": [
                    "FluxMixin",
                    "StoreWatchMixin"
                ]
            }
        ],
        "react/prefer-es6-class": 0,
        "react/no-deprecated": 0,
        "react/no-find-dom-node": 0,
        "global-require": 0,
        "import/no-webpack-loader-syntax": 0,
        "react/jsx-filename-extension": [1, {
            "extensions": [".js", ".jsx"]
        }],
        "import/no-extraneous-dependencies": 0,
        "import/no-unresolved": 0,
        "jsx-a11y/href-no-hash": 0
    },
    "parser": "babel-eslint",
    "parserOptions": {
        "ecmaVersion": 6,
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true
        }
    },
    "globals": [
        "_",
        "tinymce",
        "jsonh",
        "compileSectionData",
        "dataprebuiltId",
        "autoresponderStatus",
        "MagicWand",
        "tinyMCE",
        "FB"
    ]
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
        path: getFilePath(opts.owner, opts.repository, opts.sha, opts.filename),
        headers: getGitHubHeaders(),
    }
);

const getGitHubFilePromise = (url, mediaType = 'application/vnd.github.v3.raw') => new Promise((resolve, reject) => {
    const githubRequestOptions = {
        url: url,
        headers: getGitHubHeaders(),
    };
    githubRequestOptions.headers['Accept'] = mediaType;
    request(githubRequestOptions, (error, response, body) => {
        const statusCode = response.statusCode;
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

const prepareComment = (report, author, filePath) => {
    const commentHeader = `Hello @${author}! Thanks for submitting the PR.\n\n`;
    // const commentHeader = `Hello ${author}! Thanks for updating the PR.\n\n`;
    let commentBody = '';
    if (report.errorCount) {
        console.log(`Report have the ${report.errorCount} errors in ${report.results.length} files`);
        report.results.forEach((result, resultIndex) => {
            const resultFilename = filePath[result.filePath.split('/').slice(-1)];
            console.log(`Start processing ${resultIndex + 1} result of ${report.results.length} for ${resultFilename}`);
            let resultCommentPart = result.errorCount
                ? `- In the file [**${resultFilename}**], following are the ESLint issues :\n`
                : `- There are no ESLint issues in the file [**${resultFilename}**]\n`;
            result.messages.forEach((message, messageIndex) => {
                console.log(`Start processing ${messageIndex + 1} of ${result.messages.length} message of ${resultFilename}`)
                resultCommentPart += `> ${message.line}:${message.column}\t${message.message}\t${message.ruleId}\n`
            });
            commentBody += `${resultCommentPart}\n\n`
        })
    }
    return {
        header: commentHeader,
        body: commentBody,
    }
}

const getCheckedDirName = requestId => `${CHECKED_DIR}-${requestId}`; 


module.exports = {
    getGitHubFilePromise: getGitHubFilePromise,
    getFilesFromDiff: getFilesFromDiff,
    regExpFilter: regExpFilter,
    getFilePath: getFilePath,
    getGitHubHeaders: getGitHubHeaders,
    getRawGitHubOptions: getRawGitHubOptions,
    checkEslint: checkEslint,
    prepareComment: prepareComment,
    getCheckedDirName: getCheckedDirName,
}

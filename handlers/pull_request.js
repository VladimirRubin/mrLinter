var fs = require('fs');
var http = require('https');
var utils = require('../utils');
var rmdirSync = require('../utils/rmdir');
var CHECKED_DIR = require('../constants').CHECKED_DIR;
var multiloaderPromise = require('../utils/multiLoader');

var pull_request_handler = function (data) {
    var result = {};
    console.log('GitHub Action is: ', data.action);
    if (['synchronize', 'opened', 'reopened'].indexOf(data.action) > -1) {
        result = {
            after_commit_hash: data.pull_request.head.sha,
            owner: data.repository.owner.login,
            repository: data.repository.name,
            author: data.pull_request.user.login,
            diff_url: data.pull_request.diff_url,
            results: {},
            extra_results: {},
            pr_number: data.number,
        }
        // Get differences
        utils.getGitHubFilePromise(`https://api.github.com/repos/${result.owner}/${result.repository}/pulls/${result.pr_number}`, 'application/vnd.github.v3.diff')
            .then(fileData => {
                // Check PEP8, ESLint
                const filesToCheck = utils.getFilesFromDiff(fileData).map(file => file.to);
                const onlyJsFileList = filesToCheck.filter(utils.regExpFilter(/.js/));
                console.log('Go to checked next files: ', onlyJsFileList);
                const onlyJsFiles = onlyJsFileList.map(file => Object({
                    owner: result.owner,
                    repository: result.repository,
                    sha: result.after_commit_hash,
                    filename: file,
                }));
                fs.mkdir(CHECKED_DIR, () => {
                    multiloaderPromise(onlyJsFiles)
                        .then(() => {
                            console.log('Processing ESLint report');
                            const report = utils.checkEslint([`${CHECKED_DIR}/`]);
                            console.log('Report successfuly created');
                            const comment = utils.prepareComment(report, result.author);
                            const commentText = comment.header + comment.body;
                            // Send Message
                            const commentRequestOptions = {
                                protocol: 'https:',
                                host: 'api.github.com',
                                method: 'POST',
                                path: `/repos/${result.owner}/${result.repository}/issues/${result.pr_number}/comments`,
                                headers: utils.getGitHubHeaders(),
                            }
                            var req = http.request(commentRequestOptions, res => {
                                res.on('end', rmdirSync(CHECKED_DIR));
                            });
                            req.write(JSON.stringify({ body: commentText }));
                            req.end();
                        });
                });
            })
            .catch(e => console.error(`Error: ${e}`));
    }
    return result;
}

module.exports.pull_request_handler = pull_request_handler; 
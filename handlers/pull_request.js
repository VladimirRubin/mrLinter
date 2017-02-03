var fs = require('fs');
var http = require('https');
var utils = require('../utils');
var rmdirSync = require('../utils/rmdir');
var multiloaderPromise = require('../utils/multiLoader');

var pull_request_handler = function (request) {
    var result = {};
    const data = request.body;
    const checkedDir = utils.getCheckedDirName(request.id);
    console.log('GitHub Action is: ', data.action);
    if (['synchronize', 'opened', 'reopened', 'edited'].indexOf(data.action) > -1) {
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
                const filePath = filesToCheck.reduce((acc, curr) => { acc[curr.split('/').slice(-1)] = curr; return acc }, {})
                fs.mkdir(checkedDir, () => {
                    multiloaderPromise(checkedDir, onlyJsFiles)
                        .then(() => {
                            console.log('Processing ESLint report');
                            const report = utils.checkEslint([`${checkedDir}/`]);
                            console.log('Report successfuly created');
                            const comment = utils.prepareComment(report, result.author, filePath);
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
                                res.on('end', () => rmdirSync(checkedDir));
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
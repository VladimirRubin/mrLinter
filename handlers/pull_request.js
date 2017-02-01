var fs = require('fs');
var http = require('https');
var utils = require('../utils');
var rmdirSync = require('../utils/rmdir');

const CHECKED_DIR = 'checkedDir';

var pull_request_handler = function (data) {
    var result = {};
    console.log('GitHub Action is: ', data.action);
    if (['synchronize', 'opened', 'reopened'].indexOf(data.action) >= -1) {
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
                const onlyJsFiles = filesToCheck.filter(utils.regExpFilter(/.js/));
                console.log('Go to checked next files: ', onlyJsFiles);
                fs.mkdir(CHECKED_DIR, () => {
                    onlyJsFiles.forEach(file => {
                        console.log('Start downloading ', file);
                        const outputFilename = file.split('/').slice(-1)[0];
                        const fileStream = fs.createWriteStream(`${CHECKED_DIR}/${outputFilename}`);
                        const requestOptions = utils.getRawGitHubOptions({
                            owner: result.owner,
                            repository: result.repository,
                            sha: result.after_commit_hash,
                            filename: file,
                        });
                        const request = http.get(requestOptions, function (response) {
                            response.pipe(fileStream);
                            response.on('end', () => {
                                console.log(file, ' fully load');
                                // Prepare message
                                console.log(`Processing report to ${CHECKED_DIR}/${outputFilename}`);
                                const report = utils.checkEslint([`${CHECKED_DIR}/${outputFilename}`]);
                                report.inputFilename = file;
                                console.log(outputFilename, ' report processing complete: ', report);
                                const comment = utils.prepareComment(report, result.author);
                                const commentText = comment.header + comment.body;
                                console.log(outputFilename , ' comment is ready: ', commentText);
                                // Send Message
                                // const commentRequestOptions = {
                                //     protocol: 'https:',
                                //     host: 'api.github.com',
                                //     method: 'POST',
                                //     path: `/repos/${result.owner}/${result.repository}/issues/${result.pr_number}/comments`,
                                //     headers: utils.getGitHubHeaders(),
                                // }
                                // var req = http.request(commentRequestOptions, res => {});
                                // req.write(JSON.stringify({ body: commentText }));
                                // req.end();
                                rmdirSync(CHECKED_DIR);
                            });
                        });
                    });
                });

            })
            .catch(e => console.error(`Error: ${e}`));
    }
    return result;
}

module.exports.pull_request_handler = pull_request_handler; 
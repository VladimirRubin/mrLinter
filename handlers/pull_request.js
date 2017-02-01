var fs = require('fs');
var http = require('https');
var utils = require('../utils');
var rmdirSync = require('../utils/rmdir');

const CHECKED_DIR = 'checkedDir';

var pull_request_handler = function (data) {
    var result = {};
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
        console.log(result.diff_url);
        utils.getGitHubFilePromise(result.diff_url)
            .then(fileData => {
                // Check PEP8, ESLint
                const filesToCheck = utils.getFilesFromDiff(fileData).map(file => file.to);
                const onlyJsFiles = filesToCheck.filter(utils.regExpFilter(/.js/));
                fs.mkdir(CHECKED_DIR, () => {
                    onlyJsFiles.forEach(file => {
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
                                // Prepare message
                                const report = Object.assign(utils.checkEslint([`${CHECKED_DIR}/${outputFilename}`], { inputFilename: file }));
                                const comment = utils.prepareComment(report);
                                const commentText = comment.header + comment.body;
                                // Send Message
                                const commentRequestOptions = {
                                    protocol: 'https:',
                                    host: 'api.github.com',
                                    method: 'POST',
                                    path: `/repos/${result.owner}/${result.repository}/issues/${result.pr_number}/comments`,
                                    headers: utils.getGitHubHeaders(),
                                }
                                var req = http.request(commentRequestOptions, function (res) {
                                    var chunks = [];
                                    res.on("data", function (chunk) {
                                        chunks.push(chunk);
                                    });
                                    res.on("end", function () {
                                        var body = Buffer.concat(chunks);
                                        console.log(body.toString());
                                    });
                                });
                                req.write(JSON.stringify({ body: commentText }));
                                req.end();
                                rmdirSync(CHECKED_DIR);
                            });
                        });
                    });
                });

            })
            .catch(e => console.error(e));
    }
    return result;
}

module.exports.pull_request_handler = pull_request_handler; 
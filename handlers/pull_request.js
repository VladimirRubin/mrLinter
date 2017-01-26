var pull_request_handler = function(data){
    var result = {};
    console.log('Pull datauest Handler', data);
    if (['synchronize', 'opened', 'reopened'].indexOf(data.action) >= -1) {
        result = {
            "after_commit_hash": data.pull_request.head.sha,
            "repository": data.repository.full_name,
            "author": data.json.pull_request.user.login,
            "diff_url": data.json.pull_request.diff_url,
            "results": {},
            "extra_results": {},
            "pr_number": data.json.number,
        }
        // Only check our PR hook
        // TODO: Check PEP8, ESLint
        // TODO: Send Message
        // TODO: Response 200
    }
    return result;
}

module.exports.pull_request_handler = pull_request_handler; 
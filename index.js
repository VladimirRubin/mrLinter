var http = require('http');
var router = require('http-router');
var routes = router.createRouter();
var url = require('url');
var handlers = require('./handlers');

routes
    .get('/', function (req, res, next) {
        return next();
    })
    .post('/', function (req, res, next) {
        // TODO: check signatures
        var body = '';
        req.on('data', function(chunk) {
            body += chunk;
        });
        req.on('end', function() {
            var data = JSON.parse(body);
            var event = req.headers['x-github-event'];
            switch(event){
                case 'pull_request': handlers.pull_request_handler(data);
                case 'pull_request_review': break;
                case 'pull_request_review_comment': break;
                default: break;
            }
        });
        res.end(http.STATUS_CODES[200] + '\n');
    })
    .get(function (req, res, next) {
        res.writeHead(404);
        return next();
    })
    .get(function (req, res, next) {
        res.end(http.STATUS_CODES[404] + '\n');
    });

http.createServer(function (req, res) {
    if (!routes.route(req, res)) {
        res.writeHead(501);
        res.end(http.STATUS_CODES[501] + '\n');
    }
}).listen(3000);
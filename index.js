var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var handlers = require('./handlers');

app.set('port', (process.env.PORT || 3000));

app.use( express.static(__dirname + '/public') );
app.use( bodyParser.json() );

app.get('/', function(req, res) {
    res.sendStatus(200)
});

app.post('/', function(req, res) {
    console.log(req.body);
    var event = req.headers['x-github-event'];
    switch(event){
        case 'pull_request': handlers.pull_request_handler(req.body);
        case 'pull_request_review': break;
        case 'pull_request_review_comment': break;
        default: break;
    }
    res.sendStatus(200)
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

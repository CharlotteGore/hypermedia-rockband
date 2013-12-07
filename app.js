
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


require('./shared/store').Store({ db : 'hyperdev'}, function (err, db){

	require('./features/drummachines/handlers/drum.js').handler( app, db);
	require('./features/synths/handlers/synth.js').handler( app, db);

});

app.get('/api', function(req, res){

	res.send(200, {
		_links : {
			"create-drum" : {
				href : "/create-drum-machine"
			},
			"create-synth" : {
				href : '/create-synth'
			}
		}
	});
});

http.createServer(app).listen(app.get('port'), function (){
  console.log('Express server listening on port ' + app.get('port'));
});

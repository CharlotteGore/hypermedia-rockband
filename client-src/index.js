// making this global so I can play with it...
window.Model = require('hyperbone-model-with-io').Model;

var View = require('hrb-extended-view-engine').View;
var Router = require('hyperbone-router').Router;

// get a reference to beat master so we can stop any songs playing
// every time the route changes
var beatMaster = require('beat-master');

// one model for the application, with a model for each route. 
// These are "route models". 
// have exposed this to the global scope on purpose for 
// playing around.
window.app = new Model({
	songList : require('song-list'),
	song : require('song'),
	previewSynth : require('preview-synth'),
	previewDrum : require('preview-drum')
});

// initialise our view now. Give it the data we need later.
new View({
	model : app,
	el : document.getElementById('hypermedia-rockband')
});

// create a dodgy router. It's rubbish but it supports
// a few conventions that are pretty helpful, like automatically
// toggling an 'active' flag on any model we pass into it.
var router = new Router();

router
	.route('/songs', app.get('songList'))
		.on('activate', function (ctx, uri){
			// stop any music playing..
			beatMaster.off().stop();

			// route boilerplate...
			var songList = app.get('songList');
			songList
				.url( uri )
				.set({
					loading : true,
					loaded : false
				})
				.fetch();
		})
	.route('/song/:slug', app.get('song'))
		.on('activate', function (ctx, uri){

			// stop any songs playing...
			beatMaster.off().stop();

			// route boilerplate
			var song = app.get('song');
			song
				.url( uri )
				.set({
					loading : true,
					loaded : false
				})
				.fetch();
		})
	.route('/preview-drum/*', app.get('previewDrum'))
		.on('activate', function (ctx, uri){

			// stop any songs playing...
			beatMaster.off().stop();

			// route boilerplate...

			// Bug in the routing thing means it isnt passing the 
			// matched params so need to do some mungling of the uri
			// to get the correct uri
			var previewDrum = app.get('previewDrum');
			previewDrum
				.url( uri.replace('/preview-drum', '') )
				.set({
					'samples-loaded' : false, // reset any stored samples
					loading: true,
					loaded : false
				})
				.fetch();

		})
	.route('/preview-synth/*', app.get('previewSynth'))
		.on('activate', function(ctx, uri){

			// stop any songs playing...
			beatMaster.off().stop();

			// route boilerplate...

			// Bug in the routing thing means it isn't passing the 
			// matched params so need to do some mungling of the uri
			// to get the correct url
			var previewSynth = app.get('previewSynth');
			previewSynth
				.url( uri.replace('/preview-synth', '') )
				.set({
					loading: true,
					loaded : false
				})
				.fetch();
		})
	.route('')
		// generic route handler, redirect to songs...
		.on('activate', function(){
			router.navigateTo('/songs')
		})
	// and begin listening for routes...
	.listen();
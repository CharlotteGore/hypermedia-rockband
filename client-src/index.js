var Model = require('hyperbone-model-with-io').Model;
var View = require('hrb-extended-view-engine').View;
var Router = require('hyperbone-router').Router;

// set up some basic Models here. Eventually they'll get shoved off into their own modules.

var Instrument = Model.extend({
	syncCommands : true
});


// one model for each route. These are route models.
window.app = new Model({
	songList : require('song-list'),
	song : require('song'),
	previewSynth : new Instrument(),
	previewDrum : new Instrument()
});

// initialise our view now. Give it the data we need later.
new View({
	model : app,
	el : document.getElementById('hypermedia-rockband')
});

var router = new Router();

router
	.route('/songs', app.get('songList'))
		.on('activate', function (ctx, uri){

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

			var song = app.get('song');

			song
				.url( uri )
				.set({
					loading : true,
					loaded : false
				})
				.fetch()
		})
	.route('/drummachine/:slug', app.get('previewDrum'))
		.on('activate', function (ctx, uri){

			var previewDrum = app.get('previewDrum');

			previewDrum
				.url( uri )
				.set({
					loading: true,
					loaded : false
				})
				.fetch()

		})
	.route('/synth/:slug', app.get('previewSynth'))
		.on('activate', function(ctx, uri){

			var previewSynth = app.get('previewSynth');

			previewSynth
				.url(uri)
				.set({
					loading: true,
					loaded : false
				})
				.fetch();
		})
	.route('')
		.on('activate', function(){
			router.navigateTo('/songs')
		})
	.listen();
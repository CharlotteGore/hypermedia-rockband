var Model = require('hyperbone-model-with-io').Model;
var View = require('hrb-extended-view-engine').View;
var Router = require('hyperbone-router').Router;

var beatMaster = require('beat-master');

// set up some basic Models here. Eventually they'll get shoved off into their own modules.

var Instrument = Model.extend({
	syncCommands : true
});


// one model for each route. These are route models.
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

var router = new Router();

router
	.route('/songs', app.get('songList'))
		.on('activate', function (ctx, uri){

			beatMaster.off().stop();

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

			beatMaster.off().stop();

			var song = app.get('song');

			song
				.url( uri )
				.set({
					loading : true,
					loaded : false
				})
				.fetch()
		})
	.route('/preview-drum/*', app.get('previewDrum'))
		.on('activate', function (ctx, uri){

			beatMaster.off().stop();

			var previewDrum = app.get('previewDrum');

			previewDrum
				.url( uri.replace('/preview-drum', '') )
				.set({
					'samples-loaded' : false,
					loading: true,
					loaded : false
				})
				.fetch()

		})
	.route('/preview-synth/*', app.get('previewSynth'))
		.on('activate', function(ctx, uri){

			beatMaster.off().stop();

			var previewSynth = app.get('previewSynth');

			previewSynth
				.url( uri.replace('/preview-synth', '')  )
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
var Song = require('../models/song.js').Song;
var SongHypermedia = require('../hypermedia/song.js').SongHypermedia;

var songs = {};
var hypermediaCache = {};

module.exports.handler = function (app, store){

	var loadSongBySlug = function (req, res, next){

		var song;

		if(!hypermediaCache[req.params.slug]){

			song = new Song({slug : req.params.slug}, store);

			song.load(function(err,song){

				if (!err && song){

					songs[req.params.slug] = song;
					hypermediaCache[req.params.slug] = new SongHypermedia( song );

					next();

				} else {

					res.status(404);
					res.send({
						message : "Sorry, can't find any existing song for /song/" + req.params.slug
					});
				}

			});

		} else {
			next();
		}

	};

	// return a drum to the user...
	var getSong = function (req, res){

		hypermediaCache[req.params.slug].ok( req, res );

	};

	// update the drum's style
	var updateSongSettings = function (req, res){

		// get our refs
		var media = hypermediaCache[req.params.slug];
		var song = songs[req.params.slug];

		if (!req.body.etag){

			media.notAcceptable('Must have an etag', req, res);

		} else if( req.body.etag !== song.get('etag')){

			media.conflict('You have attempted to edit and outdated version of the resource', req, res);

		} else {

			var err = song.updateSettings(req.body);

			if(!err){

				song.save(function(err, drum){
					if(!err){

						media.accepted('Settings updated', req, res);
					
					} else {
						
						media.error('Unknown error has occured attempting to save your changes', req, res);
					}

				});

			} else {

				media.notAcceptable(err, req, res);

			}
		}
	};

	var addInstrument = function (req, res){

		var song = songs[req.params.slug];
		var media = hypermediaCache[req.params.slug];

		if (!req.body.etag){

			media.notAcceptable('Must have an etag', req, res);

		} else if( req.body.etag !== song.get('etag')){

			media.conflict('You have attempted to edit and outdated version of the resource', req, res);

		} else {

			song.addInstrument(req.params.instrument, function(err, data){

				if(!err){
					media.accepted('Instrument added', req, res);
				} else {
					media.error('A mysterious and terrifying error has occured' + err, req, res);
				}

			});

		}

	};


	app.get('/song/:slug', loadSongBySlug, getSong);

	app.put('/song/:slug/update-settings', loadSongBySlug, updateSongSettings );

	app.post('/song/:slug/add/:instrument', loadSongBySlug, addInstrument);

};

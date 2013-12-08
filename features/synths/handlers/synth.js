var Synth = require('../models/synth.js').Synth;
var SynthHypermedia = require('../hypermedia/synth.js').SynthHypermedia;

var synths = {};
var hypermediaCache = {};

module.exports.handler = function (app, store){

	var loadSynthBySlug = function (req, res, next){

		var synth;

		if(!hypermediaCache[req.params.slug]){

			synth = new Synth({slug : req.params.slug}, store);

			synth.load(function(err, synth){

				if(!err && synth){

					synths[req.params.slug] = synth;
					hypermediaCache[req.params.slug] = new SynthHypermedia( synth );

					next();

				} else {

					res.status(404);
					res.send({
						message : "Sorry, can't find any existing synth for /synth/" + req.params.slug
					});
				}

			});

		} else {
			next();
		}

	};

	// return a drum to the user...
	var getSynth = function (req, res){

		hypermediaCache[req.params.slug].ok( req, res );

	};

	// update the drum's style
	var updateSynthSettings = function (req, res){

		// get our refs
		var media = hypermediaCache[req.params.slug];
		var synth = synths[req.params.slug];

		if (!req.body.etag){

			media.notAcceptable('Must have an etag', req, res);

		} else if( req.body.etag !== synth.get('etag')){

			media.conflict('You have attempted to edit and outdated version of the resource', req, res);

		} else {

			var err = synth.updateSettings(req.body);

			if(!err){

				synth.save(function(err, drum){
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

	var updateTracker = function (req, res){

		// get our refs
		var media = hypermediaCache[req.params.slug];
		var synth = synths[req.params.slug];

		if (!req.body.etag){

			media.notAcceptable('Must have an etag', req, res);

		} else if( req.body.etag !== synth.get('etag')){

			media.conflict('You have attempted to edit and outdated version of the resource', req, res);

		} else {

			var err = synth.updateTracker(req.body);

			if(!err){

				synth.save(function(err, drum){
					if(!err){

						media.accepted('Tracker updated', req, res);
					
					} else {
						
						media.error('Unknown error has occured attempting to save your changes', req, res);
					}

				});

			} else {

				media.notAcceptable(err, req, res);

			}
		}


	};

	app.get('/synth/:slug', loadSynthBySlug, getSynth);

	app.put('/synth/:slug/update-settings', loadSynthBySlug, updateSynthSettings );

	app.put('/synth/:slug/update-tracker', loadSynthBySlug, updateTracker );

	app.post('/create-synth', function(req, res){

		var synth = new Synth({ song : 'unknown'}, store, "nolisten");

		synth.save(function(err, data){

			var media = new SynthHypermedia( synth );

			media.created("Synth successfully created", req, res);

		});

	});

};

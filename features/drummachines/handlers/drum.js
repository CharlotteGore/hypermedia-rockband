var _ = require('underscore');

var Drum = require('../models/drum.js').DrumMachine;
var DrumHypermedia = require('../hypermedia/drum.js').DrumMachineHypermedia;

var drums = {};
var hypermediaCache = {};

module.exports.handler = function (app, store){

	var loadDrumBySlug = function (req, res, next){

		var drum;

		if(!hypermediaCache[req.params.slug]){

			drum = new Drum({slug : req.params.slug}, store);

			drum.load(function(err, drum){

				if(!err && drum){

					drums[req.params.slug] = drum;
					hypermediaCache[req.params.slug] = new DrumHypermedia( drum );

					next();

				} else {
					res.status(404);
					res.send({
						message : "Sorry, can't find any existing synth for /drummachine/" + req.params.slug
					});
				}

			});

		} else {
			next();
		}

	};

	// return a drum to the user...
	var getDrum = function (req, res){

		hypermediaCache[req.params.slug].ok( req, res );
	};

	// update the drum's style
	var setDrumStyle = function (req, res){

		// get our refs
		var media = hypermediaCache[req.params.slug];
		var drum = drums[req.params.slug];

		if (!req.body.etag || !req.body.style){

			media.notAcceptable('Must have an etag and style', req, res);

		} else if( req.body.etag !== drum.get('etag')){

			media.conflict('You have attempted to edit and outdated version of the resource', req, res);

		} else {

			if( drum.setStyle(req.body.style) ){

				drum.save(function(err, drum){
					if(!err){

						media.accepted('Style updated', req, res);
					
					} else {
						
						media.error('Unknown error has occured attempting to save your changes', req, res);
					}

				});

			} else {

				media.notAcceptable('Invalid value for style', req, res);

			}
		}
	};

	var updatePattern = function (req, res){

		var media = hypermediaCache[req.params.slug];
		var drum = drums[req.params.slug];
		var forDrum = "";
		var pattern;

		if (req.params.drum && req.params.drum !== "pattern"){

			forDrum = req.params.drum;
			pattern = req.body[forDrum];

			console.log(forDrum, pattern);

		} else if (req.body.drum){

			forDrum = req.body.drum;
			pattern = req.body.pattern;

		} else {
			media.notAcceptable('Must have a drum to apply the pattern to', req, res);
		}

		if(!req.body.etag){
			media.notAcceptable('No etag in the body, unable to determine which version of the resource being edited', req, res);
		}

		if(req.body.etag !== drum.get('etag')){
			media.conflict("You have attempted to edit an outdated version of the resource", req, res);
		}

		var err = drum.updatePattern(forDrum, pattern);

		if(err){

			media.notAcceptable(err, req, res);

		} else {

			drum.save(function(err, data){

				if(!err){
					media.accepted('Pattern (' + forDrum + ') updated', req, res);
				} else {
					media.error('Unknown error has occured attempting to save your changes', req, res);
				}

			});

		}

	};

	app.get('/drummachine/:slug', loadDrumBySlug, getDrum);

	app.put('/drummachine/:slug/change-style', loadDrumBySlug, setDrumStyle);

	app.put('/drummachine/:slug/update-:drum', loadDrumBySlug, updatePattern);

	app.post('/create-drum-machine', function(req, res){

		var drum = new Drum({ song : 'unknown'}, store);

		drum.save(function(err, data){

			var media = new DrumHypermedia( drum );

			media.created("Drum machine successfully created", req, res);

		});

	});

};

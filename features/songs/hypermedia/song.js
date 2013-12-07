var _ = require('underscore');

var DrumHypermedia = require('../../drummachines/hypermedia/drum.js').DrumMachineHypermedia;
var SynthHypermedia = require('../../synths/hypermedia/synth.js').SynthHypermedia;

var SongHypermedia = function (song){

	this.song = song;
	this.slug = song.get('slug');

	this.currentVersion = "";
	this._media = {};

};

SongHypermedia.prototype = {

	makeGenericResponse: function( message, req, res ){

		res.send({
			_links : {
				'song' : {
					href : '/song/' + this.song.get('slug')
				}
			},
			message : message
		});

	},

	ok : function (req, res){

		// has the drum updated? 
		if (this.currentVersion !== this.song.get('etag')){
			this.updateProjection();
			this.currentVersion = this.song.get('etag');
		}

		res.set('ETag', this.currentVersion);

		if (req.headers['if-none-match'] !== this.currentVersion){

			res.send(200, this._media);

		} else {

			res.send(304);

		}

		return this;

	},

	notAcceptable : function (message, req, res){

		res.status(406);
		this.makeGenericResponse(message, req, res);

	},

	conflict : function (message, req, res){

		res.status(409);
		this.makeGenericResponse(message, req, res);

	},

	accepted : function (message, req, res){

		res.status(202);
		this.makeGenericResponse(message, req, res);

	},

	created : function (message, req, res){

		res.status(201);
		this.makeGenericResponse(message, req, res);

	},

	error : function (message, req, res){

		res.status(500);
		this.makeGenericResponse(message, req, res);
	},

	embedded : function (){

		if(!this._media){
			this.updateProjection();
		}
		return this._media;

	},

	updateProjection : function (){

		var self = this;

		var get = function(val){return self.song.get(val);};

		var baseUri = "/song/" + get('slug');
		var etag = get('etag');

		this._media = {
			"_links": {
				"self": {
					"href": baseUri
				},
				"song": {
					"href": '/song/' + get('song')
				},
				"curies" : [
					{
						name : 'cmd',
						templated : true,
						href : '/commands/songs/rels/{rel}'
					}
				],
				"cmd:add-electro-drum-machine" : {
					href : baseUri + "/add/electro"
				},
				"cmd:add-rock-drum-machine" : {
					href : baseUri + "/add/rock"
				},
				"cmd:add-lead-synth" : {
					href : baseUri + "/add/lead"
				},
				"cmd:add-bass-synth" : {
					href : baseUri + "/add/bass"
				},
			},
			"_commands": {
				"add-electro-drum-machine" : {
					"href" : baseUri + "/add/electro",
					"method" : "POST",
					"properties" : {
						"etag" : get('etag')
					},
					"schema" : {
						"etag" : "hidden"
					}
				},
				"add-rock-drum-machine" : {
					"href" : baseUri + "/add/rock",
					"method" : "POST",
					"properties" : {
						"etag" : get('etag')
					},
					"schema" : {
						"etag" : "hidden"
					}
				},
				"add-lead-synth" : {
					"href" : baseUri + "/add/lead",
					"method" : "POST",
					"properties" : {
						"etag" : get('etag')
					},
					"schema" : {
						"etag" : "hidden"
					}
				},
				"add-bass-synth" : {
					"href" : baseUri + "/add/bass",
					"method" : "POST",
					"properties" : {
						"etag" : get('etag')
					},
					"schema" : {
						"etag" : "hidden"
					}
				},
				"update-settings" : {
					"href" : baseUri + "/update-settings",
					"method" : "PUT",
					"properties" : {
						"name" : get('name'),
						"bpm" : get('bpm'),
						"etag" : etag

					},
					"schema" : this.song.schema.settings
				}
			},
			"etag" : get('etag'),
			"name" : get('name'),
			"bpm" : get('bpm'),
			"time-signature" : "4/4",
			"instruments" : get('instruments'),
			_embedded : {
				'drummachine' : [],
				'synth' : []
			}
		};

		_.each(this.song.drums, function (drum){

			var hypermedia = new DrumHypermedia(drum);

			self._media._embedded.drummachine.push( hypermedia.updateProjection().embedded() );

		});

		_.each(this.song.synths, function (synth){

			var hypermedia = new SynthHypermedia(synth);

			self._media._embedded.synth.push( hypermedia.updateProjection().embedded() );

		});

		return this;

	}
};

module.exports.SongHypermedia = SongHypermedia;
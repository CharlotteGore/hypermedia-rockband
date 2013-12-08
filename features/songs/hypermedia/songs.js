var _ = require('underscore');

var SongHypermedia = require('./song.js').SongHypermedia;

var SongsHypermedia = function (songs){

	this.songs = songs;

	this.currentVersion = "";
	this._media = {};

	return this;

};

SongsHypermedia.prototype = {

	makeGenericResponse: function( message, req, res ){

		res.send({
			_links : {
				'songs' : {
					href : '/songs'
				}
			},
			message : message
		});

	},

	ok : function (req, res){

		// has the drum updated? 
		if (this.currentVersion !== this.songs.etag){
			this.updateProjection();
			this.currentVersion = this.songs.etag;
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

		var baseUri = "/songs";
		var etag = this.songs.etag;

		this._media = {
			"_links": {
				"self": {
					"href": baseUri
				},
				"curies" : [
					{
						name : 'cmd',
						templated : true,
						href : '/commands/rels/{rel}'
					}
				],
				"cmd:add-song" : {
					href : baseUri + "/add-song"
				}
			},
			"_commands": {
				"add-song" : {
					"href" : baseUri + "/add-song",
					"method" : "POST",
					"properties" : {
						"bpm" : 120,
						"name" : "Untitled"
					},
					"schema" : {
						"bpm" : {
							"type" : "range",
							"min" : 60,
							"max" : 180
						},
						"name" : {
							"type" : "string"
						}
					}
				},

			},
			"etag" : etag,
			"song-count" : this.songs.songs.length,
			"_embedded" : {
				'song' : []
			}
		};

		_.each(this.songs.songs, function (song){

			var hypermedia = new SongHypermedia(song).embedded();

			this._media._embedded.song.push( hypermedia );

		}, this);

		return this;

	}
};

module.exports.SongsHypermedia = SongsHypermedia;
var SynthHypermedia = function (synth){

	this.synth = synth;
	this.slug = synth.get('slug');

	this.currentVersion = "";
	this._media = false;

};

SynthHypermedia.prototype = {

	makeGenericResponse: function( message, req, res ){

		res.send({
			_links : {
				'synth' : {
					href : '/synth/' + this.synth.get('slug')
				}
			},
			message : message
		});

	},

	ok : function (req, res){

		// has the drum updated? 
		if (this.currentVersion !== this.synth.get('etag')){
			this.updateProjection();
			this.currentVersion = this.synth.get('etag');
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

		var get = function(val){return self.synth.get(val);};

		var baseUri = "/synth/" + get('slug');
		var etag = this.synth.get('etag');

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
						href : '/commands/synths/rels/{rel}'
					}
				],
				"cmd:update-settings" : {
					href : baseUri + "/update-settings"
				},
				"cmd:update-tracker" : {
					href : baseUri + "/update-tracker"
				}
			},
			"_commands": {
				"update-settings": {
					"href": baseUri + "/update-settings",
					"method": "PUT",
					"properties": {
						"waveform": get('waveform'),
						"filter-frequency": get('filter-frequency'),
						"filter-kbd-follow": get('filter-kbd-follow'),
						"filter-resonance": get('filter-resonance'),
						"attack": get('attack'),
						"decay": get('decay'),
						"sustain": get('sustain'),
						"release": get('release'),
						"volume" : get('volume'),
						"etag" : get('etag')
					},
					"schema": this.synth.schema.settings
				},
				"update-tracker" : {
					"href" : baseUri + "/update-tracker",
					"method" : "PUT",
					"properties" : {
						"slot" : "",
						"note" : "",
						"octave" : "",
						"intensity" : "",
						"batch" : "",
						"etag" : get('etag')
					},
					"schema" : this.synth.schema.tracker
				}
			},
			"etag" : get('etag'),
			"style" : get('style'),
			"waveform": get('waveform'),
			"filter-frequency": get('filter-frequency'),
			"filter-kbd-follow": get('filter-kbd-follow'),
			"filter-resonance": get('filter-resonance'),
			"attack": get('attack'),
			"decay": get('decay'),
			"sustain": get('sustain'),
			"release": get('release'),
			"volume" : get('volume'),
			"tracker": this.synth.attributes.trackerNotes
		};

		return this;

	}
};

module.exports.SynthHypermedia = SynthHypermedia;
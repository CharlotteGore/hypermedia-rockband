var DrumMachineHypermedia = function (drum){

	this.drum = drum;
	this.slug = drum.get('slug');

	this.currentVersion = "";
	this._media = false;

	return this;

};

DrumMachineHypermedia.prototype = {

	makeGenericResponse: function( message, req, res ){

		res.send({
			_links : {
				'drummachine' : {
					href : '/drummachine/' + this.drum.get('slug')
				}
			},
			message : message
		});

	},

	ok : function (req, res){

		// has the drum updated? 
		if (this.currentVersion !== this.drum.get('etag')){
			this.updateProjection();
			this.currentVersion = this.drum.get('etag');
		}

		res.set('ETag', this.currentVersion);

		if (req.headers['if-none-match'] !== this.currentVersion){

			res.send(200, this._media);

		} else {

			res.send(304);

		}

		return this;

	},

	notAcceptable : function(message, req, res){

		res.status(406);
		this.makeGenericResponse(message, req, res);

	},

	conflict : function(message, req, res){

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

	error : function(message, req, res){

		res.status(500);
		this.makeGenericResponse(message, req, res);
	},

	embedded : function(){

		if(!this._media){
			this.updateProjection();
		}
		return this._media;

	},

	updateProjection : function (){

		var baseUri = '/drummachine/' + this.drum.get('slug');
		var etag = this.drum.get('etag');

		this._media = {
			"_links" : {
				"self" : {
					"href" : baseUri
				},
				"song" : {
					"href" : "/song/" + this.drum.get('song')
				},
				"curies" : [
					{
						"name" : "smp",
						"href" : "/samples/rels/{rel}",
						"templated" : true
					},
					{
						"name" : "cmd",
						"href" : "/commands/drums/rels/{rel}",
						"templated" : true
					}
				],
				"smp:kick" : {
					"href" : this.drum.get('samples').kick
				},
				"smp:snare" : {
					"href" : this.drum.get('samples').snare
				},
				"smp:hihat-open" : {
					"href" : this.drum.get('samples')['hihat-open']
				},
				"smp:hihat-closed" : {
					"href" : this.drum.get('samples')['hihat-closed']
				},
				"smp:crash" : {
					"href" : this.drum.get('samples').crash
				},
				"smp:tom-lo" : {
					"href" : this.drum.get('samples')['tom-lo']
				},
				"smp:tom-hi" : {
					"href" : this.drum.get('samples')['tom-hi']
				},
				"cmds:change-style" : {
					"href" : baseUri + "/change-style"
				},
				"cmds:update-kick" : {
					"href" : baseUri + "/update-kick"
				},
				"cmds:update-snare" : {
					"href" : baseUri + "/update-snare"
				},
				"cmds:update-hihat-open" : {
					"href" : baseUri + "/update-hihat-open"
				},
				"cmds:update-hihat-closed" : {
					"href" : baseUri + "/update-hihat-closed"
				},
				"cmds:update-crash" : {
					"href" : baseUri + "/update-crash"
				},
				"cmds:update-tom-lo" : {
					"href" : baseUri + "/update-tom-lo"
				},
				"cmds:update-tom-hi" : {
					"href" : baseUri + "/update-tom-hi"
				},
				"cmd:update-pattern" : {
					"href" : baseUri + "/update-pattern"
				}

			},
			"name" : this.drum.get('name'),
			"style" : this.drum.get('style'),
			"kick" : this.drum.get('kick'),
			"snare" : this.drum.get('snare'),
			"hihat-open" : this.drum.get('hihat-open'),
			"hihat-closed" : this.drum.get('hihat-closed'),
			"crash" : this.drum.get('crash'),
			"tom-lo" : this.drum.get('tom-lo'),
			"tom-hi" : this.drum.get('tom-hi'),
			"etag" : etag,
			"_commands" : {
				"change-style" : {
					"href" : baseUri + '/change-style',
					"method" : 'PUT',
					"properties" : {
						"style" : this.drum.get('style'),
						"etag" : etag
					},
					"schema" : {
						"style" : {
							"type" : "select",
							"options" : [
								{
									"name" : "Rock",
									"value" : "default"
								},
								{
									"name" : "Electronic",
									"value" : "electro"
								}
							]
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-pattern" : {
					"href" : baseUri + "/update-pattern",
					"method" : "PUT",
					"properties" : {
						"drum" : [],
						"pattern" : [false, false, false, false, false, false, false, false],
						"etag" : etag
					},
					"schema" : {
						"drum" : {
							"type" : "select-many",
							"options" : [
								{
									name : "Kick",
									value : "kick"
								},
								{
									name : "Snare",
									value : "snare"
								},
								{
									name : "Hi-hat Open",
									value : "hihat-open"
								},
								{
									name : "Hi-hat Closed",
									value : "hihat-closed"
								},
								{
									name : "Crash",
									value : "crash"
								},
								{
									name : "Low Tom",
									value : "tom-lo"
								},
								{
									name : "High Tom",
									value : "tom-hi"
								}
							]
						},
						"pattern" : {
							"type" : "array",
							"description" : "An array of 8 boolean values"
						}
					}
				},
				"update-kick": {
					"href": baseUri + "/update-kick",
					"method": "PUT",
					"properties": {
						"kick": this.drum.get('kick'),
						"etag" : etag
					},
					"schema" : {
						"kick" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-snare": {
					"href": baseUri + "/update-snare",
					"method": "PUT",
					"properties": {
						"snare": this.drum.get('snare'),
						"etag" : etag
					},
					"schema" : {
						"snare" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-hihat-open": {
					"href": baseUri + "/update-hihat-open",
					"method": "PUT",
					"properties": {
						"hihat-open": this.drum.get('hihat-open'),
						"etag" : etag
					},
					"schema" : {
						"hihat-open" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-hihat-closed": {
					"href": baseUri + "/update-hihat-closed",
					"method": "PUT",
					"properties": {
						"hihat-closed": this.drum.get('hihat-closed'),
						"etag" : etag
					},
					"schema" : {
						"hihat-closed" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-crash": {
					"href": baseUri + "/update-crash",
					"method": "PUT",
					"properties": {
						"crash": this.drum.get('crash'),
						"etag" : etag
					},
					"schema" : {
						"crash" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-tom-lo": {
					"href": baseUri + "/update-tom-lo",
					"method": "PUT",
					"properties": {
						"tom-lo": this.drum.get('tom-lo'),
						"etag" : etag
					},
					"schema" : {
						"tom-lo" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				},
				"update-tom-hi": {
					"href": baseUri + "/update-tom-hi",
					"method": "PUT",
					"properties": {
						"tom-hi": this.drum.get('tom-hi'),
						"etag" : etag
					},
					"schema" : {
						"kick" : {
							"type" : "array",
							"description" : "Array of boolean values"
						},
						"etag" : {
							"type" : "hidden"
						}
					}
				}

			}
		};

		return this;

	}

};

module.exports.DrumMachineHypermedia = DrumMachineHypermedia;
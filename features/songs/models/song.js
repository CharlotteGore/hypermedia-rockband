var _ = require('underscore');
var uuid = require('node-uuid');

var Drum = require('../../drummachines/models/drum').DrumMachine;
var Synth = require('../../synths/models/synth').Synth;

var Song = function( data, store ){

	this.store = store;

	this.attributes = {
		slug				: uuid.v4(),
		'name'				: 'Untitled',
		'bpm'				: 120,
		'time-signature'	: '4/4',
		'scale'				: 'Pentatonic Minor (C)',
		'instruments'		: 0
	};

	this.drums = [];
	this.synths = [];

	this.populate(data);

	this.schema = {
		settings : {
			bpm: {
				type: "range",
				min: 60,
				max: 180
			},
			"name": {
				type: "text"
			}
		}
	};
};

Song.prototype = {
	get : function(attr){
		return this.attributes[attr];
	},
	set : function(attr, val){
		this.attributes[attr] = val;
		return this;
	},
	addInstrument : function (type, callback){

		var instrument, self = this;

		switch(type){

			case "electro" :
				instrument = new Drum({ song : this.get('slug'), style : 'electro'}, this.store);
				this.drums.push(instrument);
				break;
			case "rock":
				instrument = new Drum({ song : this.get('slug'), style : 'default'}, this.store);
				this.drums.push(instrument);
				break;
			case "lead":
				instrument = new Synth({ song : this.get('slug'), style : 'lead'}, this.store);
				this.synths.push(instrument);
				break;
			case "bass":
				instrument = new Synth({ song : this.get('slug'), style : 'bass'}, this.store);
				this.synths.push(instrument);
		}

		self.attributes.instruments++;

		instrument.save(function(err, data){

			if(!err){

				self.attributes.etag = uuid.v4();
				self.save(function(err, data){
					if(err){
						callback(err, self);
					} else {
						callback(err, data);
					}

				});

			} else {

				self.load(function(_err, data){

					if(_err){
						// holy shit! this means the database is basically dead.
						callback(_err, data);
					} else {
						callback(err, self);
					}

				});
			}

		});

	},
	updateSettings : function (data){

		var errs = [];

		if(data.bpm){
			var bpm = parseInt(data.bpm, 10);

			if (bpm < this.schema.settings.bpm.min || bpm > this.schema.settings.bpm.max){
				errs.push('BPM out of range (60-180)');
			} else {
				this.attributes.bpm = bpm;
			}
		}

		if(data.name){
			if (data.name === ""){
				this.attributes.name = "Untitled";
			} else {
				this.attributes.name = data.name;
			}
		}

		if(errs){
			return errs.join('.');
		} else {
			return false;
		}
	},
	save : function (callback){
		var self = this;
		this.attributes.etag = uuid.v4();
		this.store.collection("songs").update({ slug : this.attributes.slug}, this.attributes, {safe : true, upsert : true}, function(err, data){
			if (!err){
				callback(err, self);
			}
		});
		return this;
	},
	load : function (callback){
		var self = this;
		self.synths = [];
		self.drums = [];
		this.store.collection("songs").findOne({ slug : this.attributes.slug}, function (err, data){
			if(!err && data){

				self.populate(data);

				self.store.collection('drummachines')
					.find({ song : self.attributes.slug})
					.toArray(function (err, drums){

						if(drums){

							drums.forEach(function (drum){

								self.drums.push( new Drum(drum, self.store) );
							
							});

						}

						self.store.collection('synths')
							.find({song : self.attributes.slug})
							.toArray(function(err, synths){

								if(synths){

									synths.forEach(function (synth){

										self.synths.push( new Synth(synth, self.store));

									});

								}

								self.attributes.instruments = self.synths.length + self.drums.length;

								callback(err, self);

							});

					});

				
			} else {
				callback("404", self);
			}
		});
		return this;
	},
	populate : function (data){
		_.extend(this.attributes, data);
		return this;
	}
};

module.exports.Song = Song;
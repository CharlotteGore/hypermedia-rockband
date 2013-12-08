var _ = require('underscore');
var uuid = require('node-uuid');

var broker = require('../../../shared/broker.js');

var styles = {
	'lead' : {
		"slot" : {
			"type" : "range",
			"min" : 1,
			"max" : 64
		},
		"note" : {
			"type" : "select",
			"options" : [
				{
					name : "--",
					value : ""
				},
				{
					name : "C",
					value : "c"
				},
				{
					name : "Eb",
					value : "eb"
				},
				{
					name : "F",
					value : "f"
				},
				{
					name : "G",
					value : "g"
				},
				{
					name : "Bb",
					value : "bb"
				}
			]
		},
		"octave" : {
			type : "range",
			min : 2,
			max : 7
		},
		"intensity" : {
			type : "range",
			min : 0,
			max : 1
		},
		"batch" : {
			type : "array",
			description : "An array of JSON objects containing slot, note, octave and intensity data"
		}
	},
	'bass' : {
		"slot" : {
			"type" : "range",
			"min" : 1,
			"max" : 64
		},
		"note" : {
			"type" : "select",
			"options" : [
				{
					name : "C",
					value : "c"
				},
				{
					name : "Eb",
					value : "eb"
				},
				{
					name : "F",
					value : "f"
				},
				{
					name : "G",
					value : "g"
				},
				{
					name : "Bb",
					value : "bb"
				}
			]
		},
		"octave" : {
			type : "range",
			min : 0,
			max : 3
		},
		"intensity" : {
			type : "range",
			min : 0,
			max : 1
		},
		"batch" : {
			type : "array",
			description : "An array of JSON objects containing slot, note, octave and intensity data, for updating multiple slots at once"
		}
	}
};

var Synth = function( data, store ){

	this.store = store;

	this.attributes = {
		song				: "",
		slug				: uuid.v4(),
		'waveform'			: 'square',
		'filter-frequency'	: 2000,
		'filter-kdb-follow'	: false,
		'filter-resonance'	: 0,
		'attack'			: 0,
		'decay'				: 0,
		'sustain'			: 1,
		'release'			: 0,
		'style'				: 'lead',
		'trackerNotes'		: []
	};

	this.trackerNotes = [];

	for (var i = 0; i < styles.lead.slot.max; i++){
		this.attributes.trackerNotes.push({
			note : "",
			intensity : 1,
			octave : "",
			slot : i + 1
		});
	}

	this.populate(data);

	this.schema = {
		settings : {
			waveform : {
				type : 'select',
				options : [
					{
						name : 'Square',
						value : 'square'
					},
					{
						name : 'Sawtooth',
						value : 'saw'
					},
					{
						name : 'Triangle',
						value : 'triangle'
					},
					{
						name : 'Sine',
						value : 'sine'
					}
				]
			},
			volume: {
				type: "range",
				min: 0,
				max: 1
			},
			"filter-frequency": {
				type: "range",
				min: 0,
				max: 20000
			},
			"filter-kdb-follow": {
				type: "boolean"
			},
			"filter-resonance": {
				type: "range",
				min: 0,
				max: 1
			},
			attack: {
				type: "range",
				min: 0,
				max: 10000
			},
			decay: {
				type: "range",
				min: 0,
				max: 10000
			},
			sustain: {
				type: "range",
				min: 0,
				max: 10000
			},
			release: {
				type: "range",
				min: 0,
				max: 10000
			}
		},
		tracker : styles[this.get('style')]
	};
};

Synth.prototype = {
	get : function(attr){
		return this.attributes[attr];
	},
	set : function(attr, val){
		this.attributes[attr] = val;
		return this;
	},
	updateSettings : function (data){

		var errs = [];

		_.each(data, function(val, key){

			if(this.schema.settings[key]){

				var schema = this.schema.settings[key];

				if (schema.type === "range"){

					var num = parseFloat(val, 10);

					if(num && num < schema.min || num > schema.max){
						errs.push('Value out of range for ' + key + ": min=" + schema.min + ", max=" + schema.max + ", attempted to set to " + num);
					} else {
						this.set(key, num);
					}

				} else if(schema.type === "boolean"){

					this.set(key, (val ? true : false));

				} else if(schema.type === "select"){

					var match = _.find(schema.options, function(option){
						return option.value === val;
					});

					if(!match){
						errs.push('Invalid option for ' + key);
					} else {
						this.set(key, val);
					}

				}

			}

		}, this);

		if(errs){
			return errs.join('.');
		} else {
			return false;
		}
	},

	updateTracker : function(data){

		var errs = [], trackerNote;

		if(!_.isArray(data.batch)){
			data.batch = [
				{
					slot : data.slot || false,
					note : data.note || false,
					intensity : data.intensity || false,
					octave : data.octave || false
				}
			];
		}

		_.each(data.batch, function (data){

			if(_.isUndefined(data.slot)){
				return 'Invalid tracker note slot specified';
			} else {
				trackerNote = this.attributes.trackerNotes[data.slot -1];

				if(!trackerNote){
					return "Invalid tracker note slot specified";
				}
			}

			if(data.note === ""){

				trackerNote.note = "";
				trackerNote.octave = "";

			} else {

				if(!_.find(this.schema.tracker.note.options, function( note ){ return note.value === data.note; })){
					errs.push('Invalid note specified');
				} else {
					trackerNote.note = data.note;

					if(!data.octave && !trackerNote.octave){
						trackerNote.octave = 3;
					}
					if(!data.intensity && !trackerNote.intensity){
						trackerNote.intensity = 1;
					}
				}
			}

			if(data.intensity){
				var intensity = parseFloat(data.intensity);

				if (intensity < styles[this.attributes.style].intensity.min|| intensity > styles[this.attributes.style].intensity.max){
					errs.push('Intensity out of range');
				} else {
					trackerNote.intensity = intensity;
				}
			}

			if(data.octave){
				var octave = parseFloat(data.octave);

				if (octave < styles[this.attributes.style].octave.min || octave > styles[this.attributes.style].octave.max){
					errs.push('Octave out of range');
				} else {
					trackerNote.octave = octave;
				}
			}

		}, this);

		if(errs.length > 0){
			return errs.join('.');
		} else {
			return false;
		}

	},
	save : function (callback){
		var self = this;
		this.attributes.etag = uuid.v4();
		this.store.collection("synths").update({ slug : this.attributes.slug}, this.attributes, {safe : true, upsert : true}, function(err, data){
			if (!err){
				broker.emit('instrument-updated', self.attributes.song, function(){ callback(err, self);});
			}
		});
		return this;
	},
	load : function (callback){
		var self = this;
		this.store.collection("synths").findOne({ slug : this.attributes.slug}, function (err, data){
			if(!err && data){
				self.populate(data);
				callback(err, self);
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

module.exports.Synth = Synth;
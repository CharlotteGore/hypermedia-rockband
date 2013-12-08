var _ = require('underscore');
var uuid = require('node-uuid');

var broker = require('../../../shared/broker.js');

var styles = {
	'default' : {
		'name' : 'Rock',
		'samples' : {
			'kick'			: '/samples/kick-default.mp3',
			'snare'			: '/samples/snare-default.mp3',
			'hihat-open'	: '/samples/hatopen-default.mp3',
			'hihat-closed'	: '/samples/hatclosed-default.mp3',
			'crash'			: '/samples/crash-default.mp3',
			'tom-lo'		: '/samples/tom-lo-default.mp3',
			'tom-hi'		: '/samples/tom-hi-default.mp3'
		}
	},
	'electro' : {
		'name' : 'Electro',
		'samples' : {
			'kick'			: '/samples/kick-electro.mp3',
			'snare'			: '/samples/snare-electro.mp3',
			'hihat-open'	: '/samples/hatopen-electro.mp3',
			'hihat-closed'	: '/samples/hatclosed-electro.mp3',
			'crash'			: '/samples/crash-electro.mp3',
			'tom-lo'		: '/samples/tom-lo-electro.mp3',
			'tom-hi'		: '/samples/tom-hi-electro.mp3'
		}
	}
};

var DrumMachine = function( data, store ){

	this.store = store;

	this.attributes = {
		'kick'			: [false, false, false, false, false, false, false, false],
		'snare'			: [false, false, false, false, false, false, false, false],
		'hihat-open'	: [false, false, false, false, false, false, false, false],
		'hihat-closed'	: [false, false, false, false, false, false, false, false],
		'crash'			: [false, false, false, false, false, false, false, false],
		'tom-lo'		: [false, false, false, false, false, false, false, false],
		'tom-hi'		: [false, false, false, false, false, false, false, false],
		song			: "",
		slug			: uuid.v4(),
		style			: 'default'
	};

	this.populate(data);

};

DrumMachine.prototype = {
	get : function(attr){
		return this.attributes[attr];
	},
	set : function(attr, val){
		this.attributes[attr] = val;
		return this;
	},
	setStyle : function( style ){
		if(styles[style]){
			this.attributes.style = style;
			this.attributes.samples = styles[this.attributes.style].samples;
			this.attributes.name = styles[this.attributes.style].name;
			return true;
		}
		return false;
	},
	updatePattern : function( drum, pattern ){

		var clean = [];

		if (!_.isArray(pattern)){
			return "Not an array";
		} else if (pattern.length !== 8){
			return "A pattern must be an array with 8 members";
		}

		_.each(pattern, function(beat){
			clean.push( beat ? true : false );
		});

		if(this.attributes[drum]){
			this.attributes[drum] = clean;
		}

		return "";

	},
	save : function (callback){
		var self = this;
		this.attributes.etag = uuid.v4();
		this.store.collection("drummachines").update({ slug : this.attributes.slug}, this.attributes, {safe : true, upsert : true}, function(err, data){
			if (!err){
				broker.emit('instrument-updated', self.attributes.song, function(){ callback(err, self);});
			}
		});
		return this;
	},
	load : function (callback){
		var self = this;
		this.store.collection("drummachines").findOne({ slug : this.attributes.slug}, function (err, data){
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
		this.setStyle(this.attributes.style);
		return this;
	}
};

module.exports.DrumMachine = DrumMachine;
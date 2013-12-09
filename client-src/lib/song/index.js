var _ = require('underscore');

var Model = require('hyperbone-model-with-io').Model;

var Instrument = Model.extend({
	syncCommands : true
});

var Song = Model.extend({
	_prototypes : {
		'drummachine' : Instrument,
		'synth' : Instrument
	},
	defaults : {
		'drummachine' : [],
		'synth' : [],
		'note-options' : []
	},
	syncCommands : true
});


var song = new Song();

song.on({

	'sync' : function(){

		var drums = this.get('drummachine');
		var self = this;

		// copy the array pattern data into hyperbone models...
		drums.each(function(drum, index){

			var holders = {};

			_.each(['kick', 'snare', 'hihat-open', 'hihat-closed', 'crash', 'tom-hi', 'tom-lo'], function(type){

				holders[type] = [];
				if(drum.get(type + 'pattern')){

					_.each(drum.get(type), function(val, i){
						drum.get(type + 'pattern').at(i).set({
							active : val
						});
					}, this);

				} else {

					_.each(drum.get(type), function(val, i){
						holders[type].push({
							active : val
						});
					}, this);
					drum.set(type + "-pattern", holders[type]);
				}

			}, this);

		}, this);

		var synths = this.get('synth');

		synths.each(function(synth, index){
			if(synth.get('style') === 'lead'){
				synth.set('is-lead', true);
			}
		});

		self.set('loaded', true);
		self.set('loading', false);

	},

	'submit:add-electro-drum-machine submit:add-rock-drum-machine submit:add-lead-synth submit:add-bass-synth' : function(cmd, execute){
		
		execute();

	},
	'submit:update-settings' : function (cmd, execute){

		this.set('editing', false);
		execute();

	}
});

module.exports = song;
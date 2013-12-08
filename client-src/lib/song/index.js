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
							machine : index,
							button : i,
							active : val
						});
					}, this);

				} else {

					_.each(drum.get(type), function(val, i){
						holders[type].push({
							machine : index,
							button : i,
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
			// we want to remember which model it is for later...
			synth.set({
				clean : true,
				machine : index
			});

			if(synth.get('intensity') === ""){
				synth.set('intensity', 1);
			}

			synth.get('tracker').each(function(track){
				track.set({
					'clean' : true,
					'machine' : index
				});
			});
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

	},

	'change:update-settings:synth' : function (command){

		command._parentModel.set('clean', false);

	},

	'save:synth' : function (model){

		model.set('clean', true);

	},

	'submit:update-settings:synth' : function(cmd, execute){

		var self = this;

		this.set('loading', true);
		execute(function(){

			self.fetch();

		});

	},

	'change:note:tracker:synth change:octave:tracker:synth change:intensity:tracker:synth' : function(model){

		if(!this.get('loading')){

			model.set('clean', false);

		}

	},

	'commit-track:tracker:synth' : function(model){

		// so this is a bit of a tricky one. For one, we get a reference to the tracker note but 
		// because this doesn't have its own command we need to get a reference to teh parent 
		// synth. 

		// Then, to make matters worse, if someone changes a bunch of tracker notes and then clicks save,
		// this instantly loses all the changes except for the ones we've just saved... so..

		var self = this;
		// remember we kept an reference to the index within the collection earlier?
		var synth = this.get('synth').at(model.get('machine'));
		var props = synth.command('update-tracker').properties();

		var tracker = synth.get('tracker');

		var batch = [];

		tracker.each(function(track){

			if(!track.get('clean')){
				batch.push({
					slot : track.get('slot'),
					intensity : track.get('intensity'),
					octave : track.get('octave'),
					note : track.get('note')
				});
			}
		});

		if(batch.length > 1){

			props.set('batch', batch);

		} else {
		
			props.set({
				note : model.get('note'),
				octave : model.get('octave'),
				intensity : model.get('intensity'),
				slot : model.get('slot')
			});

		}

		synth.execute('update-tracker', function(){
			// we update the song after we're done
			self.fetch();

		});

	},

	'change:active:kick-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('kick');
		arr[model.get('button')] = val;

		drum.command('update-kick').properties().set('kick', arr);

		self.set('loading', true);

		drum.execute('update-kick', function(){
			self.fetch();
		});
	},
	'change:active:snare-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('snare');
		arr[model.get('button')] = val;

		drum.command('update-snare').properties().set('snare', arr);

		self.set('loading', true);

		drum.execute('update-snare', function(){
			self.fetch();
		});
	},
	'change:active:hihat-open-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('hihat-open');
		arr[model.get('button')] = val;

		self.set('loading', true);

		drum.command('update-hihat-open').properties().set('hihat-open', arr);
		drum.execute('update-hihat-open', function(){
			self.fetch();
		});
	},

	'change:active:hihat-closed-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('hihat-closed');
		arr[model.get('button')] = val;

		self.set('loading', true);

		drum.command('update-hihat-closed').properties().set('hihat-closed', arr);
		drum.execute('update-hihat-closed', function(){
			self.fetch();
		});
	},

	'change:active:crash-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('crash');
		arr[model.get('button')] = val;

		self.set('loading', true);

		drum.command('update-crash').properties().set('crash', arr);
		drum.execute('update-crash', function(){
			self.fetch();
		});
	},

	'change:active:tom-hi-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('tom-hi');
		arr[model.get('button')] = val;

		self.set('loading', true);

		drum.command('update-tom-hi').properties().set('tom-hi', arr);
		drum.execute('update-tom-hi', function(){
			self.fetch();
		});
	},

	'change:active:tom-lo-pattern:drummachine' : function(model, val){

		var self = this;

		var drum = this.get('drummachine').at(model.get('machine'));
		var arr = drum.get('tom-lo');
		arr[model.get('button')] = val;

		self.set('loading', true);

		drum.command('update-tom-lo').properties().set('tom-lo', arr);
		drum.execute('update-tom-lo', function(){
			self.fetch();
		});
	}

});

module.exports = song;
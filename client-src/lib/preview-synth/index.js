var Model = require('hyperbone-model-with-io').Model;

var ctx = require('shared-context');
var beatMaster = require('beat-master');

var frequencies = require('frequencies');
var waves = {
	'sine' : 0,
	'triangle' : 3,
	'square' : 1,
	'saw' : 2 
};

var Synth = Model.extend({
	syncCommands : true,
});

var synthPreview = new Synth({
	bpm : 120
});

var compressor = ctx.createDynamicsCompressor();
compressor.connect(ctx.destination);

var filter = ctx.createBiquadFilter();
filter.connect(compressor);


function adsr(start, attack, decay, sustain, release, duration ){

	var a = attack / 1000;
	var d = decay / 1000;
	var r = release / 1000;
	var s = parseFloat(sustain, 10);

	this.gain.setValueAtTime(0, start);
		
	this.gain.linearRampToValueAtTime(1, start + a);
	this.gain.exponentialRampToValueAtTime(s, start + a + d);


	this.gain.setTargetValueAtTime(0, start + duration, r);

}


synthPreview.on({

	'sync' : function(){

		this.set({
			loading : false,
			loaded : true,
			clean : true
		});

		this.trigger('tracker-refresh-required');
		this.trigger('ready-for-synth');

	},

	'ready-for-synth' : function(){

		var beat = 0, self = this;

		beatMaster
			.off()
			.on('next-beat-is-at', function( start ){

				var position = beat % 64;
				beat++;

				self.set('position', position);

				var track = self.get('tracker').at(position);

				var note = track.get('note');
				var octave = track.get('octave');

				var freq;

				if (note !== ""){

					if(freq = frequencies[note][octave]){ // assignment on purpose

						var osc = ctx.createOscillator();
						var envelope = ctx.createGain();
						envelope.gain.setValueAtTime(0, 0);

						var attack = self.get('attack');
						var decay = self.get('decay');
						var release = self.get('release');

						envelope.connect(filter);
						osc.connect(envelope);

						osc.type = waves[self.get('waveform')];
						osc.frequency.value = freq;

						osc.start( 0 );
						osc.stop( start + 0.5 +release + 1000);

						adsr.call(envelope, start, attack, decay, self.get('sustain'), release, 0.5 );

						setTimeout(function(){ envelope.disconnect(); }, release + 1500 );

					}
				}

			});
	
	},

	'change:filter-frequency' : function(model, val){
		filter.frequency.value = val;
		console.log(val);
	},

	'change:filter-resonance' : function(model, val){
		filter.Q.value = val;
		console.log(val);
	},

	'change:bpm' : function(model, val){
	
		beatMaster.setBPM( val );
	
	},

	'play' : function(){

		beatMaster.stop();
		beatMaster.start();

	},

	'stop' : function(){

		beatMaster.stop();

	},

	'user-toggle-note' : function (slot, octave, note){

		var self = this;

		var track = this.get('tracker').at(slot);

		if (track.get('note') === note && track.get('octave') === octave ){
			track.set({
				octave : '',
				note : ''
			});
		} else {

			track.set({
				octave : octave,
				note : note
			});

		}

		this.command('update-tracker').properties().set({
			slot : track.get('slot'),
			octave : octave,
			note : note,
			intensity : 1
		});

		this.execute('update-tracker', function(){

			self.fetch();

		});
	},

	'save:synth' : function (){

		this.set('clean', true);

	},


	'change:update-settings' : function (command){

		this.set('clean', false);

	},


	'submit:update-settings' : function(cmd, execute){

		this.set('loading', true);
		execute();

	}

});

module.exports = synthPreview;


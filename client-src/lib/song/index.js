var _ = require('underscore');

var ctx = require('shared-context');

window.beatMaster = require('beat-master');
var frequencies = require('frequencies');
var waves = {
	'sine' : 0,
	'triangle' : 3,
	'square' : 1,
	'saw' : 2 
};


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
	syncCommands : true,
	'samples-loaded' : false
});

var compressor = ctx.createDynamicsCompressor();
compressor.connect(ctx.destination);

var song = new Song();

song.on({

	'sync' : function(){

		var drums = this.get('drummachine');
		var self = this;

		var gather = require('gather').gathering();

		// iterate through the collection of embedded drums...

		// copy the array pattern data into hyperbone models...
		drums.each(function(drum, index){

			// convert the drum patterns into something the view engine can easily work with...
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

			// load samples. We do this every time the page loads. 304 is our friend.
			drum._samples = {};

			_.each(drum.rels(), function(link, rel){
				var name;
				if(rel.indexOf('smp:') !== -1){
					name = rel.split('smp:')[1];

					gather.task(function sampleLoader(done, error){
						var request = new XMLHttpRequest();
						request.open('GET', link.href, true);
						request.responseType = 'arraybuffer';

						request.onload = function(){
							ctx.decodeAudioData(request.response, function(buffer){
								drum._samples[name] = buffer;
								done();
							}, function(){
								error();
							});
						};

						request.onerror = function(){
							error();
						};
						request.send();
					});
				}

				drum._gain = ctx.createGain();
				drum._gain.connect(compressor);

				if(!drum.get('volume')){
					drum.set('volume', 1);
				}
			});

		}, this);

		var synths = this.get('synth');

		synths.each(function(synth, index){
			if(synth.get('style') === 'lead'){
				synth.set('is-lead', true);
			}

			// create a filter for each synth to connect through...
			synth._filter = ctx.createBiquadFilter();
			synth._gain = ctx.createGain();

			synth._gain.connect(compressor);
			// and connect to the compressor.
			synth._filter.connect(synth._gain);
			synth._filter.frequency.value = synth.get('filter-frequency');
			synth._filter.Q.value = synth.get('filter-resonance');


			if(!synth.get('volume')){
				synth.set('volume', 1);
			}


		});

		gather.run(function(err){
			if (!err){
				self.trigger('samples-loaded');
				self.set({
					'ready' : true
				});
			} else {
				drum.set('error', true);
			}
		});

		self.set('loaded', true);
		self.set('loading', false);

	},

	'play' : function(){

		beatMaster.stop();
		beatMaster.start();

	},

	'stop' : function(){

		beatMaster.stop();
	},

	'samples-loaded' : function(){

		var beat = 0, self = this;

		this.set('samples-loaded', true);

		beatMaster
			.off()
			.on('next-beat-is-at', function( start ){

				// synths....

				var synthPosition = beat % 64;

				self.get('synth').each(function(synth){

					synth.set('position', synthPosition);

					var track = synth.get('tracker').at(synthPosition);

					var note = track.get('note');
					var octave = track.get('octave');

					var freq;

					if (note !== ""){

						if(freq = frequencies[note][octave]){ // assignment on purpose

							var osc = ctx.createOscillator();
							var envelope = ctx.createGain();
							envelope.gain.setValueAtTime(0, 0);

							var attack = synth.get('attack');
							var decay = synth.get('decay');
							var release = synth.get('release');

							envelope.connect(synth._filter);
							osc.connect(envelope);

							osc.type = waves[synth.get('waveform')];
							osc.frequency.value = freq;

							osc.start( 0 );
							osc.stop( start + 0.5 +release + 1000);

							adsr.call(envelope, start, attack, decay, self.get('sustain'), release, 0.5 );

							setTimeout(function(){ envelope.disconnect(); }, release + 1500 );

						}
					}

				});
				
				var drumPosition = beat % 8;

				self.get('drummachine').each(function(drum){

					_.each(['kick', 'snare', 'hihat-open', 'hihat-closed', 'crash', 'tom-hi', 'tom-lo'], function(type){

						if(drum.get(type)[drumPosition]){
							var sample = ctx.createBufferSource();
							sample.buffer = drum._samples[type];
							sample.connect(drum._gain);
							sample.start(start);
						}

					});

				});

				beat++;

			});

	},

	'change:filter-frequency:synth' : function( synth ){

		synth._filter.frequency.value = synth.get('filter-frequency');


	},

	'change:filter-resonance:synth' : function( synth ){

		synth._filter.Q.value = synth.get('filter-resonance');

	},

	'change:volume:synth change:volume:drummachine' : function(model, val){

		model._gain.gain.value = val;

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
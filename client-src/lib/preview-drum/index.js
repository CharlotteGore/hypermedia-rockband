var _ = require('underscore');
var Model = require('hyperbone-model-with-io').Model;

var ctx = require('shared-context');
var beatMaster = require('beat-master');

var DrumMachine = Model.extend({
	syncCommands : true,
});

var samples = {};

var drumPreview = new DrumMachine({
	'samples-loaded' : false,
	bpm : 120
});

drumPreview.on({
	'sync' : function(){
		// load our samples...
		var self = this;

		var gather = require('gather').gathering();

		if(!this.get('samples-loaded')){

			this.set('ready', false);

			_.each(this.rels(), function(link, rel){
				var name;
				if(rel.indexOf('smp:') !== -1){
					name = rel.split('smp:')[1];

					gather.task(function sampleLoader(done, error){
						var request = new XMLHttpRequest();
						request.open('GET', link.href, true);
						request.responseType = 'arraybuffer';

						request.onload = function(){
							ctx.decodeAudioData(request.response, function(buffer){
								samples[name] = buffer;
								done();
							}, function(){
								error();
							})
						};

						request.onerror = function(){
							error();
						};
						request.send();
					});
				}
			});

			gather.run(function(err){
				if (!err){
					self.trigger('samples-loaded');
					self.set({
						'ready' : true,
						'samples-loaded' : true
					});
				} else {
					self.set('error', true);
				}
			});

		}

		// copy the patterns into something easily understood by the view engine..
		var holders = {};

		_.each(['kick', 'snare', 'hihat-open', 'hihat-closed', 'crash', 'tom-hi', 'tom-lo'], function(type){

			holders[type] = [];
			if(this.get(type + 'pattern')){

				_.each(this.get(type), function(val, i){
					this.get(type + 'pattern').at(i).set({
						button : i,
						active : val
					});
				}, this);

			} else {

				_.each(this.get(type), function(val, i){
					holders[type].push({
						button : i,
						active : val
					});
				}, this);
				this.set(type + "-pattern", holders[type]);
			}

		}, this);

		this.set({
			'loaded' : true,
			'loading' : false
		});
	}	
});

drumPreview.on({
	'samples-loaded' : function(){

		var beat = 0, self = this;

		this.compressor = ctx.createDynamicsCompressor();
		this.compressor.connect(ctx.destination);

		beatMaster
			.off()
			.on('next-beat-is-at', function( start ){

				var position = beat % 8;

				self.set('position', position);
				beat++;

				_.each(['kick', 'snare', 'hihat-open', 'hihat-closed', 'crash', 'tom-hi', 'tom-lo'], function(drum){

					if(self.get(drum)[position]){
						var sample = ctx.createBufferSource();
						sample.buffer = samples[drum];
						sample.connect(self.compressor);
						sample.start(start);
					}

				});
			});
	
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

	'change:active:kick-pattern' : function(model, val){

		var self = this;

		var arr = this.get('kick');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('kick', arr);
		this.command('update-kick').properties().set('kick', arr);
		this.execute('update-kick', function(){
			self.fetch();
		});
	},
	'change:active:snare-pattern' : function(model, val){

		var self = this;

		var arr = this.get('snare');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('snare', arr);
		this.command('update-snare').properties().set('snare', arr);
		this.execute('update-snare', function(){
			self.fetch();
		});
	},
	'change:active:hihat-open-pattern' : function(model, val){

		var self = this;

		var arr = this.get('hihat-open');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('hihat-open', arr);
		this.command('update-hihat-open').properties().set('hihat-open', arr);
		this.execute('update-hihat-open', function(){
			self.fetch();
		});
	},

	'change:active:hihat-closed-pattern' : function(model, val){

		var self = this;

		var arr = this.get('hihat-closed');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('hihat-closed', arr);
		this.command('update-hihat-closed').properties().set('hihat-closed', arr);
		this.execute('update-hihat-closed', function(){
			self.fetch();
		});
	},

	'change:active:crash-pattern' : function(model, val){

		var self = this;

		var arr = this.get('crash');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('crash', arr);
		this.command('update-crash').properties().set('crash', arr);
		this.execute('update-crash', function(){
			self.fetch();
		});
	},

	'change:active:tom-hi-pattern' : function(model, val){

		var self = this;

		var arr = this.get('tom-hi');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('tom-hi', arr);
		this.command('update-tom-hi').properties().set('tom-hi', arr);
		this.execute('update-tom-hi', function(){
			self.fetch();
		});
	},

	'change:active:tom-lo-pattern' : function(model, val){

		var self = this;

		var arr = this.get('tom-lo');

		arr[model.get('button')] = val;

		self.set('loading', true);

		this.set('tom-lo', arr);
		this.command('update-tom-lo').properties().set('tom-lo', arr);
		this.execute('update-tom-lo', function(){
			self.fetch();
		});
	}
});

module.exports = drumPreview;


/*

beatMaster.on('next-beat-is-at', function(start){
   var sample = ctx.createBufferSource();
   sample.buffer = samples['kick'];
   sample.connect(ctx.destination);
   sample.start(start);
})

*/
var Model = require('hyperbone-model-with-io').Model;

// the default is to have an empty list of songs...
// and we already know the uri...
var Songs = Model.extend({
	defaults : {
		_links : {
			self : {
				href : "/songs"
			}
		},
		'song' : []
	}
});

var songs = new Songs();

// only one real event of interest - add new form submitted
songs.on({
	'sync' : function(){
		this.set('bpm', this.command('add-song').get('properties.bpm'));
		this.set({
			loaded : true,
			loading: false
		});
	},
	'submit:add-song' : function(cmd, execute){
		// not going to be other doing anything else...
		execute();
	}
});

module.exports = songs;
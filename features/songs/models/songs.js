var Song = require('./song.js').Song;
var uuid = require('node-uuid');

var Songs = function (store){

	this.store = store;
	this.songs = [];

	return this;
};

Songs.prototype = {
	load : function (callback){
		var self = this;
		this.songs = [];
		this.store.collection('songs')
			.find()
			.toArray(function(err, songs){
				if(!err){
					songs.forEach(function(song){
						self.songs.push( new Song(song, self.store, "nolisten") );
					});
					self.etag = uuid.v4();
				}
				callback(err, self);
			});
		return this;
	},
	addSong : function (data, callback){

		var self = this;

		var song = new Song(data, this.store, "nolisten");
		song.save(function(err, data){
			if(!err){
				self.load(callback);
			} else {
				callback(err, self);
			}
		});
		return this;
	}
};

module.exports.Songs = Songs;
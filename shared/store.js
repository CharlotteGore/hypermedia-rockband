var _ = require('underscore');
var MongoClient = require('mongodb').MongoClient;


module.exports.Store = function( opts, callback ){

	var defaults = {

		host : 'mongodb://127.0.0.1',
		port : '27017',
		db : 'hypermedia-rockband'

	};

	var config = {};

	_.extend(config, _.extend(defaults, opts));

	MongoClient.connect(config.host + ":" + config.port + "/" + config.db, function(err, db){

		if(err){
			throw Error("Unable to connect to mongo");
		}
		callback(null, {

			collection : function( c ){
				return db.collection( c );
			},
			close : function(){
				db.close();
			}
			
		});

	});
};
var Songs = require('../models/songs.js').Songs;

var SongsHypermedia = require('../hypermedia/songs.js').SongsHypermedia;

var hypermediaCache;

module.exports.handler = function (app, store){

	new Songs(store).load(function(err, songs){

		if(!err){

			var getSongs = function (req, res){

				if(!hypermediaCache){
					hypermediaCache = new SongsHypermedia( songs );
				}

				hypermediaCache.ok(req, res);

			};

			var addNewSong = function(req, res){

				// we don't care about etags here...
				songs.addSong(req.body, function(err, data){

					hypermediaCache.created("Song successfully created", req, res);

				});

			};

			// update the drum's styl

			app.get('/songs', getSongs);

			app.post('/songs/add-song', addNewSong);

		} else {

			app.get('/songs/', function(req, res){
				res.status(501);
				res.send('Sorry, unable to get a list of songs so cannot implement this route');
			});

		}

	});
};

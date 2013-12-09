var dom = require('dom');
var _ = require('underscore');

module.exports = {
	attributeHandlers : {
		'generate-tracker' : function(node, prop, cancel){
			cancel();

			$node = dom(node);

			var model = this.model;
			var currentStyle = "";
			var buttons = [];
			var lookup = {};

			var buildTracker = function buildTracker(){

				var schema = model.command('update-tracker').get('schema').toJSON();

				var octaves = schema.octave;
				var validNotes = schema.note.options;
				var slots = schema.slot.max;
				var slotData;

				for(var slot = -1; slot <  slots; slot++){

					var row = dom('<section></section>');
					row.addClass('row');

					if(!lookup[slot + 1]) lookup[slot + 1] = {};

					$node.append(row);

					for(var octave = octaves.max; octave > octaves.min - 1; octave--){

						if(!lookup[slot + 1][octave]) lookup[slot + 1][octave] = {};

						var notes = validNotes.length;

						while(validNotes[--notes]){

							note = validNotes[notes];

							if (note.value !== ""){

								if (slot === -1){

									var span = dom('<span>' + note.name + octave +'</span>');
									row.append(span);

								} else {

									var button = dom('<button></button>');
									button.on('click', (function(slot, octave, note){

										return function toggleNote(e){

											dom(this).addClass('active');
											model.trigger('user-toggle-note', slot, octave, note);

										};

									}(slot, octave, note.value)));
									row.append(button);

									lookup[slot + 1][octave][note.value] = button;

									buttons.push(button);

								}
							}

						}
					}
				}

			};

			var activate = function(){

				model.off('add-command:update-tracker', activate);

				model.on('tracker-refresh-required', function(){

					$node.find('button.active').removeClass('active');

					model.get('tracker').each(function( track ){
						var note = track.get('note');
						var octave = track.get('octave');
						var slot = track.get('slot');
						if(note !== ""){
							var button = lookup[slot][octave][note];
							button.addClass('active');
						}
					});

				});

				model.on('change:style', function(model, val ){

					if(val !== currentStyle){

						_.each(buttons, function(button){
							button.off('click');
						});
						buttons = [];
						lookup = {};
						$node.empty();
						buildTracker();

						currentStyle = val;

					}

				});

			};
			// we wait until the command exists before generating the HTML for the first time..
			model.on('add-command:update-tracker', activate);
		}

	},
	'render-tracker-as-canvas' : function(node, val, prop){

		debugger;

	}
};
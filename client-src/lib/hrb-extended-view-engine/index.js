var defaultViewEngine = require('hyperbone-view');

defaultViewEngine.use( require('hyperbone-view-commands') );
defaultViewEngine.use( require('tracker-render') );

defaultViewEngine.use({
	templateHelpers : {
		// any template helpers go here..
		if : function (val, str){
			return (val ? str : '');
		},
		'if-eq' : function(val, com, str){
			return ( val === com ? str : '');
		}
	},
	attributeHandlers : {
		// any trivial default handlers go here.. none so far!
	}
});

module.exports.View = defaultViewEngine.HyperboneView;

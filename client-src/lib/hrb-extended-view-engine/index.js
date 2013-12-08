var defaultViewEngine = require('hyperbone-view');

defaultViewEngine.use( require('hyperbone-view-commands') );
defaultViewEngine.use({
	templateHelpers : {
		// any template helpers go here..
		if : function (val, str){
			return (val ? str : '');
		}
	},
	attributeHandlers : {
		// any default handlers go here... 
	}
});

module.exports.View = defaultViewEngine.HyperboneView;

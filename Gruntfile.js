module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		shell : {
			install : {
				command : 'component install',
				options : {
					stdout : true,
					stderr : true,
					execOptions: {
						cwd: 'client-src'
					}
				}
			},
			build : {
				command : 'component build',
				options : {
					stdout : true,
					stderr : true,
					execOptions: {
						cwd: 'client-src'
					}
				}
			},
			flatinate : {
				command : 'flatinator -i client-src/build/build.js -o public/javascripts -n hypermedia-rockband --app hypermedia-rockband',
				options : {
					stdout : true,
					stderr : true
				}
			}
		},
		less : {
			ui : {
				files : {
					"public/styles.css" : "public/stylesheets/style.less"
				}
			}
		},
		watch : {
			client : {
				files : ["client-src/index.js", "client-src/lib/*/*.js"],
				tasks : ['shell:install', 'shell:build', 'shell:flatinate']  
			},
			styles : {
				files : ["public/stylesheets/*.less"],
				tasks : ['less:ui']
			}
		}
	});
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.registerTask('build', ['shell:build', 'shell:flatinate', 'less:ui']);
	grunt.registerTask('install', 'shell:install');
}
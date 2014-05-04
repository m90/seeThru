module.exports = function(grunt){

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> see https://github.com/m90/jquery-seeThru for details */\n'
			},
			dist: {
				files: {
					'dist/<%= pkg.version %>/jquery-seeThru.min.js' : 'src/jquery-seeThru.js'
				}
			},
			test: {
				files: {
					'test/lib/jquery-seeThru.min.js' : 'src/jquery-seeThru.js'
				}
			}
		},
		bump: {
			options: {
				files: ['package.json', 'bower.json', 'seethru.jquery.json']
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'src/*.js'],
			options: {
				laxcomma: true,
				globals: {
					jQuery: true,
					console: true,
					module: true,
					document: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-bump');
	grunt.registerTask('test', ['jshint', 'uglify:test']);
	grunt.registerTask('default', ['jshint', 'uglify']);
	grunt.registerTask('patch', ['bump-only:patch']);

};
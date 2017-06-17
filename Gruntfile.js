module.exports = function(grunt){

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> see https://github.com/m90/seeThru for details */\n'
			},
			dist: {
				files: {
					'dist/<%= pkg.version %>/seeThru.min.js' : 'src/seeThru.js'
					, 'dist/seeThru.min.js' : 'src/seeThru.js'
				}
			}
		},
		bump: {
			options: {
				files: ['package.json', 'bower.json', 'seethru.jquery.json']
			}
		},
		jsonlint: {
			configfiles: {
				src: [ '*.json' ]
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'src/*.js'],
			options: {
				jshintrc : true
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-jsonlint');
	grunt.loadNpmTasks('grunt-bump');
	grunt.registerTask('lint', ['jshint', 'jsonlint']);
	grunt.registerTask('default', ['lint', 'uglify']);
	grunt.registerTask('patch', ['bump-only:patch']);

};
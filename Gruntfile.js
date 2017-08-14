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
		jsonlint: {
			configfiles: {
				src: [ '*.json' ]
			}
		},
		eslint: {
			target: ['.']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-jsonlint');
	grunt.loadNpmTasks('grunt-eslint');
	grunt.registerTask('lint', ['eslint', 'jsonlint']);
	grunt.registerTask('default', ['lint', 'uglify']);
};

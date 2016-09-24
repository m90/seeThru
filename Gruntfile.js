module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    assemble: {
      options: {
        assets: 'img',
        layout: ['layouts/default.hbs'],
        postprocess : require('pretty')
      },
      pages: {
        src: ['*/*.hbs', '!layouts/**'],
        dest: './'
      }
    }
  });

  grunt.loadNpmTasks('assemble');

  grunt.registerTask('default', ['assemble']);

};
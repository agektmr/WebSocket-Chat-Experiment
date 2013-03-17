module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! binarize.js <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'node_modules/binarize.js/src/binarize.js',
        dest: 'public/js/binarize.min.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['uglify']);

};

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        banner: "/*\n" +
"\n" +
"Copyright 2011-<%= grunt.template.today('yyyy') %> Alex Belozerov, Ilya Stepanov\n" +
"\n" +
"This file is part of PerfectPixel.\n" +
"\n" +
"PerfectPixel is free software: you can redistribute it and/or modify\n" +
"it under the terms of the GNU General Public License as published by\n" +
"the Free Software Foundation, either version 3 of the License, or\n" +
"(at your option) any later version.\n" +
"\n" +
"PerfectPixel is distributed in the hope that it will be useful,\n" +
"but WITHOUT ANY WARRANTY; without even the implied warranty of\n" +
"MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n" +
"GNU General Public License for more details.\n" +
"\n" +
"You should have received a copy of the GNU General Public License\n" +
"along with PerfectPixel.  If not, see <http://www.gnu.org/licenses/>.\n" +
"\n" +
"*/\n",
        compress: {
          drop_console: true // removes console.log statements
        }
      },
      dynamic_mappings: {
        // Grunt will search for "**/*.js" under "lib/" when the "uglify" task
        // runs and build the appropriate src-dest file mappings then, so you
        // don't need to update the Gruntfile when files are added or removed.
        files: [
          {
            expand: true,     // Enable dynamic expansion.
            cwd: '',      // Src matches are relative to this path.
            src: [
              '**/*.js', 
              '!**/*.min.js', 
              '!node_modules/**/*.*',
              '!fancy-settings/**/*.*',
              '!3rd-party/**/*.*',
              '!gruntfile.js'
            ], // Actual pattern(s) to match.
            dest: '../build/'   // Destination path prefix.
          }
        ]
      },
    },

    cssmin: {
      minify: {
        expand: true,
        cwd: '',
        src: ['**/*.css', '!**/*.min.css', '!node_modules/**/*.*'],
        dest: '../build/'
      }
    },

    copy: { // Copy all other files
      main: {
          files: [{
              expand: true,
              cwd: '',
              src: ['**/*.min.js', '**/*.min.css',
                  '!node_modules/**/*.*'],
              dest: '../build/',
              filter: 'isFile'
          },{
              expand: true,
              cwd: '',
              src: ['**/*.*', '!**/*.css', '!**/*.js', '!node_modules/**/*.*', '!package.json'],
              dest: '../build/',
              filter: 'isFile'
          },{
              expand: true,
              cwd: '',
              src: ['fancy-settings/**/*.*', '3rd-party/**/*.*'],
              dest: '../build/',
              filter: 'isFile'
          }
          ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('default', ['copy', 'uglify', 'cssmin']);
};
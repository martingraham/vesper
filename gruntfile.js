module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: ';'
            },
            js: {
                src: ['src/vesper.js', 'src/*.js'],
                //src: ['src.vesper.js', 'src/*.js'],
                dest: 'build/<%= pkg.name %>temp.js'
            },
            css: {
                src: ['src/*.css'],
                dest: 'build/<%= pkg.name %>temp.css'
            }
        },

        /*
        depconcat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: ';'
            },
            js: {
                src: ['src/*.js'],
                //src: ['src.vesper.js', 'src/*.js'],
                dest: 'build/<%= pkg.name %>temp.js'
            },
            css: {
                src: ['src/*.css'],
                dest: 'build/<%= pkg.name %>temp.css'
            }
        },
        */
        cssmin: {
            css: {
                src: 'build/<%= pkg.name %>temp.css',
                dest: 'build/<%= pkg.name %>.min.css'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %>temp <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'build/<%= pkg.name %>temp.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        copy: {
            main: {
                expand: true,
                cwd: 'src/',
                src: ['dwca.xsd', 'demoNewMin.html'],
                dest: 'build/'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
   // grunt.loadNpmTasks('grunt-dep-concat');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['concat', 'cssmin', 'uglify', 'copy']);
};
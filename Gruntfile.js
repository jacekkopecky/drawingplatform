module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'app/server.js', 'public/js/platform.js'],
            options: {
                force: true,
                reporter: require('jshint-stylish')
            },
        },
        forever: {
            server: {
                options: {
                    index: 'app/server.js',
                    logDir: 'app/logs'
                }
            }
        },
        jasmine: {
            client: {
                src: 'public/js/platform.js',
                options: {
                    specs: 'test/spec/suites/test.js',
                    vendor: [
                        'public/js/jquery.js',
                        'test/jasmine-jquery.js',
                        'public/js/bootstrap.min.js', 
                        'public/js/kinetic.js', 
                        'public/js/peer.js'
                    ],
                }
            }
        },
        watch: {
            server: {
                files: ['app/server.js'],
                tasks: ['jshint', 'forever:server:stop', 'forever:server:start']
            },
            client: {
                files: ['public/js/platform.js'],
                tasks: ['jasmine:client', 'jshint']
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-forever');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['jasmine', 'jshint', 'forever:server:start', 'watch']);

};
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
        less: {
            default: {
                options: {
                    paths: ["public/less"]
                },
                files: {
                    "public/css/site.css": "public/less/bootstrap.less"
                }
            }
        },
        watch: {
            server: {
                files: ['app/server.js'],
                tasks: ['jshint', 'forever:server:stop', 'forever:server:start']
            },
            client: {
                files: ['public/js/platform.js', 'public/less/custom.less'],
                tasks: ['jasmine:client', 'jshint', 'less']
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-forever');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['jasmine', 'jshint', 'less', 'forever:server:start', 'watch']);
    grunt.registerTask('server', ['forever:server:start']);

};
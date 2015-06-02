/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var path = require('path'),
    config = {
        addOn: {
            enable: false,
            basePaths: [path.join(__dirname, '../src/addon/core')]
        },

        authentication: {
            enable: false,
            allowGuests: true,
            guestAccount: 'guest',
            logOutUrl: '/',
            salts: 10
        },

        bin: {
            log: {
                transports: [{
                    transportType: 'Console',
                    //patterns: ['gme:server:*', '-gme:server:worker*'], // ['gme:server:worker:*'], ['gme:server:*', '-gme:server:worker*']
                    options: {
                        level: 'info',
                        colorize: true,
                        timestamp: true,
                        prettyPrint: true,
                        handleExceptions: true, // ignored by default when you create the logger, see the logger.create function
                        depth: 2
                    }
                }]
            }
        },

        blob: {
            type: 'FS', //'FS', 'S3'
            fsDir: './blob-local-storage',
            s3: {}
        },

        client: {
            appDir: path.join(__dirname, '../src/client'),
            log: {
                level: 'debug' // To see log messages in the browser inspector set:
                               // localStorage.debug = '*' (or 'gme*', 'gme:core*')
            },
            usedDecorators: ['ModelDecorator',
                             'CircleDecorator',
                             'MetaDecorator',
                             'SVGDecorator',
                             'UMLStateMachineDecorator',
                             'DefaultDecorator'],
            // Used in client/WebGME.js to load initial project.
            defaultProject: {
                name: null,
                branch: null,
                node: null
            }
        },

        debug: false,

        executor: {
            enable: false,
            nonce: null,
            outputDir: './',
            workerRefreshInterval: 5000,
            labelJobs: './labelJobs.json'
        },

        mongo: {
            uri: 'mongodb://127.0.0.1:27017/multi',
            options: {
                db: {
                    w: 1,
                    native_parser: true
                },
                server: {
                    auto_reconnect: true,
                    socketOptions: {keepAlive: 1},
                    poolSize: 20
                }
            }
        },

        plugin: {
            allowServerExecution: false,
            basePaths: [path.join(__dirname, '../src/plugin/coreplugins')]
        },

        requirejsPaths: {},

        rest: {
            secure: false,
            components: {}
        },

        seedProjects: {
            enable: true,
            defaultProject: 'EmptyProject',
            basePaths: [path.join(__dirname, '../seeds')]
        },

        server: {
            port: 8888,
            maxWorkers: 10,
            sessionStore: {
                type: 'Memory', // Memory, Redis, Mongo, options will be passed to the specified storage
                // see specific session store documentations for options connect-mongo and connect-redis
                options: {
                    //url: 'mongodb://127.0.0.1:27017/multi'
                }
            },
            sessionCookieId: 'webgmeSid',
            sessionCookieSecret: 'meWebGMEez',
            log: {
                //patterns: ['gme:server:*', '-gme:server:standalone*'],
                transports: [{
                    transportType: 'Console',
                    //patterns: ['gme:server:*', '-gme:server:worker*'], // ['gme:server:worker:*'], ['gme:server:*', '-gme:server:worker*']
                    options: {
                        level: 'debug', // Set this back to info when merged
                        colorize: true,
                        timestamp: true,
                        prettyPrint: true,
                        handleExceptions: true, // ignored by default when you create the logger, see the logger.create function
                        depth: 2
                    }
                }, {
                    transportType: 'File',
                    options: {
                        name: 'info-file',
                        filename: './server.log',
                        level: 'info',
                        json: false
                    }
                }, {
                    transportType: 'File',
                    options: {
                        name: 'error-file',
                        filename: './server-error.log',
                        level: 'error',
                        handleExceptions: true, // ignored by default when you create the logger, see the logger.create function
                        json: false
                    }
                }]
            },
            https: {
                enable: false,
                certificateFile: path.join(__dirname, '../certificates/sample-cert.pem'),
                keyFile: path.join(__dirname, '../certificates/sample-key.pem')
            }
        },

        socketIO: {
            reconnection: true,
            'connect timeout': 10,
            'reconnection delay': 1,
            'force new connection': true,
            transports: ['websocket']
        },

        storage: {
            autoPersist: true, // core setting
            cache: 2000,
            // If true events such as PROJECT_CREATED and BRANCH_CREATED will only be broadcasted
            // and not emitted back to the web-socket that triggered the event.
            broadcastProjectEvents: false,
            loadBucketSize: 100,
            loadBucketTimer: 10,
            clientCacheSize: 2000, // overwrites cache on client
            keyType: 'plainSHA1', // 'rand160Bits', 'ZSSHA', 'plainSHA1',
            failSafe: 'memory',
            failSafeFrequency: 10000,
            timeout: 10000
        },

        visualization: {
            decoratorPaths: [path.join(__dirname, '../src/client/decorators')],
            visualizerDescriptors: [path.join(__dirname, '../src/client/js/Visualizers.json')]
        }
    };

module.exports = config;

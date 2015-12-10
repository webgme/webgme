/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var path = require('path'),
    config = {
        addOn: {
            enable: false,
            monitorTimeout: 10000,
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
                level: 'debug'
            },
            // Used in client/WebGME.js to load initial project (if url is specified that has higher priority)
            defaultContext: {
                project: null,   // This is the projectId, e.g. 'guest+TestProject'
                branch: null, // Defaults to master
                node: null    // Defaults to the root-node.
            },
            defaultConnectionRouter: 'basic3' //'basic', 'basic2', 'basic3'
        },

        core: {
            enableCustomConstraints: false,
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
                    native_parser: true // jshint ignore: line
                },
                server: {
                    auto_reconnect: true, // jshint ignore: line
                    socketOptions: {keepAlive: 1}
                    //poolSize: 5 // default pool size is 5
                }
            }
        },

        plugin: {
            allowBrowserExecution: true,
            allowServerExecution: false,
            basePaths: [path.join(__dirname, '../src/plugin/coreplugins')],
            displayAll: false,
            serverResultTimeout: 60000
        },

        requirejsPaths: {},

        rest: {
            components: {}
        },

        seedProjects: {
            enable: true,
            allowDuplication: true, //requires mongodb >= 2.6
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
                },
                cookieSecret: 'meWebGMEez',
                cookieKey: 'webgmeSid',
            },
            log: {
                //patterns: ['gme:server:*', '-gme:server:standalone*'],
                transports: [{
                    transportType: 'Console',
                    //patterns: ['gme:server:*', '-gme:server:worker*'], // ['gme:server:worker:*'], ['gme:server:*', '-gme:server:worker*']
                    options: {
                        level: 'info', // Set this back to info when merged
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
            extlibExcludes: ['config\/config\..*\.js$']
        },

        socketIO: {
            clientOptions: {
                reconnection: true,
                'connect timeout': 10,
                'reconnection delay': 1,
                'force new connection': true
            },
            serverOptions: {
                //transports: ['websocket', 'polling']
            }
        },

        storage: {
            cache: 2000,
            // If true events such as PROJECT_CREATED and BRANCH_CREATED will only be broadcasted
            // and not emitted back to the web-socket that triggered the event.
            broadcastProjectEvents: false,
            emitCommittedCoreObjects: true,
            loadBucketSize: 100,
            loadBucketTimer: 10,
            clientCacheSize: 2000, // overwrites cache on client
            keyType: 'plainSHA1', // 'rand160Bits', 'ZSSHA', 'plainSHA1',
            database: {
                type: 'mongo', // mongo, redis, memory
                options: { // if mongo - settings will be used from config.mongo
                    //port: 6666
                }
            }
        },

        visualization: {
            decoratorPaths: [path.join(__dirname, '../src/client/decorators')],
            decoratorsToPreload: null, // array of names (ids)
            svgDirs: [],
            visualizerDescriptors: [path.join(__dirname, '../src/client/js/Visualizers.json')],

            panelPaths: [path.join(__dirname, '../src/client/js/Panels')],

            layout: {
                default: 'DefaultLayout',
                basePaths: [path.join(__dirname, '../src/client/js/Layouts')]
            }
        }
    };

module.exports = config;

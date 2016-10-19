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
            authorizer: {
                path: path.join(__dirname, '../src/server/middleware/auth/defaultauthorizer'),
                options: {}
            },

            allowGuests: true,
            allowUserRegistration: true,
            guestAccount: 'guest',
            logOutUrl: '/profile/login',
            logInUrl: '/profile/login',
            salts: 10,
            jwt: {
                expiresIn: 3600 * 24 * 7,
                renewBeforeExpires: 3600,
                cookieId: 'access_token',
                // These are just examples and should be overwritten
                privateKey: path.join(__dirname, '../src/server/middleware/auth/EXAMPLE_PRIVATE_KEY'),
                publicKey: path.join(__dirname, '../src/server/middleware/auth/EXAMPLE_PUBLIC_KEY')
            }
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
            defaultConnectionRouter: 'basic3' //'basic', 'basic2', 'basic3'
        },

        core: {
            enableCustomConstraints: false,
            inverseRelationsCacheSize: 2000
        },

        debug: false,

        executor: {
            enable: false,
            nonce: null,
            workerRefreshInterval: 5000,
            clearOutputTimeout: 60000,
            clearOldDataAtStartUp: false,
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
            components: {
                //'path/subPath': './middleware/ExampleRestRouter'
            }
        },

        seedProjects: {
            enable: true,
            allowDuplication: true, //requires mongodb >= 2.6
            defaultProject: 'EmptyProject',
            basePaths: [path.join(__dirname, '../seeds')]
        },

        server: {
            port: 8888,
            handle: null,
            timeout: -1,
            maxWorkers: 10,
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
            extlibExcludes: ['config\/config\..*\.js$'],
            behindSecureProxy: false
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
            },
            adapter: {
                type: 'Memory', // Memory, Redis
                options: {
                    //uri: '127.0.0.1:6379'
                },
            }
        },

        storage: {
            cache: 2000,
            // If true events such as PROJECT_CREATED and BRANCH_CREATED will only be broadcasted
            // and not emitted back to the web-socket that triggered the event.
            broadcastProjectEvents: false,
            maxEmittedCoreObjects: -1,
            loadBucketSize: 100,
            loadBucketTimer: 10,
            clientCacheSize: 2000, // overwrites cache on client
            autoMerge: {
                enable: false
            },
            keyType: 'plainSHA1', // 'rand160Bits', 'ZSSHA', 'plainSHA1',
            database: {
                type: 'mongo', // mongo, redis, memory
                options: { // if mongo - settings will be used from config.mongo
                    //port: 6666
                }
            }
        },

        visualization: {
            extraCss: [],
            decoratorPaths: [path.join(__dirname, '../src/client/decorators')],
            decoratorsToPreload: null, // array of names (ids)
            svgDirs: [],
            visualizerDescriptors: [path.join(__dirname, '../src/client/js/Visualizers.json')],

            panelPaths: [path.join(__dirname, '../src/client/js/Panels')],

            layout: {
                default: 'DefaultLayout',
                basePaths: [path.join(__dirname, '../src/client/js/Layouts')]
            }
        },

        webhooks: {
            enable: false,
            manager: 'memory' // memory, redis
        }
    };

module.exports = config;

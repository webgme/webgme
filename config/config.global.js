/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pemijer / https://github.com/pmeijer
 */

var config = {
    server: {
        port: 8888,
        sessionCookieId: 'webgmeSid',
        sessionCookieSecret: 'meWebGMEez',
        https: {
            enable: false,
            certificateFile: './src/bin/proba-cert.pem',
            keyFile: './src/bin/proba-key.pem'
        }
    },

    client: {
        appDir: './src/client',
        // Used in client/WebGME.js to load initial project.
        defaultProject: {
            name: null,
            branch: null,
            node: null
        }
    },

    mongo: {
        uri: 'mongodb://127.0.0.1:27017/multi',
        options: {
            w: 1,
            'native-parser': true,
            auto_reconnect: true,
            poolSize: 20,
            socketOptions: {keepAlive: 1}
        }
    },

    socketIO: {
        reconnect: false,
        'connect timeout': 10,
        'reconnection delay': 1,
        'force new connection': true,
        transports: ['websocket']
    },

    log: {
        debug: false,
        level: 1, // 5 = ALL, 4 = DEBUG, 3 = INFO, 2 = WARNING, 1 = ERROR, 0 = OFF
        file: 'server.log'
    },

    authentication: {
        enable: false,
        salts: 10,
        allowGuests: false,
        logOutUrl: '/',
        guestAccount: 'anonymous'
    },

    blob: {
        type: 'FS', //'FS', 'S3'
        fsDir: './blob-local-storage',
        s3: {}
    },

    executor: {
        enable: false,
        nonce: null
    },

    plugin: {
        allowServerExecution: false,
        basePaths: ['./src/plugin/coreplugins'],
    },

    rest: {
        secure: false,
        components: {}
    },

    addOn: {
        enable: true,
        basePaths: ['./src/addon/core']
    },

    visualization: {
        decoratorPaths: ['./src/client/decorators'],
        visualizerDescriptors: ['./src/client/js/Visualizers.json']
    },

    storage: {
        keyType: 'plainSHA1', // 'rand160Bits', 'ZSSHA', 'plainSHA1',
        timeout: 10000,
        failSafe: 'memory',
        failSafeFrequency: 10000
    },

    requirejsPaths: {}
};

module.exports = config;
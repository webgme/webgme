/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var config = require('./config.default');

config.server.port = 9001;


config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_tests';

config.blob.fsDir = './test-tmp/blob-storage';

config.executor.outputDir = './test-tmp/executor';
config.executor.workerRefreshInterval = 100;

config.server.log = {
    transports: [{
        transportType: 'Console',
        options: {
            level: 'warn',
            colorize: true,
            timestamp: true,
            prettyPrint: true,
            depth: 2
        }
    }, {
        transportType: 'File',
        options: {
            name: 'info-file',
            filename: './test-tmp/server.log',
            level: 'info',
            json: false
        }
    }, {
        transportType: 'File',
        options: {
            name: 'error-file',
            filename: './test-tmp/server-error.log',
            level: 'error',
            handleExceptions: true,
            json: false
        }
    }]
};

module.exports = config;
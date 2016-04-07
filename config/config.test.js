/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var path = require('path'),
    config = require('./config.default');

config.server.port = 9001;

config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_tests';
config.mongo.options.server.poolSize = 2; // 5 is the default

config.blob.fsDir = './test-tmp/blob-storage';

config.executor.workerRefreshInterval = 100;
config.executor.clearOldDataAtStartUp = true;

config.authentication.salts = 1;

//FIXME: Have a common dir for this..
config.plugin.basePaths.push(path.join(__dirname, '../test/plugin/scenarios/plugins'));
config.plugin.allowServerExecution = true;
config.storage.database.options = {
    //port: 6666
};

config.addOn.basePaths.push(path.join(__dirname, '../test/addon/addOns'));

config.server.log = {
    transports: [{
        transportType: 'Console',
        options: {
            level: 'error',
            colorize: true,
            timestamp: true,
            prettyPrint: true,
            handleExceptions: true,
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

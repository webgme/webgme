/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var config = require('./config.global');

config.server.port = 9001;


config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_tests';

config.blob.fsDir = './test-tmp/blob-storage';

module.exports = config;
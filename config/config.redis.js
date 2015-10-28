/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var config = require('./config.default');

console.info('### Running in Redis mode ####');

// Mongodb needs to be running (_users etc. are still stored there).
config.mongo.uri = 'mongodb://127.0.0.1:27017/redis';

config.storage.database.type = 'redis';
config.storage.database.options = {
    //port: 6666 // on windows the default redis port is occupied.
};

module.exports = config;
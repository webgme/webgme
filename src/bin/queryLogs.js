/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var winston = require('winston'),
    gmeConfig = require('../../config'),
    Logger = require('../server/logger'),
    logger = Logger.create('gme:bin:queryLogs', gmeConfig.server.log);

// FIXME: this does not read the log file
logger.info('hello');

// TODO: get this from a file or command line?
var options = {
    from: new Date() - 24 * 60 * 60 * 1000,
    until: new Date(),
    limit: 10,
    start: 0,
    order: 'desc',
    fields: ['message']
};

//
// Find items logged between today and yesterday.
//
winston.query(options, function (err, results) {
    if (err) {
        throw err;
    }

    console.log(results);
});
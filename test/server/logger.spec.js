/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals.js');


describe('server logger', function () {
    'use strict';

    var expect = testFixture.expect,
        Logger = require('../../src/server/logger');

    it('should instantiate a logger', function () {
        var logger = Logger.create('logger_name', {transports: []});
        expect(logger).to.have.property('error');
        expect(logger).to.have.property('warn');
        expect(logger).to.have.property('info');
        expect(logger).to.have.property('debug');
    });

    it('should instantiate a logger without a name', function () {
        var logger = Logger.create('', {transports: []});
        expect(logger).to.have.property('error');
        expect(logger).to.have.property('warn');
        expect(logger).to.have.property('info');
        expect(logger).to.have.property('debug');
    });


    it('should fork a logger with a fork name', function () {
        var logger = Logger.create('original_name', {transports: []}),
            loggerFork = logger.fork('fork_name1'),
            loggerFork2 = logger.fork('fork_name2', true);

        expect(logger.name).to.equal('original_name');
        expect(loggerFork.name).to.equal('original_name:fork_name1');
        expect(loggerFork2.name).to.equal('fork_name2');
    });

    it('should disable a logger', function () {
        var logger = Logger.create('', {transports: []});
        function fn() {
            logger.enable(true);
            logger.error('Test message.');
            logger.warn('Test message.');
            logger.info('Test message.');
            logger.debug('Test message.');

            logger.enable(false);
            logger.error('Test message.');
            logger.warn('Test message.');
            logger.info('Test message.');
            logger.debug('Test message.');

            logger.enable(true);
        }

        expect(fn).to.not.throw();
    });

    it('should get the same instance if logger already exists', function () {
        var logger1 = Logger.create('logger_exists', {transports: []}),
            logger2 = Logger.create('logger_exists', {transports: []});
        expect(logger1).to.equal(logger2);
    });

    it('should throw if log function is called', function () {
        var logger = Logger.create('', {transports: []});

        function fn() {
            logger.log('message');
        }

        expect(fn).to.throw(Error, /Call debug, info, warn or error functions/);
    });


});
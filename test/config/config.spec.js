/*jshint node: true, mocha: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

describe('configuration', function () {

    var should = require('chai').should(),
        oldNodeEnv = process.env.NODE_ENV,
        configGlobal = require('../../config/config.global.js'),
        configTest = require('../../config/config.test.js');

    before(function () {

    });

    after(function () {
        process.env.NODE_ENV = oldNodeEnv;
    });

    it('should load global as a default config', function () {
        var config;
        process.env.NODE_ENV = '';
        config = require('../../config');

        config.should.deep.equal(configGlobal);
    });

    it('should load test config', function () {
        var config;
        process.env.NODE_ENV = 'test';
        config = require('../../config');

        config.should.deep.equal(configTest);
    });

});
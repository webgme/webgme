/*jshint node: true, mocha: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

describe('configuration', function () {
    'use strict';

    var should = require('chai').should(),
        oldNodeEnv = process.env.NODE_ENV,
        path = require('path'),
        configPath = path.join(__dirname, '..', '..', 'config', 'index.js'),
        configGlobal = require('../../config/config.global.js'),
        configTest = require('../../config/config.test.js');

    before(function () {

    });

    beforeEach(function () {
        // clear the cached files
        var key,
            i,
            modulesToUnload = [];

        for (key in require.cache) {
            if (key.indexOf(configPath) > -1) {
                modulesToUnload.push(key);
            }
        }

        for (i = 0; i < modulesToUnload.length; i += 1) {
            delete require.cache[modulesToUnload[i]];
        }
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

    it('should be serializable', function () {
        var config;
        process.env.NODE_ENV = 'test';
        config = require('../../config');

        config.should.deep.equal(JSON.parse(JSON.stringify(config)));
    });

    it('should throw if configuration is malformed', function () {
        var config;
        process.env.NODE_ENV = 'malformed';

        (function () {
            config = require('../../config');
        }).should.throw(Error);

    });

});
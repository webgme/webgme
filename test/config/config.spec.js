/*jshint node: true, mocha: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

describe('configuration', function () {
    'use strict';

    var should = require('chai').should(),
        expect = require('chai').expect,
        oldNodeEnv = process.env.NODE_ENV || '',
        path = require('path'),
        getClientConfig = require('../../config/getclientconfig'),
        configPath = path.join(__dirname, '..', '..', 'config'),
        validateConfig,
        unloadConfigs = function () {
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
        };

    before(function () {

    });

    beforeEach(function () {
        unloadConfigs();
    });

    after(function () {
        unloadConfigs();
        process.env.NODE_ENV = oldNodeEnv;
        // restore config
        require('../../config');
    });

    it('should load global as a default config', function () {
        var config,
            configDefault = require('../../config/config.default.js');
        process.env.NODE_ENV = '';
        config = require('../../config');

        config.should.deep.equal(configDefault);
    });

    it('should load test config', function () {
        var config,
            configTest = require('../../config/config.test.js');
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

    it('should throw if configuration has extra key', function () {
        var config;
        process.env.NODE_ENV = 'test';
        config = require('../../config');
        unloadConfigs();
        validateConfig = require('../../config/validator');

        (function () {
            config.extraKey = 'something';
            validateConfig(config);
        }).should.throw(Error);
    });

    it('should throw if plugin.basePaths is not an array', function () {
        var config;
        process.env.NODE_ENV = 'test';
        config = require('../../config');
        unloadConfigs();
        validateConfig = require('../../config/validator');

        (function () {
            config.plugin.basePaths = 'something';
            validateConfig(config);
        }).should.throw(Error);
    });

    it('clientconfig should not expose mongo', function () {
        var config,
            clientConfig;
        process.env.NODE_ENV = '';
        config = require('../../config');
        clientConfig = getClientConfig(config);

        should.equal(clientConfig.hasOwnProperty('mongo'), false);
    });

    it('clientconfig should not expose executor.nonce', function () {
        var config,
            clientConfig;
        process.env.NODE_ENV = '';
        config = require('../../config');
        clientConfig = getClientConfig(config);

        should.equal(clientConfig.executor.hasOwnProperty('nonce'), false);
    });

    it('clientconfig should only expose the port of the server', function () {
        var config,
            clientConfig;
        process.env.NODE_ENV = '';
        config = require('../../config');
        clientConfig = getClientConfig(config);

        expect(clientConfig.server).to.deep.equal({port: config.server.port});
    });

    it('clientconfig should not expose authentication.jwt.private/publicKey', function () {
        var config,
            clientConfig;
        process.env.NODE_ENV = '';
        config = require('../../config');
        clientConfig = getClientConfig(config);

        should.equal(clientConfig.authentication.jwt.hasOwnProperty('privateKey'), false);
        should.equal(clientConfig.authentication.jwt.hasOwnProperty('publicKey'), false);
    });

    it('clientconfig should not expose storage.database', function () {
        var config,
            clientConfig;
        process.env.NODE_ENV = '';
        config = require('../../config');
        clientConfig = getClientConfig(config);

        should.equal(clientConfig.storage.hasOwnProperty('database'), false);
    });

    it('clientconfig should not expose socketIO.serverOptions nor socketIO.adapter', function () {
        var config,
            clientConfig;
        process.env.NODE_ENV = '';
        config = require('../../config');
        clientConfig = getClientConfig(config);

        should.equal(clientConfig.socketIO.hasOwnProperty('serverOptions'), false);
        should.equal(clientConfig.socketIO.hasOwnProperty('adapter'), false);
    });
});

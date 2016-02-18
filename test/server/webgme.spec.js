/*globals require*/
/*jshint node:true, mocha:true, expr:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('./_globals.js');


describe('webgme', function () {
    'use strict';

    var expect = testFixture.expect,
        logger = testFixture.logger.fork('webgme.spec'),
        MongoURI = require('mongodb-uri');

    it('should export public API functions and classes', function () {
        var webGME = testFixture.WebGME;

        expect(webGME).to.have.property('standaloneServer');
        expect(webGME).to.have.property('addToRequireJsPaths');
        expect(webGME).to.have.property('getStorage');
        expect(webGME).to.have.property('getGmeAuth');
        expect(webGME).to.have.property('core');
        expect(webGME).to.have.property('serializer');
        expect(webGME).to.have.property('Logger');
        expect(webGME).to.have.property('REGEXP');
    });

    it('should addToRequireJsPaths', function () {
        var webGME = testFixture.WebGME,
            gmeConfig = testFixture.getGmeConfig();

        // this should not happen because the validator checks it, unless user messes it up from code after
        // the configuration is validated
        gmeConfig.addOn.basePaths = null;
        // has two files with same name and different extension
        gmeConfig.plugin.basePaths.push('./src/client/css/themes');
        // we have added the same good plugin path multiple times
        gmeConfig.plugin.basePaths.push('./src/plugin/coreplugins');
        gmeConfig.plugin.basePaths.push('./src/plugin/coreplugins');

        gmeConfig.requirejsPaths.myModule2 = './src/plugin';
        webGME.addToRequireJsPaths(gmeConfig);

    });

    it('should throw if path does not exist addToRequireJsPaths', function () {
        var webGME = testFixture.WebGME,
            gmeConfig = testFixture.getGmeConfig();

        function fn() {
            gmeConfig.plugin.basePaths.push('./does_not_exist');
            webGME.addToRequireJsPaths(gmeConfig);
        }

        expect(fn).to.throw(Error, /ENOENT[,:] no such file or directory/);
    });

    it('should getGmeAuth', function (done) {
        var webGME = testFixture.WebGME,
            gmeConfig = testFixture.getGmeConfig();

        webGME.getGmeAuth(gmeConfig)
            .then(function (gmeAuth) {

            })
            .nodeify(done);
    });

    it('should fail to getGmeAuth if mongo is not running', function (done) {
        var webGME = testFixture.WebGME,
            gmeConfig = testFixture.getGmeConfig(),
            uri = MongoURI.parse(gmeConfig.mongo.uri),
            i, ports = [], port;

        this.timeout(5000);

        //change all ports so they will point to
        for (i = 0; i < uri.hosts.length; i += 1) {
            ports.push(uri.hosts[i].port);
        }
        for (i = 0; i < uri.hosts.length; i += 1) {
            do {
                port = 20000 + Math.round(Math.random() * 10000);
            } while (ports.indexOf(port) !== -1);
            uri.hosts[i].port = port;
        }
        gmeConfig.mongo.uri = MongoURI.format(uri);

        webGME.getGmeAuth(gmeConfig)
            .then(function () {
                done(new Error('should have failed to connect to mongo'));
            })
            .catch(function (err) {
                // TODO: check if error is failed to connect
                done();
            });
    });

    it('should getStorage', function (done) {
        var webGME = testFixture.WebGME,
            gmeConfig = testFixture.getGmeConfig();

        webGME.getGmeAuth(gmeConfig)
            .then(function (gmeAuth) {
                return webGME.getStorage(logger, gmeConfig, gmeAuth);
            })
            .then(function (storage) {

            })
            .nodeify(done);
    });

    // This test might not really belong here it's testing a _globals function.
    it('_globals should import a zipped seed', function (done) {
        var gmeConfig = testFixture.getGmeConfig(),
            storage,
            metaHash = 'b1f1f11201951f23b0d0c86d6c298389b3f8f0c0',
            gmeAuth;

        function end(err) {
            testFixture.Q.allDone([
                storage.closeDatabase(),
                gmeAuth.unload()
            ])
                .then(function () {
                    done(err);
                })
                .catch(done);
        }

        testFixture.Q.ninvoke(testFixture, 'rimraf', gmeConfig.blob.fsDir)
            .then(function () {
                return testFixture.clearDBAndGetGMEAuth(gmeConfig);
            })
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: 'FromAZip',
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/server/worker/workerrequests/exported.zip'
                });
            })
            .then(function (result) {
                return result.blobClient.getMetadata(metaHash);
            })
            .then(function (metadata) {
                expect(metadata.name).to.equal('a.txt');
            })
            .nodeify(end);
    });
});

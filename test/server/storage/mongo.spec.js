/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('Core Mongo Coverage', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        storage = new testFixture.WebGME.serverUserStorage({ //FIXME: Is this necessary??
            globConf: gmeConfig,
            logger: testFixture.logger.fork('Core Mongo Coverage:storage')
        });

    it('fails to connect to database', function (done) {
        var gmeConfigAltered = testFixture.getGmeConfig();
        this.timeout(20000);
        gmeConfigAltered.mongo.uri = 'mongodb://127.0.0.1:65535/multi';
        storage = new testFixture.WebGME.serverUserStorage({
            globConf: gmeConfigAltered,
            logger: testFixture.Logger.createWithGmeConfig('Core Mongo Coverage:fails to connect to database:storage',
                gmeConfig)
        });
        storage.openDatabase(function (err) {
            if (!err) {
                done(new Error('connection should have been failed'));
            }
            done();
        });
    });

    it('try double database closing', function (done) {
        storage = new testFixture.WebGME.serverUserStorage({
            globConf: gmeConfig,
            logger: testFixture.Logger.createWithGmeConfig('Core Mongo Coverage:try double database closing:storage',
                gmeConfig)
        });
        storage.openDatabase(function (err) {
            if (err) {
                return done(err);
            }
            storage.closeDatabase(function (err) {
                if (err) {
                    return done(err);
                }
                storage.closeDatabase(done);
            });
        });
    });
});
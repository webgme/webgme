/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('Core Mongo Coverage', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        storage = new testFixture.WebGME.serverUserStorage({
            globConf: gmeConfig,
            log: testFixture.Log.create('mongoLog')
        });

    it('fails to connect to database', function (done) {
        var gmeConfigAltered = testFixture.getGmeConfig();
        this.timeout(20000);
        gmeConfigAltered.mongo.uri = 'mongodb://127.0.0.1:65535/multi';
        storage = new testFixture.WebGME.serverUserStorage({
            globConf: gmeConfigAltered,
            log: testFixture.Log.create('mongoLog')
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
            log: testFixture.Log.create('mongoLog')
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

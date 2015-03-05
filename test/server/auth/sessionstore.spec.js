/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');


describe('session store', function () {
    'use strict';

    var SessionStore = testFixture.SessionStore,
        should = testFixture.should;

    it('creates a session store', function () {
        var sessionStore = new SessionStore();
        sessionStore.should.not.be.null;
    });


    it('fails calling check with invalid session', function (done) {
        var sessionStore = new SessionStore();
        sessionStore.check(null, function (err, authenticated) {
            authenticated.should.be.false;
            done(err);
        });
    });

    it('should fail getting user session for invalid session', function (done) {
        var sessionStore = new SessionStore();
        sessionStore.getSessionUser(null, function (err, authenticated) {
            authenticated.should.be.false;
            done(err);
        });
    });
});
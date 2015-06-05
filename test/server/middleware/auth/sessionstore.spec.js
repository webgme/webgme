/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../../_globals.js');


describe('Session store', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        logger = testFixture.logger,
        SessionStore = testFixture.SessionStore,

        superagent = testFixture.superagent,
        expect = testFixture.expect;

    describe('Memory', function () {

        var gmeConfig = testFixture.getGmeConfig(),
            server,
            agent;

        gmeConfig.server.sessionStore.type = 'Memory';

        before(function (done) {
            server = new WebGME.standaloneServer(gmeConfig);
            server.start(done);
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        after(function (done) {
            server.stop(done);
        });

        it('should create a session store', function () {
            var sessionStore = new SessionStore(logger, gmeConfig);
            expect(sessionStore).not.equal(null);
        });


        it('should get session from server', function (done) {
            agent.get(server.getUrl() + '/').end(function (err, res) {
                expect(res.status).equal(200, err);
                expect(res.headers['set-cookie']).not.equal(undefined);

                agent.get(server.getUrl() + '/index.html').end(function (err2, res2) {
                    expect(res2.status).equal(200, err2);
                    // FIXME: how to check that we reused the session?
                    //expect(res.headers['set-cookie']).equal(res2.headers['set-cookie']);

                    done();
                });
            });
        });
        
        it('creates a session store', function () {
            var sessionStore = new SessionStore(logger, gmeConfig);
            expect(sessionStore).not.equal(null);
        });
    
    
        it('fails calling check with invalid session', function (done) {
            var sessionStore = new SessionStore(logger, gmeConfig);
            sessionStore.check(null, function (err, authenticated) {
                expect(authenticated).equal(false);
                done(err);
            });
        });
    
        it('should fail getting user session for invalid session', function (done) {
            var sessionStore = new SessionStore(logger, gmeConfig);
            sessionStore.getSessionUser(null, function (err /*, authenticated*/) {
                if (err && err.message.indexOf('User was not found based on session id:') > -1) {
                    done();
                    return;
                }
                done(err);
            });
        });
    });
    
    describe('Mongo', function () {

        var gmeConfig = testFixture.getGmeConfig(),
            server,
            agent;

        gmeConfig.server.sessionStore.type = 'Mongo';
        gmeConfig.server.sessionStore.options.url = gmeConfig.mongo.uri;

        before(function (done) {
            server = new WebGME.standaloneServer(gmeConfig);
            server.start(done);
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        after(function (done) {
            server.stop(done);
        });

        it('should create a session store', function () {
            var sessionStore = new SessionStore(logger, gmeConfig);
            expect(sessionStore).not.equal(null);
        });


        it('should get session from server', function (done) {
            agent.get(server.getUrl() + '/').end(function (err, res) {
                expect(res.status).equal(200, err);
                expect(res.headers['set-cookie']).not.equal(undefined);

                agent.get(server.getUrl() + '/index.html').end(function (err2, res2) {
                    expect(res2.status).equal(200, err2);
                    // FIXME: how to check that we reused the session?
                    //expect(res.headers['set-cookie']).equal(res2.headers['set-cookie']);

                    done();
                });
            });
        });
    });

    describe('Redis', function () {

        var gmeConfig = testFixture.getGmeConfig(),
            server,
            agent;

        gmeConfig.server.sessionStore.type = 'Redis';

        before(function (done) {
            server = new WebGME.standaloneServer(gmeConfig);
            server.start(done);
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        after(function (done) {
            server.stop(done);
        });

        it('should create a session store', function () {
            var sessionStore = new SessionStore(logger, gmeConfig);
            expect(sessionStore).not.equal(null);
        });


        // FIXME: we will need redis running on developer's machines and on travis
        it.skip('should get session from server', function (done) {
            agent.get(server.getUrl() + '/').end(function (err, res) {
                expect(res.status).equal(200, err);
                expect(res.headers['set-cookie']).not.equal(undefined);

                agent.get(server.getUrl() + '/index.html').end(function (err2, res2) {
                    expect(res2.status).equal(200, err2);
                    // FIXME: how to check that we reused the session?
                    //expect(res.headers['set-cookie']).equal(res2.headers['set-cookie']);

                    done();
                });
            });
        });
    });
    
});
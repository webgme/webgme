/*globals require, WebGMEGlobal*/
/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals.js');

describe('issue 171 server crashes when trying to switch to non-existent branch', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        requirejs = testFixture.requirejs,
        ClientClass,
        WebGME = testFixture.WebGME,
        Q = testFixture.Q,
        projectName = 'issue171',
        client,
        should = testFixture.should,
        server;


    requirejs.config({
        nodeRequire: require,
        paths: {
            'eventDispatcher': 'common/EventDispatcher',
            ' /socket.io/socket.io.js': 'socketio-client'
        }
    });

    gmeConfig.server.port = 9003;
    server = new WebGME.standaloneServer(gmeConfig);
    ClientClass = requirejs('client/js/client');

    before(function (done) {
        server.start(function () {
            client = new ClientClass({host: ' ', gmeConfig: gmeConfig});
            done();
        });
    });

    after(function (done) {
        server.stop(done);
    });

    it('should send error without opened database connection', function (done) {
        Q.ninvoke(client, 'selectBranchAsync', 'other')
            .catch(function (err) {
                // expected to fail
                // TODO: check [Error: there is no open project!]
                err.should.exist;
            })
            .nodeify(done);
    });

    it('should send error without opened project', function (done) {
        Q.ninvoke(client, 'connectToDatabaseAsync', {})
            .then(function () {
                return Q.ninvoke(client, 'selectBranchAsync', 'other');
            })
            .catch(function (err) {
                // expected to fail
                // TODO: check [Error: there is no open project!]
                err.should.exist;
            })
            .nodeify(done);
    });

    it('initially should be only the master branch', function (done) {
        Q.ninvoke(client, 'deleteProjectAsync', projectName)
            .then(function () {
                return Q.ninvoke(client, 'createProjectAsync', projectName, {});
            })
            .then(function () {
                return Q.ninvoke(client, 'selectProjectAsync', projectName);
            })
            .then(function () {
                return Q.ninvoke(client, 'getBranchesAsync');
            })
            .then(function (branches) {
                branches.should.have.length(1);
                branches[0].should.have.property('name', 'master');
            })
            .nodeify(done);
    });

    it('should get some error when selecting non-existent branch', function (done) {
        Q.ninvoke(client, 'selectBranchAsync', 'm')
            .catch(function (err) {
                // expected to fail
                // TODO: check [Error: there is no open project!]
                err.should.exist;
            })
            .nodeify(done);
    });
});
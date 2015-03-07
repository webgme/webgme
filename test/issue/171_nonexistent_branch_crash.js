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
        config = WebGMEGlobal.getConfig(),
        projectName = 'issue171',
        client,
        should = testFixture.should,
        server;


    requirejs.config({
        nodeRequire: require,
        paths: {
            'logManager': 'common/LogManager',
            'storage': 'common/storage',
            'core': 'common/core',
            'server': 'server',
            'auth': 'server/auth',
            'util': 'common/util',
            'baseConfig': 'bin/getconfig',
            'webgme': 'webgme',
            'plugin': 'plugin',
            'worker': 'server/worker',
            'coreclient': 'common/core/users',
            'blob': 'middleware/blob',
            'eventDispatcher': 'common/EventDispatcher',
            ' /socket.io/socket.io.js': 'socketio-client'
        }
    });

    config.port = 9003;
    server = new WebGME.standaloneServer(config);
    ClientClass = requirejs('client/js/client');

    before(function (done) {
        server.start(function () {
            client = new ClientClass({host: ' ', port: config.port});
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
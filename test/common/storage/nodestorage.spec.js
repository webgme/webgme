/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');

describe('storage nodestorage', function () {
    'use strict';
    var NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,

        logger = testFixture.logger.fork('nodestorage'),

        server,
        host;

    before(function (done) {
        server = WebGME.standaloneServer(gmeConfig);
        host = '127.0.0.1' /*server.getUrl()*/;
        server.start(done);
    });

    after(function (done) {
        server.stop(done);
    });

    it('should create a node storage', function () {
        var nodeStorage = NodeStorage.createStorage(host, null, logger, gmeConfig);
        expect(nodeStorage).to.not.equal(undefined);
        expect(nodeStorage).to.not.equal(null);
        expect(typeof nodeStorage).to.equal('object');
    });
});
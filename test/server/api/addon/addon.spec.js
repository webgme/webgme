/*globals require*/
/*jshint node:true, mocha:true, expr:true*/
/*jscs:disable maximumLineLength*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');


describe('ADDON REST API', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        expect = testFixture.expect,

        superagent = testFixture.superagent;

    describe('ADD_ON SPECIFIC API', function () {
        var server,
            agent;

        before(function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            gmeConfig.plugin.allowServerExecution = true;
            gmeConfig.plugin.serverResultTimeout = 10000;

            server = WebGME.standaloneServer(gmeConfig);
            server.start(done);
        });

        after(function (done) {
            server.stop(done);
        });

        beforeEach(function () {
            agent = superagent.agent();
        });


        it('should list all available addOns /api/addOns', function (done) {
            agent.get(server.getUrl() + '/api/v1/addOns/')
                .end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body instanceof Array).to.equal(true);
                    expect(res.body).to.include('TestAddOn', 'ConstraintAddOn');
                    done();
                });
        });
    });
});

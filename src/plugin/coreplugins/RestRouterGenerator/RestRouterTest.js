var testFixture = require('../globals'),
    superagent = testFixture.superagent,
    expect = testFixture.expect,
    gmeConfig = testFixture.getGmeConfig(),
    server = testFixture.WebGME.standaloneServer(gmeConfig),
    mntPt = require('../../webgme-setup.json').components.routers['<%= restRouterName %>'].mount,
    urlFor = function(action) {
        return [
            server.getUrl(),
            mntPt,
            action
        ].join('/');
    };

describe('<%= restRouterName %>', function() {

    before(function(done) {
        server.start(done);
    });

    after(function(done) {
        server.stop(done);
    });

    it('should post to /postExample', function(done) {
        superagent.post(urlFor('postExample'))
            .end(function(err, res) {
                expect(res.statusCode).to.equal(201);
                done();
            });
    });

    it('should delete to /deleteExample', function(done) {
        superagent.delete(urlFor('deleteExample'))
            .end(function(err, res) {
                expect(res.statusCode).to.equal(204);
                done();
            });
    });

    it('should patch to /patchExample', function(done) {
        superagent.patch(urlFor('patchExample'))
            .end(function(err, res) {
                expect(res.statusCode).to.equal(200);
                done();
            });
    });

    it('should get to /getExample', function(done) {
        superagent.get(urlFor('getExample'))
            .end(function(err, res) {
                expect(res.statusCode).to.equal(200);
                done();
            });
    });

    it('should get to /error', function(done) {
        superagent.get(urlFor('error'))
            .end(function(err, res) {
                expect(res.statusCode).to.equal(500);
                done();
            });
    });

});

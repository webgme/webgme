/*globals WebGMEGlobal*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('BlobServer', function () {
    'use strict';

    var agent = testFixture.superagent.agent(),
        should = testFixture.should,
        rimraf = testFixture.rimraf,
        BlobClient = testFixture.BlobClient,
        Artifact = testFixture.requirejs('blob/Artifact'),
        server,
        serverBaseUrl,
        bcParam = {};

    beforeEach(function (done) {
        // we have to set the config here
        var config = WebGMEGlobal.getConfig();
        config.port = 9005;
        config.authentication = false;
        config.httpsecure = false;
        bcParam.serverPort = config.port;
        bcParam.server = '127.0.0.1';
        bcParam.httpsecure = config.httpsecure;
        rimraf('./test-tmp/blob-storage', function (err) {
            if (err) {
                done(err);
                return;
            }
            serverBaseUrl = 'http://127.0.0.1:' + config.port;
            server = testFixture.WebGME.standaloneServer(config);
            server.start(function (err) {
                done(err);
            });
        });
    });

    afterEach(function (done) {
        server.stop(done);
    });

    it('should return 200 at /rest/blob/metadata', function (done) {
        agent.get(serverBaseUrl + '/rest/blob/metadata').end(function (err, res) {
            if (err) {
                done(err);
                return;
            }
            should.equal(res.status, 200);
            done();
        });
    });

    it('should return 500 at /rest/blob/metadata/non-existing-hash', function (done) {
        agent.get(serverBaseUrl + '/rest/blob/metadata/non-existing-hash').end(function (err, res) {
            if (err) {
                done(err);
                return;
            }
            should.equal(res.status, 500);
            done();
        });
    });

    it('should return empty object at /rest/blob/metadata/ with no public metadata', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('notPublic', bc);
        artifact.save(function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            agent.get(serverBaseUrl + '/rest/blob/metadata/' + hash).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                should.equal(res.body.isPublic, false);
                agent.get(serverBaseUrl + '/rest/blob/metadata').end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(Object.keys(res.body).length, 0);
                    done();
                });
            });
        });
    });

    it('should return metadata at /rest/blob/metadata/ with public metadata', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('public', bc, {
                name: 'public.zip',
                size: 0,
                mime: 'application/zip',
                content: {},
                contentType: 'complex',
                isPublic: true
            });
        artifact.save(function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            agent.get(serverBaseUrl + '/rest/blob/metadata/' + hash).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                should.equal(res.body.isPublic, true);
                agent.get(serverBaseUrl + '/rest/blob/metadata').end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(res.body[hash].name, 'public.zip');
                    done();
                });
            });
        });
    });

    it('should download non-public artifact at /rest/blob/download/valid-hash', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('notPublic', bc);
        artifact.addFile('tt.txt', 'ttt', function (err/*, fHash*/) {
            if (err) {
                done(err);
                return;
            }
            artifact.save(function (err, hash) {
                if (err) {
                    done(err);
                    return;
                }
                agent.get(serverBaseUrl + '/rest/blob/download/' + hash).end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(res.header['content-disposition'], 'attachment; filename=notPublic.zip');
                    done();
                });
            });
        });
    });

    it.skip('should download empty artifact at /rest/blob/download/valid-hash', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('notPublic', bc);
        artifact.save(function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            agent.get(serverBaseUrl + '/rest/blob/download/' + hash).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                should.equal(res.header['content-disposition'], 'attachment; filename=notPublic.zip');
                done();
            });
        });
    });
});
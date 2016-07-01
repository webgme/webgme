/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('BlobServer', function () {
    'use strict';

    var agent = testFixture.superagent.agent(),
        should = testFixture.should,
        expect = testFixture.expect,
        rimraf = testFixture.rimraf,
        BlobClient = testFixture.BlobClient,
        Artifact = testFixture.requirejs('blob/Artifact'),
        contentDisposition = require('content-disposition'),
        server,
        serverBaseUrl,
        bcParam = {};

    beforeEach(function (done) {
        // we have to set the config here
        var gmeConfig = testFixture.getGmeConfig();
        serverBaseUrl = 'http://127.0.0.1:' + gmeConfig.server.port;
        bcParam.serverPort = gmeConfig.server.port;
        bcParam.server = '127.0.0.1';
        bcParam.httpsecure = false;
        bcParam.logger = testFixture.logger.fork('BlobServer:Blob');

        rimraf('./test-tmp/blob-storage', function (err) {
            if (err) {
                done(err);
                return;
            }

            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(function (err) {
                done(err);
            });
        });
    });

    afterEach(function (done) {
        if (server) {
            server.stop(done);
        } else {
            done();
        }
    });

    it('should return 200 at /rest/blob/metadata', function (done) {
        agent.get(serverBaseUrl + '/rest/blob/metadata').end(function (err, res) {
            should.equal(res.status, 200, err);
            server.stop(function (err) {
                server = null;
                done(err);
            });
        });
    });

    it('should return 500 at /rest/blob/createMetadata if data is malformed', function (done) {
        agent.post(serverBaseUrl + '/rest/blob/createMetadata')
            .type('text')
            .send('hello')
            .end(function (err, res) {
                should.equal(res.status, 500, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
    });

    it('should return 404 at /rest/blob/metadata/non-existing-hash', function (done) {
        agent.get(serverBaseUrl + '/rest/blob/metadata/non-existing-hash').end(function (err, res) {
            should.equal(res.status, 404, err);
            server.stop(function (err) {
                server = null;
                done(err);
            });
        });
    });

    it('should return 404 at /rest/blob/download/non-existing-hash', function (done) {
        agent.get(serverBaseUrl + '/rest/blob/download/non-existing-hash').end(function (err, res) {
            should.equal(res.status, 404, err);
            server.stop(function (err) {
                server = null;
                done(err);
            });
        });
    });

    it('should return 404 at /rest/blob/view/non-existing-hash', function (done) {
        agent.get(serverBaseUrl + '/rest/blob/view/non-existing-hash').end(function (err, res) {
            should.equal(res.status, 404, err);
            server.stop(function (err) {
                server = null;
                done(err);
            });
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
                should.equal(res.status, 200, err);
                should.equal(res.body.isPublic, false);
                agent.get(serverBaseUrl + '/rest/blob/metadata').end(function (err, res) {
                    should.equal(res.status, 200, err);
                    should.equal(Object.keys(res.body).length, 0);
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
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
                should.equal(res.status, 200, err);
                should.equal(res.body.isPublic, true);
                agent.get(serverBaseUrl + '/rest/blob/metadata').end(function (err, res) {
                    should.equal(res.status, 200, err);
                    should.equal(res.body[hash].name, 'public.zip');
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
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
                    var checkContentDisposition = function () {
                        return contentDisposition.parse(res.header['content-disposition']);
                    };
                    should.equal(res.status, 200, err);
                    expect(checkContentDisposition).to.not.throw(TypeError);
                    should.equal(checkContentDisposition().parameters.filename, 'notPublic.zip');
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
                });
            });
        });
    });

    it('should download non-public artifact "Case (1).zip" at /rest/blob/download/valid-hash', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('Case (1)', bc);
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
                    var checkContentDisposition = function () {
                        return contentDisposition.parse(res.header['content-disposition']);
                    };
                    should.equal(res.status, 200, err);
                    expect(checkContentDisposition).to.not.throw(TypeError);
                    should.equal(checkContentDisposition().parameters.filename, 'Case (1).zip');
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
                });
            });
        });
    });

    it('should download empty artifact at /rest/blob/download/valid-hash', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('notPublic', bc);
        artifact.save(function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            agent.get(serverBaseUrl + '/rest/blob/download/' + hash).end(function (err, res) {
                var checkContentDisposition = function () {
                    return contentDisposition.parse(res.header['content-disposition']);
                };
                should.equal(res.status, 200, err);
                expect(checkContentDisposition).to.not.throw(TypeError);
                should.equal(checkContentDisposition().parameters.filename, 'notPublic.zip');
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should view non-public artifact at /rest/blob/view/valid-hash', function (done) {
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
                agent.get(serverBaseUrl + '/rest/blob/view/' + hash).end(function (err, res) {
                    var checkContentDisposition = function () {
                        return contentDisposition.parse(res.header['content-disposition']);
                    };
                    should.equal(res.status, 200, err);
                    expect(checkContentDisposition).to.not.throw(TypeError);
                    should.equal(checkContentDisposition().parameters.filename, 'notPublic.zip');
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
                });
            });
        });
    });

    it('should view empty artifact at /rest/blob/view/valid-hash', function (done) {
        var bc = new BlobClient(bcParam),
            artifact = new Artifact('notPublic', bc);
        artifact.save(function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            agent.get(serverBaseUrl + '/rest/blob/view/' + hash).end(function (err, res) {
                var checkContentDisposition = function () {
                    return contentDisposition.parse(res.header['content-disposition']);
                };
                should.equal(res.status, 200, err);
                expect(checkContentDisposition).to.not.throw(TypeError);
                should.equal(checkContentDisposition().parameters.filename, 'notPublic.zip');
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

});

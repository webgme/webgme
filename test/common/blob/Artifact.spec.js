/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('Blob Artifact', function () {
    'use strict';
    var Artifact = testFixture.requirejs('blob/Artifact'),
        rimraf = testFixture.rimraf,
        should = testFixture.should,
        expect = testFixture.expect,
        superagent = testFixture.superagent,
        agent = superagent.agent(),
        BlobClient = testFixture.BlobClient,
        server,
        serverBaseUrl,

        bcParam = {};

    describe('[http]', function () {
        before(function (done) {
            // we have to set the config here
            var gmeConfig = testFixture.getGmeConfig();
            serverBaseUrl = 'http://127.0.0.1:' + gmeConfig.server.port;
            bcParam.serverPort = gmeConfig.server.port;
            bcParam.server = '127.0.0.1';
            bcParam.httpsecure = false;
            bcParam.logger = testFixture.logger.fork('Blob');
            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(function () {
                done();
            });
        });

        beforeEach(function (done) {
            rimraf('./test-tmp/blob-storage', function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });

        after(function (done) {
            server.stop(done);
        });

        it('should addFile', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            artifact.addFile('a.txt', 'tttt', function (err, hash) {
                if (err) {
                    done(err);
                    return;
                }
                var url = bc.getViewURL(hash);
                agent.get(url).end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(res.text, 'tttt');
                    done();
                });
            });
        });

        it('should addFiles', function (done) {
            var bc = new BlobClient(bcParam),
                filesToAdd = {
                    'a.txt': 'tttt'
                },
                artifact = new Artifact('testartifact', bc);
            artifact.addFiles(filesToAdd, function (err, hashes) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(hashes.length, 1);
                var url = bc.getViewURL(hashes[0]);
                agent.get(url).end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(res.text, 'tttt');
                    done();
                });
            });
        });

        it('should succeed with no files addFiles', function (done) {
            var bc = new BlobClient(bcParam),
                filesToAdd = {},
                artifact = new Artifact('testartifact', bc);
            artifact.addFiles(filesToAdd, function (err, hashes) {
                if (err) {
                    done(err);
                    return;
                }
                expect(hashes).deep.equal([]);
                done();
            });
        });

        it('should addFileAsSoftLink', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            artifact.addFileAsSoftLink('a.txt', 'tttt', function (err, hash) {
                if (err) {
                    done(err);
                    return;
                }
                var url = bc.getViewURL(hash);
                agent.get(url).end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(res.text, 'tttt');
                    done();
                });
            });
        });

        it('should addFilesAsSoftLinks', function (done) {
            var bc = new BlobClient(bcParam),
                filesToAdd = {
                    'a.txt': 'tttt'
                },
                artifact = new Artifact('testartifact', bc);
            artifact.addFilesAsSoftLinks(filesToAdd, function (err, hashes) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(hashes.length, 1);
                var url = bc.getViewURL(hashes[0]);
                agent.get(url).end(function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(res.status, 200);
                    should.equal(res.text, 'tttt');
                    done();
                });
            });
        });

        it('should succeed with no files addFilesAsSoftLinks', function (done) {
            var bc = new BlobClient(bcParam),
                filesToAdd = {},
                artifact = new Artifact('testartifact', bc);
            artifact.addFilesAsSoftLinks(filesToAdd, function (err, hashes) {
                if (err) {
                    done(err);
                    return;
                }
                expect(hashes).deep.equal([]);
                done();
            });
        });

        it('should addObjectHash', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            bc.putFile('a.txt', 'tttt', function (err, hash) {
                if (err) {
                    done(err);
                    return;
                }
                artifact.addObjectHash('a.txt', hash, function (err, hash) {
                    if (err) {
                        done(err);
                        return;
                    }
                    var url = bc.getViewURL(hash);
                    agent.get(url).end(function (err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        should.equal(res.status, 200);
                        should.equal(res.text, 'tttt');
                        done();
                    });
                });
            });
        });

        it('should fail to add invalid object hash addObjectHash', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            artifact.addObjectHash('a.txt', 'invalid hash', function (err/*, hash*/) {
                if (err.indexOf('hash is invalid') > -1) {
                    done();
                    return;
                }
                done(new Error('should have failed to add an invalid hash to artifact ' + err));
            });
        });

        it('should fail to add different content with the same name addObjectHash', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            bc.putFile('a.txt', 'tttt', function (err, hash) {
                if (err) {
                    done(new Error(err));
                    return;
                }
                artifact.addObjectHash('a.txt', hash, function (err/*, hash*/) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    artifact.addObjectHash('a.txt', hash, function (err/*, hash*/) {
                        if (err.message.indexOf('same name was already added') > -1) {
                            done();
                            return;
                        }
                        done(new Error('should have failed to add objects with the same name ' + err));
                    });
                });
            });
        });

        it('should addObjectHashes', function (done) {
            var bc = new BlobClient(bcParam),
                filesToAdd = {
                    'a.txt': 'tttt'
                },
                artifact = new Artifact('testartifact', bc);
            bc.putFiles(filesToAdd, function (err, objHashes) {
                if (err) {
                    done(err);
                    return;
                }
                artifact.addObjectHashes(objHashes, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, artHash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var url = bc.getViewURL(artHash, 'a.txt');
                        agent.get(url).end(function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            should.equal(res.status, 200);
                            should.equal(res.text, 'tttt');
                            done();
                        });
                    });

                });
            });
        });

        it('should succeed with no hashes addObjectHashes', function (done) {
            var bc = new BlobClient(bcParam),
                objHashes = {},
                artifact = new Artifact('testartifact', bc);

            artifact.addObjectHashes(objHashes, function (err, hashes) {
                if (err) {
                    done(err);
                    return;
                }
                expect(hashes).deep.equal([]);
                done();
            });
        });

        it('should fail to add invalid object hash addMetadataHash', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            artifact.addMetadataHash('a.txt', 'invalid hash', function (err/*, hash*/) {
                if (err.message.indexOf('hash is invalid') > -1) {
                    done();
                    return;
                }
                done(new Error('should have failed to add an invalid hash to artifact ' + err));
            });
        });


        it('should fail to add different content with the same name addMetadataHash', function (done) {
            var bc = new BlobClient(bcParam),
                artifact = new Artifact('testartifact', bc);
            bc.putFile('a.txt', 'tttt', function (err, hash) {
                if (err) {
                    done(new Error(err));
                    return;
                }
                artifact.addMetadataHash('a.txt', hash, function (err, hash) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    artifact.addMetadataHash('a.txt', hash, function (err/*, hash*/) {
                        if (err.message.indexOf('same name was already added') > -1) {
                            done();
                            return;
                        }
                        done(new Error('should have failed to add objects with the same name ' + err));
                    });
                });
            });
        });

        it('should fail with wrong hash addObjectHashes', function (done) {
            var bc = new BlobClient(bcParam),
                objHashes = {
                    'a.txt': '0123456789abcdef0123456789abcdef01234567'
                },
                artifact = new Artifact('testartifact', bc);

            artifact.addObjectHashes(objHashes, function (err/*, hashes*/) {
                if (err) {
                    done();
                    return;
                }
                done(new Error('should have failed with bad hashes.'));
            });
        });

        it('should fail with wrong hashes addMetadataHashes', function (done) {
            var bc = new BlobClient(bcParam),
                objHashes = {
                    'a.txt': '0123456789abcdef0123456789abcdef01234567'
                },
                artifact = new Artifact('testartifact', bc);

            artifact.addMetadataHashes(objHashes, function (err/*, hashes*/) {
                if (err) {
                    done();
                    return;
                }
                done(new Error('should have failed with bad hashes.'));
            });
        });

        it('should succeed with no hashes addMetadataHashes', function (done) {
            var bc = new BlobClient(bcParam),
                objHashes = {},
                artifact = new Artifact('testartifact', bc);

            artifact.addMetadataHashes(objHashes, function (err, hashes) {
                if (err) {
                    done(new Error(err));
                    return;
                }
                expect(hashes).deep.equal([]);
                done();
            });
        });
    });
});

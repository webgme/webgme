/*globals WebGMEGlobal*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('BlobServerClient', function () {
    'use strict';

    var rimraf = testFixture.rimraf,
        should = testFixture.should,
        BlobServerClient = testFixture.BlobServerClient,
        blobClient,
        server,
        serverBaseUrl;

    describe('[http]', function () {
        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig(),
                param = {};
            config.port = 9004;
            config.authentication = false;
            config.httpsecure = false;

            param.serverPort = config.port;
            param.sessionId = 'testingBlobServerClient';
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = testFixture.WebGME.standaloneServer(config);
            server.start(function () {
                blobClient = new BlobServerClient(param);
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

        it('Should putFile and getObject', function (done) {
            var fName = 'text1.txt',
                fContent = 'a text file text';
            blobClient.putFile(fName, fContent, function (err, objHash) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(typeof objHash, 'string');
                blobClient.getObject(objHash, function (err, data) {
                    var text;
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(data instanceof Buffer, true);
                    text = data.toString('utf8');
                    should.equal(text, fContent);
                    done();
                });
            });
        });

        it('Should addFile and save artifact', function (done) {
            var artifact = blobClient.createArtifact('textFile'),
                fName = 'text.txt',
                fContent = 'text file text';
            artifact.addFile(fName, fContent, function (err, objHash) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(typeof objHash, 'string');
                artifact.save(function (err, artieHash) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(typeof artieHash, 'string');
                    blobClient.getObject(objHash, function (err, data) {
                        var text;
                        if (err) {
                            done(err);
                            return;
                        }
                        should.equal(data instanceof Buffer, true);
                        text = data.toString('utf8');
                        should.equal(text, fContent);
                        blobClient.getMetadata(artieHash, function (err, metadata) {
                            if (err) {
                                done(err);
                                return;
                            }
                            should.equal(typeof metadata, 'object');
                            should.equal(metadata.mime, 'application/zip');
                            should.equal(metadata.name, 'textFile.zip');
                            done();
                        });
                    });
                });
            });
        });

        it('Should addFiles and save artifact', function (done) {
            var artifact = blobClient.createArtifact('testFiles'),
                filesToAdd = {
                    'a.txt': 'This is text',
                    'a.json': '{a: 1}'
                };
            artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                if (err) {
                    done(err);
                    return;
                }
                artifact.save(function (err, hash) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(typeof hash, 'string');
                    done();
                });
            });
        });

        it('getObject should return 404 for invalid hash', function (done) {
            blobClient.getObject('this_is_not_a_valid_hash', function (err/*, data*/) {
                should.equal(err, 404);
                done();
            });
        });

        it('getObject should return 500 for nonexisting hash', function (done) {
            blobClient.getObject('a2b766e677947ad890b1b8d689557c2ed0ebd878', function (err/*, data*/) {
                should.equal(err, 500);
                done();
            });
        });

        it('getMetadata should return 500 for invalid hash', function (done) {
            blobClient.getMetadata('this_is_not_a_valid_hash', function (err/*, data*/) {
                should.equal(err, 500);
                done();
            });
        });

        it('getMetadata should return 500 for nonexisting hash', function (done) {
            blobClient.getMetadata('a2b766e677947ad890b1b8d689557c2ed0ebd878', function (err/*, data*/) {
                should.equal(err, 500);
                done();
            });
        });
    });
});
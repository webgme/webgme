/*globals describe, it, before, after, beforeEach, WebGMEGlobal, WebGME*/
/*jshint node:true*/
/**
 * @author ksmyth / https://github.com/ksmyth
 */

require('../../_globals.js');

var requirejs = require('requirejs'),
    rimraf = require('rimraf'),
    chai = require('chai'),
    should = chai.should(),
    superagent = require('superagent'),
    agent = superagent.agent(),
    expect = chai.expect,
    BlobClient = requirejs('blob/BlobClient'),
    Artifact = requirejs('blob/Artifact'),
    server,
    serverBaseUrl;

describe('Artifact', function () {
    'use strict';
    var bcParam = {};

    describe('[http]', function () {
        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig();
            config.port = 9006;
            config.authentication = false;
            config.httpsecure = false;

            serverBaseUrl = 'http://127.0.0.1:' + config.port;
            bcParam.serverPort = config.port;
            bcParam.server = '127.0.0.1';
            bcParam.httpsecure = config.httpsecure;
            server = WebGME.standaloneServer(config);
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
                    console.log(res);
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
                    console.log(res);
                    should.equal(res.status, 200);
                    should.equal(res.text, 'tttt');
                    done();
                });
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
                    console.log(res);
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
                    console.log(res);
                    should.equal(res.status, 200);
                    should.equal(res.text, 'tttt');
                    done();
                });
            });
        });
    });
});
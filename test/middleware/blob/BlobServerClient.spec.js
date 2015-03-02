/*globals require, describe, it, before, after, WebGMEGlobal, WebGME, setInterval, clearInterval*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

require('../../_globals.js');

var requirejs = require('requirejs'),
    fs = require('fs'),
    should = require('chai').should(),
    BlobServerClient = requirejs('blob/BlobServerClient'),
    blobClient,
    server,
    serverBaseUrl;

describe('BlobServerClient', function () {
    'use strict';

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

            server = WebGME.standaloneServer(config);
            server.start(function () {
                blobClient = new BlobServerClient(param);
                done();
            });
        });

        after(function (done) {
            server.stop(done);
        });

        it('Should addFiles and save artifact', function (done) {
            var artifact = blobClient.createArtifact('testFiles'),
                filesToAdd = {
                    'a.txt': 'This is text',
                    'a.json': '{a: 1}'
                };
            artifact.addFiles(filesToAdd, function (err, hashes) {
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
    });

    //describe('[https]', function () {
    //    before(function (done) {
    //        // we have to set the config here
    //        var config = WebGMEGlobal.getConfig(),
    //            param = {};
    //        config.port = 9005;
    //        config.authentication = false;
    //        config.httpsecure = true;
    //
    //        param.serverPort = config.port;
    //        param.httpsecure = true;
    //        serverBaseUrl = 'https://127.0.0.1:' + config.port;
    //
    //        server = WebGME.standaloneServer(config);
    //        server.start(function () {
    //            blobClient = new BlobServerClient(param);
    //            done();
    //        });
    //    });
    //
    //    after(function (done) {
    //        server.stop(done);
    //    });
    //
    //    it('Should addFiles and save artifact', function (done) {
    //        var artifact = blobClient.createArtifact('testFiles'),
    //            filesToAdd = {
    //                'a.txt': 'This is text',
    //                'a.json': '{a: 1}'
    //            };
    //        artifact.addFiles(filesToAdd, function (err, hashes) {
    //            if (err) {
    //                done(err);
    //                return;
    //            }
    //            artifact.save(function (err, hash) {
    //                if (err) {
    //                    done(err);
    //                    return;
    //                }
    //                should.equal(typeof hash, 'string');
    //                done();
    //            });
    //        });
    //    });
    //});
});
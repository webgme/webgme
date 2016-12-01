/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../_globals');

describe('BLOB cleanup script tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        cleanup = require('../../src/bin/blob_fs_clean_up'),
        BlobClient = require('../../src/server/middleware/blob/BlobClientWithFSBackend'),
        FS = require('fs'),
        Q = testFixture.Q,
        logger = testFixture.logger.fork('blob_fs_cleanup.spec'),
        bc = new BlobClient(gmeConfig, logger.fork('BlobClient')),
        storage,
        gmeAuth,
        importResult,
        projectName = 'cleanupTestProject',
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write;

    before(function (done) {

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'test/bin/blob_fs_clean_up/projWithAsset.webgmex',
                        projectName: projectName,
                        branchName: 'master',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (importResult_) {
                importResult = importResult_;
            })
            .nodeify(done);
    });

    beforeEach(function () {
        console.log = function () {
        };
        process.stdout.write = function () {
        };
        console.warn = function () {

        };
    });

    afterEach(function () {
        console.log = oldLogFunction;
        console.warn = oldWarnFunction;
        process.stdout.write = oldStdOutFunction;
    });

    it('should log if wrong input are given', function (done) {
        cleanup({input: 'unknown.file'})
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contains('no such file or directory');
                done();
            })
            .done();
    });

    it('should log if wrong input format are given', function (done) {
        FS.writeFileSync('test-tmp/not.json', 'not json file', 'utf8');
        cleanup({input: 'test-tmp/not.json'})
            .then(function () {
                FS.unlinkSync('test-tmp/not.json');
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contains('Unexpected token o');
                FS.unlinkSync('test-tmp/not.json');
                done();
            })
            .done();
    });

    it('should log if wrong hashes are given', function (done) {
        FS.writeFileSync('test-tmp/wrongHashes.json', JSON.stringify(['hashOne', 'hashTwo']), 'utf8');
        cleanup({input: 'test-tmp/wrongHashes.json'})
            .then(function () {
                FS.unlinkSync('test-tmp/wrongHashes.json');
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contains('no such file or directory, unlink');
                FS.unlinkSync('test-tmp/wrongHashes.json');
                done();
            })
            .done();
    });

    it('should list the proper unused hashes', function (done) {
        var logOut = '',
            metaHash;

        console.log = function (data) {
            logOut += data;
        };
        Q.ninvoke(bc, 'putFile', 'test.txt', "just some single file")
            .then(function (fileMetaHash) {
                metaHash = fileMetaHash;
                return cleanup();
            })
            .then(function () {
                expect(logOut).to.contains(metaHash);
            })
            .nodeify(done);
    });

    it('should remove unused hash', function (done) {
        var metaHash;

        Q.ninvoke(bc, 'putFile', 'test.txt', "just some single file")
            .then(function (fileMetaHash) {
                metaHash = fileMetaHash;
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).to.include(metaHash);
                return cleanup({del: true});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).not.to.include(metaHash);
            })
            .nodeify(done);
    });

    it('should remove multiple unused hashes', function (done) {
        var metaHashes = [];

        Q.ninvoke(bc, 'putFile', 'test.txt', "just some single file")
            .then(function (fileMetaHash) {
                metaHashes.push(fileMetaHash);
                return Q.ninvoke(bc, 'putFile', 'test.txt', "just some other single file");
            })
            .then(function (fileMetaHash) {
                metaHashes.push(fileMetaHash);
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).to.include.members(metaHashes);
                return cleanup({del: true});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).not.to.include.members(metaHashes);
            })
            .nodeify(done);
    });

    it('should remove selected hash', function (done) {
        var metaHash;

        Q.ninvoke(bc, 'putFile', 'test.txt', "just some single file")
            .then(function (fileMetaHash) {
                metaHash = fileMetaHash;
                FS.writeFileSync('test-tmp/goodHash.json', JSON.stringify([metaHash]), 'utf8');
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).to.include(metaHash);
                return cleanup({input: 'test-tmp/goodHash.json'});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).not.to.include(metaHash);
                FS.unlinkSync('test-tmp/goodHash.json');
                done();
            })
            .catch(function (err) {
                FS.unlinkSync('test-tmp/goodHash.json');
                done(err);
            })
            .done();
    });

    it('should remove complex hashes', function (done) {
        var artifact = bc.createArtifact('myArtifact'),
            complexHash;

        artifact.addFiles({'one.txt': 'one', 'two.txt': 'two', 'three.txt': 'three'})
            .then(function () {
                return artifact.save();
            })
            .then(function (hash_) {
                complexHash = hash_;

                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).to.include(complexHash);
                return cleanup({del: true});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).not.to.include(complexHash);
            })
            .nodeify(done);
    });

    it('should remove complex-soft hashes', function (done) {
        var artifact = bc.createArtifact('myArtifact'),
            sofLinkedHash;

        artifact.addFilesAsSoftLinks({'one.txt': 'one', 'two.txt': 'two', 'three.txt': 'three'})
            .then(function () {
                return artifact.save();
            })
            .then(function (hash_) {
                sofLinkedHash = hash_;

                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).to.include(sofLinkedHash);
                return cleanup({del: true});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (allHashes) {
                expect(allHashes).not.to.include(sofLinkedHash);
            })
            .nodeify(done);
    });

    it('should keep complex hashes if they are used', function (done) {
        var artifact = bc.createArtifact('myArtifact'),
            complexHash;

        artifact.addFiles({'one.txt': 'one', 'two.txt': 'two', 'three.txt': 'three'})
            .then(function () {
                return artifact.save();
            })
            .then(function (hash_) {
                complexHash = hash_;
                importResult.core.setAttribute(importResult.rootNode, 'myAsset', complexHash);
                var persisted = importResult.core.persist(importResult.rootNode);
                return importResult.project.makeCommit(null,
                    [importResult.commitHash], persisted.rootHash, persisted.objects, 'adding complex asset');
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (all) {
                expect(all).to.contains.members([complexHash]);
                return cleanup({del: true});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (all) {
                expect(all).to.contains.members([complexHash]);
            })
            .nodeify(done);
    });

    it('should keep complex-soft hashes if they are used', function (done) {
        var artifact = bc.createArtifact('myArtifact'),
            softHash;

        artifact.addFilesAsSoftLinks({'one.txt': 'one', 'two.txt': 'two', 'three.txt': 'three'})
            .then(function () {
                return artifact.save();
            })
            .then(function (hash_) {
                softHash = hash_;
                importResult.core.setAttribute(importResult.rootNode, 'myAsset', softHash);
                var persisted = importResult.core.persist(importResult.rootNode);
                return importResult.project.makeCommit(null,
                    [importResult.commitHash], persisted.rootHash, persisted.objects, 'adding complex asset');
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (all) {
                expect(all).to.contains.members([softHash]);
                return cleanup({del: true});
            })
            .then(function () {
                return bc.listObjects('wg-metadata');
            })
            .then(function (all) {
                expect(all).to.contains.members([softHash]);
            })
            .nodeify(done);
    });
});

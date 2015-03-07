/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('./../_globals.js');

describe('issue110 testing', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        storage = null,

        // global helper functions and globally used variables
        baseCommit = null,
        project = null,
        commit = '',
        root = null,
        rootHash = '',
        core = null;

    it('import the problematic project', function (done) {
        testFixture.importProject({
            filePath: './test/issue/110/input.json',
            projectName: 'issue110test'
        }, function (err, result) {
            if (err) {
                done(err);
                return;
            }
            storage = result.storage;
            project = result.project;
            core = result.core;
            commit = result.commitHash;
            baseCommit = result.commitHash;
            rootHash = result.core.getHash(result.root);
            done();
        });
    });
    it('checks the ownJsonMeta of node \'specialTransition\'', function (done) {
        core.loadRoot(rootHash, function (err, r) {
            if (err) {
                return done(err);
            }
            root = r;
            core.loadByPath(root, '/1402711366/1821421774', function (err, node) {
                var meta;
                if (err) {
                    return done(err);
                }
                meta = core.getOwnJsonMeta(node);
                meta.pointers.should.exist;
                meta.pointers.src.should.exist;
                meta.pointers.src.items.should.exist;
                meta.pointers.src.items.should.be.instanceof(Array);
                done();
            });
        });
    });
    it('checks the ownJsonMeta of node \'specialState\'', function (done) {
        core.loadRoot(rootHash, function (err, r) {
            if (err) {
                return done(err);
            }
            root = r;
            core.loadByPath(root, '/1402711366/1021878489', function (err, node) {
                var meta;
                if (err) {
                    return done(err);
                }
                meta = core.getOwnJsonMeta(node);
                meta.aspects.should.exist;
                meta.aspects.asp.should.exist;
                meta.aspects.asp.should.be.instanceof(Array);
                done();
            });
        });
    });
});
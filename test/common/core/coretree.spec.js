/*globals require, describe, it, before, WebGMEGlobal*/
/**
 * @author lattmann / https://github.com/lattmann
 */

require('../../_globals.js');
var should = require('chai').should(),
    WebGME = require('../../../webgme'),
    requirejs = require('requirejs'),
    config = WebGMEGlobal.getConfig(),

    CoreTree = requirejs('common/core/coretree'),

    // TODO: replace with in memory storage

    storage = new WebGME.serverUserStorage({host: '127.0.0.1', port: 27017, database: 'multi'});


describe('CoreTree', function () {
    "use strict";

    var coreTree;

    before(function (done) {
        storage.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }

            storage.openProject('CoreTreeTest', function (err, project) {
                if (err) {
                    done(err);
                    return;
                }

                coreTree = new CoreTree(project);
                done();
            });
        });
    });

    describe('getParent', function () {

        it('should return with the parent object reference', function () {
            var node = {parent: {}};

            coreTree.getParent(node).should.be.equal(node.parent);
        });

        it('should accept parent as null', function () {
            var node = {parent: null};

            should.not.exist(coreTree.getParent(node));
        });

        it('should throw if parent is a string', function () {
            var node = {parent: 'test_string'};

            (function () {
                coreTree.getParent(node);
            }).should.throw();
        });
    });

});

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

    describe('core.getParent', function () {

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

    describe('core.getRelid', function () {
        it('should return with the relid', function () {
            var node = {relid: '123344567771231234567890'};

            coreTree.getRelid(node).should.be.equal('123344567771231234567890');
        });
    });

    describe('core.getLevel', function () {
        it('should return with level 0 for root', function () {
            var node = {parent: null};

            coreTree.getLevel(node).should.be.equal(0);
        });

        it('should return with level 1 for child of root', function () {
            var root = {parent: null},
                child = {parent: root};

            coreTree.getLevel(child).should.be.equal(1);
        });

        it('should return with level 2 for grandchild of root', function () {
            var root = {parent: null},
                child = {parent: root},
                grandChild = {parent: child};

            coreTree.getLevel(grandChild).should.be.equal(2);
        });


    });

    describe('core.getRoot', function () {
        it('should return with root', function () {
            var root = {parent: null};

            coreTree.getRoot(root).should.be.equal(root);
        });

        it('should return with root of a grandchild', function () {
            var root = {parent: null},
                child = {parent: root},
                grandChild = {parent: child};

            coreTree.getRoot(grandChild).should.be.equal(root);
        });
    });

    describe('core.getPath', function () {
        it('should return with the path of the root', function () {
            var root = {parent: null, relid: null},
                child = {parent: root, relid: '1'},
                grandChild = {parent: child, relid: '2'};

            coreTree.getPath(root).should.be.equal('');
        });

        it('should return with the path of the child', function () {
            var root = {parent: null, relid: null},
                child = {parent: root, relid: '1'},
                grandChild = {parent: child, relid: '2'};

            coreTree.getPath(child).should.be.equal('/1');
        });

        it('should return with the path of the grandchild', function () {
            var root = {parent: null, relid: null},
                child = {parent: root, relid: '1'},
                grandChild = {parent: child, relid: '2'};

            coreTree.getPath(grandChild).should.be.equal('/1/2');
        });
    });

    describe('core.isValidPath', function () {
        // invalid path
        it('should return false for any non-string type', function () {
            coreTree.isValidPath(42).should.be.false;
            coreTree.isValidPath({a:42}).should.be.false;
            coreTree.isValidPath([]).should.be.false;
            coreTree.isValidPath(null).should.be.false;
            coreTree.isValidPath(undefined).should.be.false;
            coreTree.isValidPath('1/2/3/4').should.be.false;
        });

        // valid paths
        it('should return true for empty string', function () {
            coreTree.isValidPath('').should.be.true;
        });

        it('should return true for any string starting with /', function () {
            coreTree.isValidPath('/').should.be.true;
            coreTree.isValidPath('/asdf').should.be.true;
            coreTree.isValidPath('/ adf dsaf dsafds ').should.be.true;
            coreTree.isValidPath('/ 012454/ asdf 23 adsf 2554/87').should.be.true;
            coreTree.isValidPath('/                              ').should.be.true;
        });

    });
    
});

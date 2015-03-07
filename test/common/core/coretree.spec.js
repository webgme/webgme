/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('CoreTree', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        should = require('chai').should(),
        requirejs = require('requirejs'),

        CoreTree = requirejs('common/core/coretree'),

    // TODO: replace with in memory storage

        storage = new testFixture.Storage({}),

        coreTree;

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
            var root = {parent: null, relid: null};

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

        it('should return with the relative path of the child and grandchild', function () {
            var root = {parent: null, relid: null},
                child = {parent: root, relid: '1'},
                grandChild = {parent: child, relid: '2'};

            coreTree.getPath(grandChild, child).should.be.equal('/2');
        });

        it('should return with the full path of the child if grandchild is defined as base', function () {
            var root = {parent: null, relid: null},
                child = {parent: root, relid: '1'},
                grandChild = {parent: child, relid: '2'};

            coreTree.getPath(child, grandChild).should.be.equal('/1');
        });

        it('should return with empty string if node is passed as base', function () {
            var root = {parent: null, relid: null},
                child = {parent: root, relid: '1'},
                grandChild = {parent: child, relid: '2'};

            coreTree.getPath(root, root).should.be.equal('');
            coreTree.getPath(child, child).should.be.equal('');
            coreTree.getPath(grandChild, grandChild).should.be.equal('');
        });
    });

    describe('core.isValidPath', function () {
        // invalid path
        it('should return false for any non-string type', function () {
            coreTree.isValidPath(42).should.be.false;
            coreTree.isValidPath({a: 42}).should.be.false;
            coreTree.isValidPath([]).should.be.false;
            coreTree.isValidPath(null).should.be.false;
            coreTree.isValidPath(undefined).should.be.false;
            coreTree.isValidPath('1/2/3/4').should.be.false;
            coreTree.isValidPath(' /1/2/3/4').should.be.false;
        });

        // valid paths
        it('should return true for empty string', function () {
            coreTree.isValidPath('').should.be.true;
        });

        it('should return true for any string starting with /', function () {
            coreTree.isValidPath('/').should.be.true;
            coreTree.isValidPath('//').should.be.true;
            coreTree.isValidPath('//////////').should.be.true;
            coreTree.isValidPath('/!@#$%^&*()_+{}|":><?/.,;\n\r\t').should.be.true;
            coreTree.isValidPath('/asdf').should.be.true;
            coreTree.isValidPath('/ adf dsaf dsafds ').should.be.true;
            coreTree.isValidPath('/ 012454/ asdf 23 adsf 2554/87').should.be.true;
            coreTree.isValidPath('/                              ').should.be.true;
        });

    });

    describe('core.splitPath', function () {
        it('should split valid path', function () {
            coreTree.splitPath('').length.should.be.equal(0);
            coreTree.splitPath('/1/2/3/4').length.should.be.equal(4);
            coreTree.splitPath('/11/22/33/44').length.should.be.equal(4);
            coreTree.splitPath('/11/22/33/44    / 5').length.should.be.equal(5);
        });
    });

    describe('core.buildPath', function () {

        it('should build path form a string array', function () {
            coreTree.buildPath(['1', '2', '3']).should.be.equal('/1/2/3');
            coreTree.buildPath(['1', ' a', ' r ']).should.be.equal('/1/ a/ r ');
        });

        it('should return with an empty string for an empty array', function () {
            coreTree.buildPath([]).should.be.equal('');
        });

        it('should throw if the input type is not an array', function () {
            (function () {
                coreTree.buildPath();
            }).should.throw();

            (function () {
                coreTree.buildPath(true);
            }).should.throw();

            (function () {
                coreTree.buildPath({});
            }).should.throw();

            (function () {
                coreTree.buildPath(null);
            }).should.throw();

            (function () {
                coreTree.buildPath('some string');
            }).should.throw();
        });
    });

    describe('core.joinPaths', function () {
        it('should join two valid path', function () {
            coreTree.joinPaths('', '/1/2').should.be.equal('/1/2');
            coreTree.joinPaths('/1/2', '').should.be.equal('/1/2');
            coreTree.joinPaths('/', '/').should.be.equal('//');
        });

        it('should join only the first two arguments', function () {
            coreTree.joinPaths('', '/1/2', '/1/3').should.be.equal('/1/2');
            coreTree.joinPaths('', '/1/2', '/1/3').should.not.be.equal('/1/2/1/3');
            coreTree.joinPaths('/1/2', '', '/1/3', '/1/3').should.not.be.equal('/1/2/1/3/1/3');
        });
    });

    describe('core.getCommonPathPrefixData', function () {

        it('should have properties: common, first, firstLength, second, secondLength', function () {
            coreTree.getCommonPathPrefixData('', '').should.have.property('common');
            coreTree.getCommonPathPrefixData('', '').should.have.property('first');
            coreTree.getCommonPathPrefixData('', '').should.have.property('firstLength');
            coreTree.getCommonPathPrefixData('', '').should.have.property('second');
            coreTree.getCommonPathPrefixData('', '').should.have.property('secondLength');
        });

        it('should get the prefix for two valid path', function () {
            coreTree.getCommonPathPrefixData('/1/2/3/4/5', '/1/2').common.should.be.equal('/1/2');
            coreTree.getCommonPathPrefixData('/1/2/3/4/5', '/3/4').common.should.be.equal('');
            coreTree.getCommonPathPrefixData('/1/2/3/4/5', '/1/2/3/4/5').common.should.be.equal('/1/2/3/4/5');
            coreTree.getCommonPathPrefixData('', '').common.should.be.equal('');
        });

        it('should throw if the path is invalid', function () {
            (function () {
                coreTree.getCommonPathPrefixData();
            }).should.throw();

            (function () {
                coreTree.getCommonPathPrefixData('');
            }).should.throw();

            (function () {
                coreTree.getCommonPathPrefixData('', {});
            }).should.throw();

            (function () {
                coreTree.getCommonPathPrefixData('', ' /invalid');
            }).should.throw();
        });
    });

});

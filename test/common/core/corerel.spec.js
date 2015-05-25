/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('corerel', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('corerel.spec'),
        storage = testFixture.getMongoStorage(logger, gmeConfig),
        Rel = testFixture.requirejs('common/core/corerel'),
        Tree = testFixture.requirejs('common/core/coretree'),
        TASYNC = testFixture.requirejs('common/core/tasync'),
        Core = function (s, options) {
            return new Rel(new Tree(s, options), options);
        },
        project,
        core,
        root;

    beforeEach(function (done) {
        storage.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }
            storage.openProject('coreRelTesting', function (err, p) {
                var child;
                if (err) {
                    done(err);
                    return;
                }
                project = p;
                core = new Core(project, {globConf: gmeConfig, logger: testFixture.logger.fork('corerel:core')});
                root = core.createNode();
                child = core.createNode({parent: root});
                core.setAttribute(child, 'name', 'child');
                core.setRegistry(child, 'position', {x: 100, y: 100});
                core.setPointer(child, 'parent', root);

                done();
            });
        });
    });
    afterEach(function (done) {
        storage.deleteProject('coreRelTesting', function (err) {
            if (err) {
                done(err);
                return;
            }
            storage.closeDatabase(done);
        });
    });
    it('should load all children', function (done) {
        TASYNC.call(function (children) {
            children.should.have.length(1);
            done();
        }, core.loadChildren(root));
    });
    it('child should have pointer and root should not', function (done) {
        TASYNC.call(function (children) {
            var child = children[0];
            core.hasPointer(child, 'parent').should.be.true;
            core.getPointerPath(child, 'parent').should.be.eql(core.getPath(root));
            core.hasPointer(root, 'parent').should.be.false;
            done();
        }, core.loadChildren(root));
    });
    it('root should have collection and child should not', function (done) {
        TASYNC.call(function (children) {
            var child = children[0];
            core.getCollectionNames(child).should.be.empty;
            core.getCollectionNames(root).should.be.eql(['parent']);
            core.getCollectionPaths(root, 'parent').should.include.members([core.getPath(child)]);
            done();
        }, core.loadChildren(root));
    });
    it('copying nodes should work fine', function (done) {
        TASYNC.call(function (children) {
            var child = children[0],
                copyOne = core.copyNode(child, root),
                copies = core.copyNodes([child, copyOne], root),
                grandChild = core.copyNode(copyOne, child),
                grandCopy = core.copyNode(grandChild, root);
            core.getAttribute(copyOne, 'name').should.be.eql(core.getAttribute(child, 'name'));
            copies.should.have.length(2);
            core.getRegistry(copies[0], 'position').should.be.eql(core.getRegistry(copyOne, 'position'));
            core.getPointerPath(copies[1], 'parent').should.be.eql(core.getPointerPath(copies[0], 'parent'));
            core.getPointerPath(grandChild, 'parent').should.be.eql(core.getPointerPath(grandCopy, 'parent'));
            core.getRelid(grandChild).should.not.be.eql(core.getRelid(copyOne));
            core.getRelid(grandChild).should.not.be.eql(core.getRelid(grandCopy));
            done();
        }, core.loadChildren(root));
    });
    it('loading collection and pointer', function (done) {
        TASYNC.call(function (children) {
            children.should.have.length(1);
            var child = children[0];
            core.getAttribute(child, 'name').should.be.equal('child');
            TASYNC.call(function (pointer) {
                pointer.should.be.eql(root);
                done();
            }, core.loadPointer(child, 'parent'));
        }, core.loadCollection(root, 'parent'));
    });
    it('getting outside pointer path', function (done) {
        TASYNC.call(function (children) {
            var child = children[0],
                other = core.createNode({parent: root}),
                grandChild = core.createNode({parent: child});
            core.setPointer(grandChild, 'ptr', other);
            core.getOutsidePointerPath(child, 'ptr', '/' + core.getRelid(grandChild))
                .should.be.eql(core.getPointerPath(grandChild, 'ptr'));

            done();
        }, core.loadChildren(root));
    });
    it('getting chilrdren paths', function (done) {
        TASYNC.call(function (children) {
            core.getChildrenPaths(root).should.include.members([core.getPath(children[0])]);

            done();
        }, core.loadChildren(root));
    });
    it('moving node around', function (done) {
        TASYNC.call(function (children) {
            var child = children[0],
                node = core.createNode({parent: root}),
                relid = core.getRelid(node);

            node = core.moveNode(node, child);
            core.getRelid(node).should.be.eql(relid);
            core.getPath(node).should.contain(core.getPath(child));

            node = core.moveNode(node, root);
            core.getRelid(node).should.be.eql(relid);
            core.getPath(node).should.not.contain(core.getPath(child));

            node = core.moveNode(node, root);
            core.getRelid(node).should.not.be.eql(relid);
            core.getPath(node).should.not.contain(core.getPath(child));

            done();
        }, core.loadChildren(root));
    });
});
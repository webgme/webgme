/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('corerel', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('corerel.spec'),
        Q = testFixture.Q,
        storage,
        expect = testFixture.expect,
        __should = testFixture.should,
        Rel = testFixture.requirejs('common/core/corerel'),
        Tree = testFixture.requirejs('common/core/coretree'),
        TASYNC = testFixture.requirejs('common/core/tasync'),
        Core = function (s, options) {
            return new Rel(new Tree(s, options), options);
        },
        projectName = 'coreRelTesting',
        projectId = testFixture.projectName2Id(projectName),
        core,
        root,

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
                storage.closeDatabase(),
                gmeAuth.unload()
            ])
            .nodeify(done);
    });

    beforeEach(function (done) {
        storage.openDatabase()
            .then(function () {
                return storage.createProject({projectName: projectName});
            })
            .then(function (dbProject) {
                var child,
                    project = new testFixture.Project(dbProject, storage, logger, gmeConfig);

                core = new Core(project, {globConf: gmeConfig, logger: testFixture.logger.fork('corerel:core')});
                root = core.createNode();
                child = core.createNode({parent: root});
                core.setAttribute(child, 'name', 'child');
                core.setRegistry(child, 'position', {x: 100, y: 100});
                core.setPointer(child, 'parent', root);
            })
            .then(done)
            .catch(done);
    });

    afterEach(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                storage.closeDatabase(done);
            })
            .catch(function (err) {
                logger.error(err);
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
            core.getPointerPath(child, 'parent').should.be.eql(core.getPath(root));
            expect(core.getPointerPath(root, 'parent')).to.be.equal(undefined);
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

    it('getting children paths', function (done) {
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

    it('multiple node copy relid collision', function () {
        var parent = core.createNode({parent: root}),
            children = {},
            i,
            relid,
            relidPool = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
            tempFrom,
            tempTo,
            result;

        //creating all 1 length relid
        for (i = 0; i < relidPool.length; i += 1) {
            relid = relidPool[i];
            children[relid] = core.createNode({parent: parent, relid: relid});
            core.setAttribute(children[relid], 'name', relid);
        }

        //now we create the tempFrom node
        tempFrom = core.createNode({parent: parent});
        expect(core.getRelid(tempFrom)).to.have.length(2);

        //move the children under the tempFrom
        for (i = 0; i < relidPool.length; i += 1) {
            children[relidPool[i]] = core.moveNode(children[relidPool[i]], tempFrom);
        }
        //copy that node
        expect(core.getChildrenRelids(parent)).to.eql([core.getRelid(tempFrom)]);
        tempTo = core.copyNode(tempFrom, parent);
        expect(core.getRelid(tempTo)).to.have.length(1);
        expect(children[core.getRelid(tempTo)]).not.to.equal(undefined);

        //try to move the colliding node back
        result = core.moveNode(children[core.getRelid(tempTo)], parent);

        expect(core.getAttribute(result, 'name')).to.equal(core.getRelid(tempTo));
    });

    it('creating node with explicitly set relid should ASSERT if already exists', function () {
        core.createNode({parent: root, relid: 'taken'});
        try {
            core.createNode({parent: root, relid: 'taken'});
            throw new Error('Should have failed!');
        } catch (err) {
            expect(err.message).to.contain('Given relid already used in parent');
        }
    });
});
/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe.only('corerel', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('corerel.spec'),
        Q = testFixture.Q,
        storage,
        expect = testFixture.expect,
        Rel = testFixture.requirejs('common/core/corerel'),
        Tree = testFixture.requirejs('common/core/coretree'),
        TASYNC = testFixture.requirejs('common/core/tasync'),
        Core = function (s, options) {
            return new Rel(new Tree(s, options), options);
        },
        projectName = 'coreRelTesting',
        projectId = testFixture.projectName2Id(projectName),
        project,
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
                var child;

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
            expect(children).to.have.length(1);
            done();
        }, core.loadChildren(root));
    });

    it('child should have pointer and root should not', function (done) {
        TASYNC.call(function (children) {
            var child = children[0];
            expect(core.getPointerPath(child, 'parent')).to.be.eql(core.getPath(root));
            expect(core.getPointerPath(root, 'parent')).to.be.equal(undefined);
            done();
        }, core.loadChildren(root));
    });

    it('root should have collection and child should not', function (done) {
        TASYNC.call(function (children) {
            var child = children[0];
            expect(core.getCollectionNames(child)).to.be.empty;
            expect(core.getCollectionNames(root)).to.be.eql(['parent']);
            expect(core.getCollectionPaths(root, 'parent')).to.include.members([core.getPath(child)]);
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
            expect(core.getAttribute(copyOne, 'name')).to.be.eql(core.getAttribute(child, 'name'));
            copies.should.have.length(2);
            expect(core.getRegistry(copies[0], 'position')).to.be.eql(core.getRegistry(copyOne, 'position'));
            expect(core.getPointerPath(copies[1], 'parent')).to.be.eql(core.getPointerPath(copies[0], 'parent'));
            expect(core.getPointerPath(grandChild, 'parent')).to.be.eql(core.getPointerPath(grandCopy, 'parent'));
            done();
        }, core.loadChildren(root));
    });

    it('loading collection and pointer', function (done) {
        TASYNC.call(function (children) {
            expect(children).to.have.length(1);
            var child = children[0];
            expect(core.getAttribute(child, 'name')).to.be.equal('child');
            TASYNC.call(function (pointer) {
                expect(pointer).to.be.eql(root);
                done();
            }, core.loadPointer(child, 'parent'));
        }, core.loadCollection(root, 'parent'));
    });

    it('getting children paths', function (done) {
        TASYNC.call(function (children) {
            expect(core.getChildrenPaths(root)).to.include.members([core.getPath(children[0])]);

            done();
        }, core.loadChildren(root));
    });

    it('moving node around', function (done) {
        TASYNC.call(function (children) {
            var child = children[0],
                node = core.createNode({parent: root}),
                relid = core.getRelid(node);

            node = core.moveNode(node, child);
            expect(core.getRelid(node)).to.be.eql(relid);
            expect(core.getPath(node)).to.contain(core.getPath(child));

            node = core.moveNode(node, root);
            expect(core.getRelid(node)).to.be.eql(relid);
            expect(core.getPath(node)).to.not.contain(core.getPath(child));

            node = core.moveNode(node, root);
            expect(core.getRelid(node)).to.not.be.eql(relid);
            expect(core.getPath(node)).to.not.contain(core.getPath(child));

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

    it('should empty the reverse overlay cache according config settings', function (done) {
        var myGmeConfig = JSON.parse(JSON.stringify(gmeConfig)),
            myCore,
            root,
            child,
            otherChild;

        myGmeConfig.core.inverseRelationsCacheSize = 2;
        myCore = new Core(project, {globConf: myGmeConfig, logger: testFixture.logger.fork('corerel:core')});

        root = myCore.createNode({});
        child = myCore.createNode({parent: root, relid: 'child'});
        otherChild = myCore.createNode({parent: root, relid: 'oChild'});

        myCore.setPointer(child, 'ref', root);
        myCore.setPointer(otherChild, 'ref', root);

        myCore.setAttribute(child, 'child', true);

        expect(myCore.getCollectionPaths(child, 'ref')).to.eql([]);
        expect(myCore.getCollectionPaths(otherChild, 'ref')).to.eql([]);
        expect(myCore.getCollectionPaths(root, 'ref')).to.have.members(['/child', '/oChild']);
        // console.log(myCore._inverseCache);

        myCore.persist(root);

        TASYNC.call(function (newRoot) {
            TASYNC.call(function (children) {
                expect(children).to.have.length(2);
                expect(myCore.getCollectionPaths(children[0], 'ref')).to.eql([]);
                expect(myCore.getCollectionPaths(children[1], 'ref')).to.eql([]);
                expect(myCore.getCollectionPaths(newRoot, 'ref')).to.have.members(['/child', '/oChild']);
                done();
            }, myCore.loadChildren(newRoot));
        }, myCore.loadRoot(myCore.getHash(root)));

    });

    it('should mutate the reverse overlay cache properly', function (done) {
        var myCore = new Core(project, {globConf: gmeConfig, logger: testFixture.logger.fork('corerel:core')}),
            root = myCore.createNode({}),
            rootHash,
            fco = myCore.createNode({parent: root, relid: 'f'}),
            destination = myCore.createNode({parent: root, base: fco, relid: 'd'}),
            firstSource = myCore.createNode({parent: root, base: fco, relid: 's1'}),
            secondSource = myCore.createNode({parent: root, base: fco, relid: 's2'}),
            refreshVariables = function (nodeArray) {
                nodeArray.forEach(function (n_) {
                    switch (myCore.getRelid(n_)) {
                        case 'f':
                            fco = n_;
                            break;
                        case 'd':
                            destination = n_;
                            break;
                        case 's1':
                            firstSource = n_;
                            break;
                        case 's2':
                            secondSource = n_;
                            break;
                    }
                });
            };

        myCore.setPointer(firstSource, 'ref', destination);
        myCore.setPointer(secondSource, 'ref', destination);
        myCore.persist(root);

        TASYNC.call(function (r_) {
            root = r_;
            rootHash = myCore.getHash(root);
            TASYNC.call(function (children) {
                refreshVariables(children);
                expect(myCore.getPointerPath(firstSource, 'ref')).to.eql('/d');
                expect(myCore.getPointerPath(secondSource, 'ref')).to.eql('/d');
                expect(myCore.getCollectionPaths(destination, 'ref')).to.have.members(['/s1', '/s2']);

                myCore.deletePointer(firstSource, 'ref');

                //Now we reload the current state without persisting
                TASYNC.call(function (r_) {
                    root = r_;
                    TASYNC.call(function (children) {
                        refreshVariables(children);
                        expect(myCore.getPointerPath(firstSource, 'ref')).to.eql('/d');
                        expect(myCore.getPointerPath(secondSource, 'ref')).to.eql('/d');
                        expect(myCore.getCollectionPaths(destination, 'ref')).to.have.members(['/s1', '/s2']);

                        done();
                    }, myCore.loadChildren(root));
                }, myCore.loadRoot(rootHash));

            }, myCore.loadChildren(root));
        }, myCore.loadRoot(myCore.getHash(root)));
    });

    describe('sharded overlay handling', function () {
        var shardedProject,
            shardedProjectName = 'shardingTestProject',
            shardingConfig = JSON.parse(JSON.stringify(gmeConfig)),
            shardCore,
            savedShardHash,
            shardRoot;

        function fillUpWithChildren(number) {
            var childArray = [];

            while (number--) {
                childArray.unshift(shardCore.createNode({parent: shardRoot, relid: number + ''}));
                shardCore.setPointer(childArray[0], 'parent', shardRoot);
            }

            return childArray;
        }

        before(function (done) {
            shardingConfig.storage.overlaysShardLimit = 3;
            shardingConfig.storage.overlayShardSize = 2;

            storage.openDatabase()
                .then(function () {
                    return storage.createProject({projectName: shardedProjectName});
                })
                .then(function (dbProject) {
                    shardedProject = new testFixture.Project(dbProject, storage, logger, shardingConfig);

                    shardCore = new Core(shardedProject, {
                        globConf: shardingConfig,
                        logger: testFixture.logger.fork('corerel:core:shard')
                    });

                    shardRoot = shardCore.createNode();
                    fillUpWithChildren(4);
                    shardCore.persist(shardRoot);
                    savedShardHash = shardCore.getHash(shardRoot);

                    shardCore._inverseCache._backup = {};
                    shardCore._inverseCache._cache = {};
                    shardCore._inverseCache._size = 0;

                })
                .then(done)
                .catch(done);
        });

        beforeEach(function () {
            shardRoot = shardCore.createNode();
        });

        it('should split the original overlay once the number of relations reaches the limit', function () {
            var childArray;

            expect(shardRoot.data.ovr || {}).not.to.have.keys(['sharded']);
            childArray = fillUpWithChildren(4);
            expect(childArray).to.have.length(4);
            expect(shardRoot.data.ovr.sharded).to.equal(true);
            expect(Object.keys(shardRoot.data.ovr)).to.have.length(4);
        });

        it('should not split the original overlay until the number of relations reaches the limit', function () {
            var childArray;

            expect(shardRoot.data.ovr || {}).not.to.have.keys(['sharded']);
            childArray = fillUpWithChildren(2);
            expect(childArray).to.have.length(2);
            expect(shardRoot.data.ovr.sharded).to.equal(undefined);
            expect(shardRoot.data.ovr._mutable).to.equal(true);
        });

        it('should persist the sharded overlay', function () {
            var childArray = [],
                numberOfChildren = 4,
                persisted;

            while (numberOfChildren--) {
                childArray.unshift(shardCore.createNode({parent: shardRoot, relid: numberOfChildren + ''}));
                shardCore.setPointer(childArray[0], 'parent', shardRoot);
            }

            persisted = shardCore.persist(shardRoot);
            expect(Object.keys(persisted.objects)).to.have.length(4);
        });

        it('should persist the sharded overlay with proper amount of shards', function () {
            var childArray = [],
                numberOfChildren = 6,
                persisted;

            while (numberOfChildren--) {
                childArray.unshift(shardCore.createNode({parent: shardRoot, relid: numberOfChildren + ''}));
                shardCore.setPointer(childArray[0], 'parent', shardRoot);
            }

            persisted = shardCore.persist(shardRoot);
            expect(Object.keys(persisted.objects)).to.have.length(5);
        });

        it('should not reserve new shard for already used source', function () {
            var childArray = [],
                numberOfChildren = 4,
                i;

            while (numberOfChildren--) {
                childArray.unshift(shardCore.createNode({parent: shardRoot, relid: numberOfChildren + ''}));
                shardCore.setPointer(childArray[0], 'parent', shardRoot);
            }

            for (i = 1; i < numberOfChildren.length; i += 1) {
                shardCore.setPointer(childArray[0], 'sibling' + i, childArray[i]);
            }

            expect(Object.keys(shardRoot.overlays)).to.have.length(2);
        });

        it('should use the smallest shard even if one other gets smaller during changes', function () {
            var childArray = [],
                numberOfChildren = 4,
                oldSmallest,
                extraChild,
                smallestShardId;

            while (numberOfChildren--) {
                childArray.unshift(shardCore.createNode({parent: shardRoot, relid: numberOfChildren + ''}));
                shardCore.setPointer(childArray[0], 'parent', shardRoot);
            }

            smallestShardId = shardRoot.minimalOverlayShardId;
            oldSmallest = smallestShardId;
            expect(typeof smallestShardId).to.equal('string');
            shardCore.setPointer(shardRoot, 'child0', childArray[0]);
            smallestShardId = shardRoot.minimalOverlayShardId;
            expect(oldSmallest).not.to.equal(smallestShardId);

            shardCore.deletePointer(childArray[0], 'parent');
            expect(smallestShardId).to.equal(shardRoot.minimalOverlayShardId);
            expect(shardRoot.overlays[smallestShardId].itemCount).to.equal(1);

            extraChild = shardCore.createNode({parent: shardRoot});
            shardCore.setPointer(extraChild, 'parent', shardRoot);
            expect(smallestShardId).not.to.equal(shardRoot.minimalOverlayShardId);
            expect(shardRoot.overlays[smallestShardId].itemCount).to.equal(2);
        });

        it('should load sharded overlays', function (done) {
            TASYNC.call(function (root) {
                expect(Object.keys(root.overlays)).to.have.length(2);
                done();
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should be able to get target from sharded overlays', function (done) {
            TASYNC.call(function (root) {
                TASYNC.call(function (children) {
                    var i;
                    for (i = 0; i < children.length; i += 1) {
                        expect(shardCore.getPointerPath(children[i], 'parent')).to.equal('');
                    }
                    done();
                }, shardCore.loadChildren(root));
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should be able to get sources from sharded overlays', function (done) {
            TASYNC.call(function (root) {
                var sources = shardCore.getCollectionPaths(root, 'parent');
                expect(sources).to.have.length(4);
                done();
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should be able to handle unknown pointer from sharded overlays', function (done) {
            TASYNC.call(function (root) {
                TASYNC.call(function (children) {
                    expect(children).to.have.length(4);
                    expect(shardCore.getPointerPath(children[0], 'unknown')).to.equal(undefined);
                    done();
                }, shardCore.loadChildren(root));
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should be able to removal of relations from sharded overlays', function (done) {
            TASYNC.call(function (root) {
                TASYNC.call(function (children) {
                    var i;
                    expect(children).to.have.length(4);
                    for (i = 0; i < children.length; i += 1) {
                        shardCore.deletePointer(children[i], 'parent');
                    }
                    expect(shardCore.getCollectionPaths(root, 'parent')).to.have.length(0);
                    done();
                }, shardCore.loadChildren(root));
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should stack relations from the same source into the same shard', function (done) {
            var oldItemCounter;
            TASYNC.call(function (root) {
                oldItemCounter = Object.keys(root.data.ovr).length;
                TASYNC.call(function (children) {
                    var i;
                    expect(children).to.have.length(4);
                    for (i = 0; i < children.length; i += 1) {
                        shardCore.setPointer(root, 'child' + i, children[i]);
                    }
                    expect(Object.keys(root.data.ovr)).to.have.length(oldItemCounter + 2);
                    done();
                }, shardCore.loadChildren(root));
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should copy node with sharded overlays as well', function (done) {
            TASYNC.call(function (root) {
                TASYNC.call(function (children) {
                    expect(children).to.have.length(4);
                    var newChild = shardCore.copyNode(children[0], root);
                    expect(newChild).not.to.equal(undefined);
                    expect(newChild).not.to.equal(null);
                    expect(shardCore.getPointerNames(newChild)).to.eql(['parent']);
                    expect(shardCore.getPointerPath(newChild, 'parent')).to.equal('');
                    done();
                }, shardCore.loadChildren(root));
            }, shardCore.loadRoot(savedShardHash));
        });

        it('should remove shard only after second empty persist', function () {
            var root = shardCore.createNode(),
                children = [],
                i;

            for (i = 0; i < 4; i += 1) {
                children.unshift(shardCore.createNode({parent: root}));
                shardCore.setPointer(children[0], 'parentA', root);
                shardCore.setPointer(children[0], 'parentB', root);
            }
            expect(Object.keys(root.overlays)).to.have.length(4);
            for (i = 0; i < 2; i += 1) {
                shardCore.deletePointer(children[i], 'parentA');
                shardCore.deletePointer(children[i], 'parentB');
            }
            expect(Object.keys(root.overlays)).to.have.length(4);
            shardCore.persist(root);
            expect(Object.keys(root.overlays)).to.have.length(4);
            shardCore.setPointer(children[0], 'parentA', root);
            expect(Object.keys(root.overlays)).to.have.length(4);
            shardCore.persist(root);
            expect(Object.keys(root.overlays)).to.have.length(3);
        });
    });
});
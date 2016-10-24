/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */
var testFixture = require('../../_globals.js');

describe('coretype', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        logger = testFixture.logger.fork('coretype.spec'),
        storage,
        // Has to be in sync with relidPool in util/random.js
        RELID_POOL = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'.split(''),
        expect = testFixture.expect,
        __should = testFixture.should,
        Type = testFixture.requirejs('common/core/coretype'),
        Rel = testFixture.requirejs('common/core/corerel'),
        Tree = testFixture.requirejs('common/core/coretree'),
        NullPtr = testFixture.requirejs('common/core/nullpointercore'),
        TASYNC = testFixture.requirejs('common/core/tasync'),
        CONSTANTS = testFixture.requirejs('common/core/constants'),
        Core = function (s, options) {
            return new NullPtr(
                new Type(new NullPtr(new Rel(new Tree(s, options), options), options), options), options);
        },
        projectName = 'coreTypeTesting',
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
                var base,
                    bChild,
                    instance,
                    project = new testFixture.Project(dbProject, storage, logger, gmeConfig);

                core = new Core(project, {globConf: gmeConfig, logger: testFixture.logger.fork('coretype:core')});
                root = core.createNode();
                base = core.createNode({parent: root, relid: 'nonconflicting1'});
                core.setAttribute(base, 'name', 'base');
                core.setRegistry(base, 'position', {x: 100, y: 100});
                core.setPointer(base, 'parent', root);

                bChild = core.createNode({parent: base, relid: 'nonconflicting2'});
                core.setPointer(bChild, 'out', root);
                core.setPointer(bChild, 'in', base);
                instance = core.createNode({parent: root, base: base, relid: 'nonconflicting3'});
                core.setAttribute(instance, 'name', 'instance');
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

    it('check inheritance bases', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;
            core.getPath(core.getBaseRoot(root)).should.be.eql(core.getPath(root));
            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }

            core.getPath(core.getBaseRoot(instance)).should.be.eql(core.getPath(base));

            core.getPath(core.getBase(instance)).should.be.eql(core.getPath(base));

            done();
        }, core.loadChildren(root));
    });
    it('check type roots', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            (core.getTypeRoot(root) === null).should.be.true;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }

            core.getPath(core.getTypeRoot(instance)).should.be.eql(core.getPath(base));
            (core.getTypeRoot(base) === null).should.be.true;

            done();
        }, core.loadChildren(root));
    });
    it('check own pointer path', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }

            (core.getOwnPointerPath(instance, 'parent') === undefined).should.be.true;
            core.getOwnPointerNames(instance).should.be.eql(['base']);
            core.getPointerPath(instance, 'parent').should.be.eql(core.getPath(root));

            done();
        }, core.loadChildren(root));
    });
    it('check collections', function (done) {
        TASYNC.call(function (children) {

            children.should.have.length(1); //collections cannot be inherited

            core.getCollectionPaths(root, 'parent').should.include.members([core.getPath(children[0])]);

            core.getCollectionNames(children[0]).should.include.members(['base', 'in']);

            done();
        }, core.loadCollection(root, 'parent'));
    });
    it('check inherited collections in case of instance internal relations', function (done) {
        //first we build the template model
        var model = core.createNode({parent: root}),
            childA = core.createNode({parent: model}),
            childB = core.createNode({parent: model}),
            childC = core.createNode({parent: model}),
            instance = core.createNode({parent: root, base: model});

        //create pointer A->B
        core.setPointer(childA, 'ref', childB);

        //name the children to know them later
        core.setAttribute(childA, 'name', 'A');
        core.setAttribute(childB, 'name', 'B');
        core.setAttribute(childC, 'name', 'C');

        //now we load the children of the instance and check their collections
        TASYNC.call(function (children) {
            children.should.have.length(3);
            var childrenDictionary = {},
                i;

            for (i = 0; i < children.length; i += 1) {
                childrenDictionary[core.getAttribute(children[i], 'name')] = children[i];
            }

            //check if collection name is properly inherited
            expect(core.getCollectionNames(childrenDictionary['B'])).to.eql(['ref']);

            //add pointer C->B
            core.setPointer(childrenDictionary['C'], 'ref', childrenDictionary['B']);

            TASYNC.call(function (collection) {
                collection.should.have.length(2);
                var collDictionary = {},
                    i;
                for (i = 0; i < collection.length; i += 1) {
                    collDictionary[core.getAttribute(collection[i], 'name')] = collection[i];
                }

                expect(core.getPath(collDictionary['A'])).to.equal(core.getPath(childrenDictionary['A']));
                expect(core.getPath(collDictionary['C'])).to.equal(core.getPath(childrenDictionary['C']));
                done();
            }, core.loadCollection(childrenDictionary['B'], 'ref'));
        }, core.loadChildren(instance));
    });
    it('check pointer', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }
            TASYNC.call(function (grandChildren) {
                grandChildren.should.have.length(1);
                TASYNC.call(function (pointer) {
                    core.getPath(pointer).should.be.eql(core.getPath(instance));
                    done();
                }, core.loadPointer(grandChildren[0], 'in'));
            }, core.loadChildren(instance));
        }, core.loadChildren(root));
    });
    it('copying nodes around', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i, bCopy, copies;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }
            bCopy = core.copyNode(base, root);
            copies = core.copyNodes([base, instance], root);

            (core.getBase(bCopy) === null).should.be.true;
            copies.should.have.length(2);

            for (i = 0; i < copies.length; i++) {
                if (core.getAttribute(copies[i], 'name') === 'base') {
                    (core.getBase(copies[i]) === null).should.be.true;
                } else {
                    core.getPath(core.getBase(copies[i])).should.be.eql(core.getPath(base));
                }
            }

            done();
        }, core.loadChildren(root));
    });
    it('removing base', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }

            (core.getPointerPath(instance, 'parent') === undefined).should.be.false;

            core.setBase(instance, null);

            (core.getPointerPath(instance, 'parent') === undefined).should.be.true;

            done();
        }, core.loadChildren(root));
    });

    it('changing base changes attributes', function () {
        var oldType = core.createNode({parent: root, base: null}),
            newType = core.createNode({parent: root, base: null}),
            instance = core.createNode({parent: root, base: oldType});

        //pre-check
        expect(core.getAttributeNames(oldType)).to.eql([]);
        expect(core.getAttributeNames(newType)).to.eql([]);
        expect(core.getAttributeNames(instance)).to.eql([]);

        //adding attributes to the types
        core.setAttribute(oldType, 'old', 'oldValue');
        core.setAttribute(newType, 'new', 'newValue');
        expect(core.getAttributeNames(oldType)).to.have.members(['old']);
        expect(core.getAttributeNames(newType)).to.have.members(['new']);
        expect(core.getAttributeNames(instance)).to.have.members(['old']);
        expect(core.getAttribute(instance, 'old')).to.equal('oldValue');
        expect(core.getAttribute(instance, 'new')).to.equal(undefined);

        //changing base
        core.setBase(instance, newType);
        expect(core.getAttributeNames(oldType)).to.have.members(['old']);
        expect(core.getAttributeNames(newType)).to.have.members(['new']);
        expect(core.getAttributeNames(instance)).to.have.members(['new']);
        expect(core.getAttribute(instance, 'old')).to.equal(undefined);
        expect(core.getAttribute(instance, 'new')).to.equal('newValue');
    });

    it('changing base changes attributes and keep overridden ones', function () {
        var oldType = core.createNode({parent: root, base: null}),
            newType = core.createNode({parent: root, base: null}),
            instance = core.createNode({parent: root, base: oldType});

        //pre-check
        expect(core.getAttributeNames(oldType)).to.eql([]);
        expect(core.getAttributeNames(newType)).to.eql([]);
        expect(core.getAttributeNames(instance)).to.eql([]);

        //adding attributes to the types
        core.setAttribute(oldType, 'old', 'oldValue');
        core.setAttribute(newType, 'new', 'newValue');
        expect(core.getAttributeNames(oldType)).to.have.members(['old']);
        expect(core.getAttributeNames(newType)).to.have.members(['new']);
        expect(core.getAttributeNames(instance)).to.have.members(['old']);
        expect(core.getAttribute(instance, 'old')).to.equal('oldValue');
        expect(core.getAttribute(instance, 'new')).to.equal(undefined);

        //override attribute
        core.setAttribute(instance, 'old', 'myValue');
        expect(core.getAttribute(instance, 'old')).to.equal('myValue');
        expect(core.getAttribute(instance, 'new')).to.equal(undefined);

        //changing base
        core.setBase(instance, newType);
        expect(core.getAttributeNames(oldType)).to.have.members(['old']);
        expect(core.getAttributeNames(newType)).to.have.members(['new']);
        expect(core.getAttributeNames(instance)).to.have.members(['new', 'old']);
        expect(core.getAttribute(instance, 'old')).to.equal('myValue');
        expect(core.getAttribute(instance, 'new')).to.equal('newValue');
    });

    it('changing base should fail if oldBase has children', function () {
        var oldType = core.createNode({parent: root, base: null}),
            newType = core.createNode({parent: root, base: null}),
            instance = core.createNode({parent: root, base: oldType});

        //pre-check
        expect(core.getAttributeNames(oldType)).to.eql([]);
        expect(core.getAttributeNames(newType)).to.eql([]);
        expect(core.getAttributeNames(instance)).to.eql([]);

        //adding child to oldType
        core.createNode({parent: oldType, base: null});

        //try to change base
        try {
            core.setBase(instance, newType);
            throw new Error('changing from a base that has children should be prohibited');
        } catch (e) {
            //it should fail
            expect(e).not.to.equal(null);
        }
    });

    it('changing base should fail if newBase has children', function () {
        var oldType = core.createNode({parent: root, base: null}),
            newType = core.createNode({parent: root, base: null}),
            instance = core.createNode({parent: root, base: oldType});

        //pre-check
        expect(core.getAttributeNames(oldType)).to.eql([]);
        expect(core.getAttributeNames(newType)).to.eql([]);
        expect(core.getAttributeNames(instance)).to.eql([]);

        //adding child to oldType
        core.createNode({parent: newType, base: null});

        //try to change base
        try {
            core.setBase(instance, newType);
            throw new Error('changing from a base that has children should be prohibited');
        } catch (e) {
            //it should fail
            expect(e).not.to.equal(null);
        }
    });

    it('should remove if node has inheritance-containment collision found during loadChildren', function (done) {
        var typeA = core.createNode({parent: root}),
            typeB = core.createNode({parent: root}),
            instA = core.createNode({parent: root, base: typeA}),
            instB = core.createNode({parent: root, base: typeB});

        instA = core.moveNode(instA, instB);
        instB = core.moveNode(instB, typeA);

        TASYNC.call(function (children) {
            expect(children).to.have.length(0);
            done();
        }, core.loadChildren(instB));
    });

    it('should remove if node has inheritance-containment collision found during loadByPath', function (done) {
        var typeA = core.createNode({parent: root}),
            typeB = core.createNode({parent: root}),
            instA = core.createNode({parent: root, base: typeA}),
            instB = core.createNode({parent: root, base: typeB}),
            relid = core.getRelid(instA);

        instA = core.moveNode(instA, instB);
        instB = core.moveNode(instB, typeA);

        TASYNC.call(function (node) {
            expect(node).to.equal(null);
            done();
        }, core.loadByPath(root, core.getPath(instB) + '/' + relid));
    });

    it('should remove node if it contains its own base', function (done) {

        var typeA = core.createNode({parent: root}),
            typeB = core.createNode({parent: root}),
            instA = core.createNode({parent: root, base: typeA}),
            path = core.getPath(instA);

        typeA = core.moveNode(typeA, typeB);
        typeB = core.moveNode(typeB, instA);

        //we have to save and reload otherwise the base is still in the cache so it can be loaded without a problem
        core.persist(root);

        TASYNC.call(function (newroot) {
            expect(newroot).not.to.equal(null);
            TASYNC.call(function (node) {
                expect(node).to.equal(null);
                done();
            }, core.loadByPath(newroot, path));
        }, core.loadRoot(core.getHash(root)));
    });

    it('should not trigger base containment error if paths are only partially identical', function (done) {
        var typeA = core.createNode({parent: root, relid: '123'}),
            instA = core.createNode({parent: root, base: typeA, relid: '12'}),
            path = core.getPath(instA);

        expect(core.getPointerPath(typeA, 'base')).to.equal(null);
        //we have to save and reload otherwise the base is still in the cache so it can be loaded without a problem
        core.persist(root);

        TASYNC.call(function (newroot) {
            expect(newroot).not.to.equal(null);
            TASYNC.call(function (node) {
                expect(node).not.to.equal(null);
                done();
            }, core.loadByPath(newroot, path));
        }, core.loadRoot(core.getHash(root)));
    });

    it('should provide the info of instance-internal collections', function (done) {
        var root = core.createNode(),
            A = core.createNode({parent: root, base: null, relid: 'A'}),
            B = core.createNode({parent: root, base: null, relid: 'B'}),
            C = core.createNode({parent: root, base: null, relid: 'C'}),
            D = core.createNode({parent: root, base: null, relid: 'D'}),
            S = core.createNode({parent: root, base: null, relid: 'S'}),
            V = core.createNode({parent: root, base: null, relid: 'V'}),
            aP = core.createNode({parent: B, base: A, relid: 'a'}),
            bP = core.createNode({parent: S, base: B, relid: 'b'}),
            cP = core.createNode({parent: D, base: C, relid: 'c'}),
            aP2 = core.createNode({parent: D, base: A, relid: 'aa'}),
            sP = core.createNode({parent: V, base: S, relid: 's'}),
            dP = core.createNode({parent: V, base: D, relid: 'd'}),
            vP = core.createNode({parent: root, base: V, relid: 'v'});

        core.setPointer(cP, 'ref', aP2);
        core.setPointer(C, 'wrongRef', aP2);

        TASYNC.call(function (node) {
            expect(core.getPath(node)).to.equal('/v/d/aa');
            expect(core.getCollectionNames(node)).to.eql(['ref']);
            expect(core.getCollectionPaths(node, 'ref')).to.eql(['/v/d/c']);
            done();
        }, core.loadByPath(root, '/v/d/aa'));
    });

    it('should provide the info of instance-internal collections (own children)', function (done) {
        var root = core.createNode(),
            A = core.createNode({parent: root, base: null, relid: 'A'}),
            B = core.createNode({parent: root, base: null, relid: 'B'}),
            C = core.createNode({parent: root, base: null, relid: 'C'}),
            D = core.createNode({parent: root, base: null, relid: 'D'}),
            S = core.createNode({parent: root, base: null, relid: 'S'}),
            V = core.createNode({parent: root, base: null, relid: 'V'}),
            aP = core.createNode({parent: B, base: A, relid: 'a'}),
            bP = core.createNode({parent: S, base: B, relid: 'b'}),
            cP = core.createNode({parent: D, base: C, relid: 'c'}),
            aP2 = core.createNode({parent: D, base: A, relid: 'aa'}),
            sP = core.createNode({parent: V, base: S, relid: 's'}),
            dP = core.createNode({parent: V, base: D, relid: 'd'}),
            vP = core.createNode({parent: root, base: V, relid: 'v'});

        core.setPointer(cP, 'ref', D);
        core.setPointer(C, 'wrongRef', D);

        TASYNC.call(function (node) {
            expect(core.getPath(node)).to.equal('/v/d');
            expect(core.getCollectionNames(node)).to.eql(['ref']);
            expect(core.getCollectionPaths(node, 'ref')).to.eql(['/v/d/c']);
            done();
        }, core.loadByPath(root, '/v/d'));
    });

    it('should provide the info of instance-internal collections (own parent)', function (done) {
        var root = core.createNode(),
            A = core.createNode({parent: root, base: null, relid: 'A'}),
            B = core.createNode({parent: root, base: null, relid: 'B'}),
            C = core.createNode({parent: root, base: null, relid: 'C'}),
            D = core.createNode({parent: root, base: null, relid: 'D'}),
            S = core.createNode({parent: root, base: null, relid: 'S'}),
            V = core.createNode({parent: root, base: null, relid: 'V'}),
            aP = core.createNode({parent: B, base: A, relid: 'a'}),
            bP = core.createNode({parent: S, base: B, relid: 'b'}),
            cP = core.createNode({parent: D, base: C, relid: 'c'}),
            aP2 = core.createNode({parent: D, base: A, relid: 'aa'}),
            sP = core.createNode({parent: V, base: S, relid: 's'}),
            dP = core.createNode({parent: V, base: D, relid: 'd'}),
            vP = core.createNode({parent: root, base: V, relid: 'v'});

        core.setPointer(D, 'ref', cP);
        core.setPointer(S, 'wrongRef', cP);

        TASYNC.call(function (node) {
            expect(core.getPath(node)).to.equal('/v/d/c');
            expect(core.getCollectionNames(node)).to.eql(['ref']);
            expect(core.getCollectionPaths(node, 'ref')).to.eql(['/v/d']);
            done();
        }, core.loadByPath(root, '/v/d/c'));
    });

    it('should provide the info of instance-internal collections (null)', function (done) {
        var root = core.createNode(),
            A = core.createNode({parent: root, base: null, relid: 'A'}),
            B = core.createNode({parent: root, base: null, relid: 'B'}),
            C = core.createNode({parent: root, base: null, relid: 'C'}),
            D = core.createNode({parent: root, base: null, relid: 'D'}),
            S = core.createNode({parent: root, base: null, relid: 'S'}),
            V = core.createNode({parent: root, base: null, relid: 'V'}),
            aP = core.createNode({parent: B, base: A, relid: 'a'}),
            bP = core.createNode({parent: S, base: B, relid: 'b'}),
            cP = core.createNode({parent: D, base: C, relid: 'c'}),
            aP2 = core.createNode({parent: D, base: A, relid: 'aa'}),
            sP = core.createNode({parent: V, base: S, relid: 's'}),
            dP = core.createNode({parent: V, base: D, relid: 'd'}),
            vP = core.createNode({parent: root, base: V, relid: 'v'});

        core.setPointer(D, 'ref', cP);
        core.setPointer(cP, 'wrongRef', null);

        TASYNC.call(function (node) {
            expect(core.getPath(node)).to.equal('/v/d/c');
            expect(core.getCollectionNames(node)).to.eql(['ref']);
            expect(core.getCollectionPaths(node, 'ref')).to.eql(['/v/d']);
            done();
        }, core.loadByPath(root, '/v/d/c'));
    });

    it('isValidNewParent should return true when new-parent is root', function () {
        var node = core.createNode({parent: root});

        expect(core.isValidNewParent(node, root)).to.equal(true);
    });

    it('isValidNewParent should return false when new-parent is node', function () {
        var node = core.createNode({parent: root});

        expect(core.isValidNewParent(node, node)).to.equal(false);
    });

    it('isValidNewParent should return false when new-parent is base of node', function () {
        var base = core.createNode({parent: root}),
            instance = core.createNode({parent: root, base: base});

        expect(core.isValidNewParent(instance, base)).to.equal(false);
    });

    it('isValidNewParent should return false when new-parent is child node', function () {
        var fco = core.createNode({parent: root}),
            parent = core.createNode({parent: root, base: fco}),
            node = core.createNode({parent: parent, base: fco});

        expect(core.isValidNewParent(parent, node)).to.equal(false);
    });

    it('isValidNewParent should return false when new-parent\'s parent is instance of node', function () {
        var base = core.createNode({parent: root}),
            instance = core.createNode({parent: root, base: base});

        expect(core.isValidNewParent(base, instance)).to.equal(false);
    });

    // Base
    it('isValidNewBase should should return true when new-base is undefined', function () {
        var node = core.createNode({parent: root});

        expect(core.isValidNewBase(node, undefined)).to.equal(true);
    });

    it('isValidNewBase should should return true when new-base is null', function () {
        var node = core.createNode({parent: root});

        expect(core.isValidNewBase(node, null)).to.equal(true);
    });

    it('isValidNewBase should should return true when new-base is valid', function () {
        var fco = core.createNode({parent: root}),
            node = core.createNode({parent: root});

        expect(core.isValidNewBase(node, fco)).to.equal(true);
    });

    it('isValidNewBase should return false when new-base is parent of node', function () {
        var fco = core.createNode({parent: root}),
            parent = core.createNode({parent: root, base: fco}),
            node = core.createNode({parent: parent, base: fco});

        expect(core.isValidNewBase(node, parent)).to.equal(false);
    });

    it('isValidNewBase should return false when new-base is child of node', function () {
        var fco = core.createNode({parent: root}),
            parent = core.createNode({parent: root, base: fco}),
            node = core.createNode({parent: parent, base: fco});

        expect(core.isValidNewBase(parent, node)).to.equal(false);
    });

    it('isValidNewBase should return false when new-base is instance of node', function () {
        var node = core.createNode({parent: root}),
            instance = core.createNode({parent: root, base: node});

        expect(core.isValidNewBase(node, instance)).to.equal(false);
    });

    it('setBase should remove children that are not defined in common ancestor', function () {
        var newBase = core.createNode({parent: root}),
            node = core.createNode({parent: root});

        core.createNode({parent: newBase, relid: 'a'});
        core.createNode({parent: node, relid: 'b'});

        core.setBase(node, newBase);
        expect(core.getChildrenRelids(node)).to.have.members(['a']);
    });

    it('setBase should remove children(data) that are colliding and NOT defined in common ancestor', function (done) {
        var newBase = core.createNode({parent: root, relid: 'b'}),
            node = core.createNode({parent: root, relid: 'n'}),
            cBase = core.createNode({parent: newBase, relid: 'a'}),
            cNode = core.createNode({parent: node, relid: 'a'});

        core.setAttribute(cBase, 'name', 'cBase');
        core.setAttribute(cNode, 'name', 'cNode');

        core.setBase(node, newBase);
        expect(core.getChildrenRelids(node)).to.have.members(['a']);

        TASYNC.call(function (child) {
            expect(core.getPath(child)).to.equal('/n/a');
            expect(core.getAttribute(child, 'name')).to.eql('cBase');
            done();
        }, core.loadByPath(root, '/n/a'));
    });

    it('setBase should keep children(data) that are colliding but defined in common ancestor', function (done) {
        var ancestor = core.createNode({parent: root, relid: 'ancestor'}),
            newBase = core.createNode({parent: root, relid: 'b', base: ancestor}),
            node = core.createNode({parent: root, relid: 'n', base: ancestor}),
            child = core.createNode({parent: ancestor, relid: 'a'});

        core.setAttribute(child, 'name', 'cAncestor');

        TASYNC.call(function (instanceChild) {
            expect(instanceChild.length).to.equal(1);
            core.setAttribute(instanceChild[0], 'name', 'cNode');
            console.log('settingBase');
            core.setBase(node, newBase);
            console.log('baseSet');
            TASYNC.call(function (childAfterSetBase) {
                expect(core.getPath(childAfterSetBase)).to.equal('/n/a');
                expect(core.getAttribute(childAfterSetBase, 'name')).to.eql('cNode');
                done();
            }, core.loadByPath(root, '/n/a'));
        }, core.loadChildren(node, '/n'));
    });

    // Relids collision
    it('creating node with explicitly set relid should ASSERT if already exists', function () {
        core.createNode({parent: root, relid: 'taken'});
        try {
            core.createNode({parent: root, relid: 'taken'});
            throw new Error('Should have failed!');
        } catch (err) {
            expect(err.message).to.contain('Given relid already used in parent');
        }
    });

    it('creating node with explicitly set relid should ASSERT if already exists on base', function () {
        var ancestor = core.createNode({parent: root}),
            node = core.createNode({parent: root, base: ancestor});

        core.createNode({parent: ancestor, relid: 'taken'});
        try {
            core.createNode({parent: node, relid: 'taken'});
            throw new Error('Should have failed!');
        } catch (err) {
            expect(err.message).to.contain('Given relid already used in parent');
        }
    });

    it('should generate new relid/child when createNode node with all chars taken on node', function () {
        var node = core.createNode({parent: root});

        RELID_POOL.forEach(function (relid) {
            core.createNode({parent: node, relid: relid});
        });

        core.createNode({parent: node});

        expect(core.getChildrenRelids(node).length).to.equal(RELID_POOL.length + 1);
    });

    it('should generate new relid/child when createNode with all chars taken on base', function () {
        var ancestor = core.createNode({parent: root}),
            node = core.createNode({parent: root, base: ancestor});

        RELID_POOL.forEach(function (relid) {
            core.createNode({parent: ancestor, relid: relid});
        });

        core.createNode({parent: node});

        expect(core.getChildrenRelids(node).length).to.equal(core.getChildrenRelids(ancestor).length + 1);
    });

    it('should generate new relid/child when copyNode node with all chars taken on node', function () {
        var node = core.createNode({parent: root}),
            child;

        RELID_POOL.forEach(function (relid) {
            child = core.createNode({parent: node, relid: relid});
        });

        core.copyNode(child, node);

        expect(core.getChildrenRelids(node).length).to.equal(RELID_POOL.length + 1);
    });

    it('should generate new relid/child when copyNode with all chars taken on base', function () {
        var ancestor = core.createNode({parent: root}),
            node = core.createNode({parent: root, base: ancestor}),
            child;

        RELID_POOL.forEach(function (relid) {
            child = core.createNode({parent: ancestor, relid: relid});
        });

        core.copyNode(child, node);

        expect(core.getChildrenRelids(node).length).to.equal(core.getChildrenRelids(ancestor).length + 1);
    });

    it('should generate new relid/child when copyNodes node with all chars taken on node', function () {
        var node = core.createNode({parent: root}),
            child,
            child1;

        RELID_POOL.forEach(function (relid) {
            child1 = child;
            child = core.createNode({parent: node, relid: relid});
        });

        core.copyNodes([child, child1], node);

        expect(core.getChildrenRelids(node).length).to.equal(RELID_POOL.length + 2);
    });

    it('should generate new relid/child when copyNodes with all chars taken on base', function () {
        var ancestor = core.createNode({parent: root}),
            node = core.createNode({parent: root, base: ancestor}),
            child,
            child1;

        RELID_POOL.forEach(function (relid) {
            child1 = child;
            child = core.createNode({parent: ancestor, relid: relid});
        });

        core.copyNodes([child, child1], node);

        expect(core.getChildrenRelids(node).length).to.equal(core.getChildrenRelids(ancestor).length + 2);
    });

    it('should generate new relid/child when moveNode node with all chars taken on node', function () {
        var node = core.createNode({parent: root, relid: 'theNode'}),
            child = core.createNode({parent: root, relid: RELID_POOL[0]});

        RELID_POOL.forEach(function (relid) {
            core.createNode({parent: node, relid: relid});
        });

        core.moveNode(child, node);

        expect(core.getChildrenRelids(node).length).to.equal(RELID_POOL.length + 1);
    });

    it('should generate new relid/child when moveNode with all chars taken on base', function () {
        var ancestor = core.createNode({parent: root, relid: 'theAncestor'}),
            node = core.createNode({parent: root, base: ancestor, relid: 'theNode'}),
            child = core.createNode({parent: root, relid: RELID_POOL[0]});

        RELID_POOL.forEach(function (relid) {
            core.createNode({parent: ancestor, relid: relid});
        });

        core.moveNode(child, node);

        expect(core.getChildrenRelids(node).length).to.equal(core.getChildrenRelids(ancestor).length + 1);
    });

    it('should generate length 2 relid for child if instance already has a child', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInsatnce'}),
            child = core.createNode({parent: inst}),
            protoChild = core.createNode({parent: proto});

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(protoChild)).to.have.length(2);
    });

    it('should generate longer relid for child if instance already has a child', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInsatnce'}),
            child = core.createNode({parent: inst, relid: '123'}),
            protoChild = core.createNode({parent: proto});

        expect(core.getRelid(child)).to.have.length(3);
        expect(core.getRelid(protoChild)).to.have.length(4);
    });

    it('should not generate longer relid than allowed even if instance has child with longer relid', function () {
        var longrelid = 'thisIsWayTooLong',
            proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: longrelid}),
            protoChild = core.createNode({parent: proto});

        expect(core.getRelid(child)).to.have.length(longrelid.length);
        expect(core.getRelid(protoChild)).to.have.length(CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH);
    });

    it('should generate longer relid for copyNode child if instance already has a child 1', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '1'}),
            cpyChild = core.createNode({parent: root, relid: '2'}),
            copiedChild = core.copyNode(cpyChild, proto);

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(copiedChild)).to.have.length(2);
    });

    it('should generate longer relid for copyNode child if instance already has a child 2', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '1'}),
            cpyChild = core.createNode({parent: root, relid: '1'}),
            copiedChild = core.copyNode(cpyChild, proto);

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(copiedChild)).to.have.length(2);
    });

    it('should generate longer relid for copyNodes child if instance already has a child 1', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '1'}),
            cpyChild = core.createNode({parent: root, relid: '2'}),
            copiedChild = core.copyNodes([cpyChild], proto)[0];

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(copiedChild)).to.have.length(2);
    });

    it('should generate longer relid for copyNodes child if instance already has a child 2', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '1'}),
            cpyChild = core.createNode({parent: root, relid: '1'}),
            copiedChild = core.copyNodes([cpyChild], proto)[0];

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(copiedChild)).to.have.length(2);
    });

    it('should generate longer relid for moved child if instance already has a child 1', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '1'}),
            moveChild = core.createNode({parent: root, relid: '2'}),
            movedChild = core.moveNode(moveChild, proto);

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(movedChild)).to.have.length(2);
    });

    it('should generate longer relid for moved child if instance already has a child 2', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '1'}),
            moveChild = core.createNode({parent: root, relid: '1'}),
            movedChild = core.moveNode(moveChild, proto);

        expect(core.getRelid(child)).to.have.length(1);
        expect(core.getRelid(movedChild)).to.have.length(2);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY recursively through the inheritance chain at createdNOde 1', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            instInst = core.createNode({parent: root, base: inst, relid: 'theInstanceInstance'}),
            child1 = core.createNode({parent: instInst, relid: '1'}),
            child2 = core.createNode({parent: inst}),
            child3 = core.createNode({parent: proto});

        expect(core.getRelid(child1)).to.have.length(1);
        expect(core.getRelid(child2)).to.have.length(2);
        expect(core.getRelid(child3)).to.have.length(3);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY recursively through the inheritance chain at createdNode 2', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            instInst = core.createNode({parent: root, base: inst, relid: 'theInstanceInstance'}),
            child1 = core.createNode({parent: instInst, relid: '1'}),
            child2 = core.createNode({parent: inst}),
            child3 = core.createNode({parent: proto});

        expect(core.getRelid(child1)).to.have.length(1);
        expect(core.getRelid(child2)).to.have.length(2);
        expect(core.getRelid(child3)).to.have.length(3);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY recursively through the inheritance chain at createdNode 3', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            instInst = core.createNode({parent: root, base: inst, relid: 'theInstanceInstance'}),
            child1 = core.createNode({parent: instInst, relid: '1'}),
            child3 = core.createNode({parent: proto});

        expect(core.getRelid(child1)).to.have.length(1);
        expect(core.getRelid(child3)).to.have.length(2);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY at setBase', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            toBeInst = core.createNode({parent: root, relid: 'theInstance'}),
            child = core.createNode({parent: toBeInst, relid: '1'});

        expect(core.getRelid(child)).to.have.length(1);

        core.setBase(toBeInst, proto);

        child = core.createNode({parent: proto});
        expect(core.getRelid(child)).to.have.length(2);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY recursively through the inheritance chain at setBase', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            toBeInst = core.createNode({parent: root, relid: 'theInstanceInstance'}),
            child = core.createNode({parent: toBeInst, relid: '1'});

        expect(core.getRelid(child)).to.have.length(1);

        core.setBase(toBeInst, inst);

        child = core.createNode({parent: proto});
        expect(core.getRelid(child)).to.have.length(2);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY from property at setBase', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            toBeInst = core.createNode({parent: root, relid: 'i'}),
            toBeInstInst = core.createNode({parent: root, base: toBeInst, relid: 'theInstanceInstance'}),
            child = core.createNode({parent: toBeInstInst, relid: '1'});

        expect(core.getRelid(child)).to.have.length(1);

        core.setBase(toBeInst, proto);

        child = core.createNode({parent: proto});
        expect(core.getRelid(child)).to.have.length(2);
    });

    it('should only update MINIMAL_RELID_LENGTH_PROPERTY up to MAXIMUM_STARTING_RELID_LENGTH at setBase', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            toBeInst = core.createNode({parent: root, relid: 'i'}),
            child1 = core.createNode({parent: toBeInst, relid: '12345'}),
            child2 = core.createNode({parent: toBeInst, relid: '123456789'});

        expect(core.getRelid(child1)).to.have.length(CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH);
        expect(core.getRelid(child2)).to.have.length(9);

        core.setBase(toBeInst, proto);

        child1 = core.createNode({parent: proto});
        expect(core.getRelid(child1)).to.have.length(CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH);
    });

    // This case is for avoiding old relids increasing the size unnessesarily much.
    it('should only update MINIMAL_RELID_LENGTH_PROPERTY to length of children not exceeding MAXIMUM_STARTING_RELID_LENGTH at setBase', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            toBeInst = core.createNode({parent: root, relid: 'i'}),
            child1 = core.createNode({parent: toBeInst, relid: '123'}),
            child2 = core.createNode({parent: toBeInst, relid: '123456789'});

        expect(core.getRelid(child1)).to.have.length(3);
        expect(core.getRelid(child2)).to.have.length(9);

        core.setBase(toBeInst, proto);

        child1 = core.createNode({parent: proto});
        expect(core.getRelid(child1)).to.have.length(4);
    });

    it('should not copy over the MINIMAL_RELID_LENGTH_PROPERTY at copyNode', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '123'}),
            protoChild = core.createNode({parent: proto}),
            copy;

        expect(core.getRelid(child)).to.have.length(3);
        expect(core.getRelid(protoChild)).to.have.length(4);

        copy = core.copyNode(proto, root);
        child = core.createNode({parent: copy});

        expect(core.getRelid(child)).to.have.length(1);
    });

    it('should not copy over the MINIMAL_RELID_LENGTH_PROPERTY at copyNodes', function () {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: inst, relid: '123'}),
            protoChild = core.createNode({parent: proto}),
            copy;

        expect(core.getRelid(child)).to.have.length(3);
        expect(core.getRelid(protoChild)).to.have.length(4);

        copy = core.copyNodes([proto], root)[0];
        child = core.createNode({parent: copy});

        expect(core.getRelid(child)).to.have.length(1);
    });

    it('should not leave any overlay residue as an instance child that only has relations deleted', function (done) {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: proto, relid: 'theChild'}),
            inheritedChildPath = core.getPath(inst) + CONSTANTS.PATH_SEP + core.getRelid(child);

        TASYNC.call(function (children) {
            expect(children).to.have.length(1);
            core.setPointer(children[0], 'ref', root);
            core.deleteNode(child, true);
            core.persist(root);
            TASYNC.call(function (newRoot) {
                expect(core.getProperty(newRoot, CONSTANTS.OVERLAYS_PROPERTY)).to.include.keys(inheritedChildPath);
                TASYNC.call(function (inheritedChild) {
                    expect(inheritedChild).to.eql(null);
                    expect(core.getProperty(newRoot, CONSTANTS.OVERLAYS_PROPERTY))
                        .not.to.include.keys(inheritedChildPath);
                    done();
                }, core.loadByPath(newRoot, inheritedChildPath));
            }, core.loadRoot(core.getHash(root)));

        }, core.loadChildren(inst));
    });

    it('should not leave any overlay residue even if the inherited child was the target', function (done) {
        var proto = core.createNode({parent: root, relid: 'theAncestor'}),
            inst = core.createNode({parent: root, base: proto, relid: 'theInstance'}),
            child = core.createNode({parent: proto, relid: 'theChild'}),
            inheritedChildPath = core.getPath(inst) + CONSTANTS.PATH_SEP + core.getRelid(child);

        TASYNC.call(function (children) {
            expect(children).to.have.length(1);
            core.setPointer(root, 'ref', children[0]);
            core.deleteNode(child, true);
            core.persist(root);
            TASYNC.call(function (newRoot) {
                expect(core.getProperty(newRoot, CONSTANTS.OVERLAYS_PROPERTY)['']).to.include.keys('ref');
                TASYNC.call(function (inheritedChild) {
                    expect(inheritedChild).to.eql(null);
                    expect(core.getProperty(newRoot, CONSTANTS.OVERLAYS_PROPERTY)[''])
                        .not.to.include.keys('ref');
                    done();
                }, core.loadByPath(newRoot, inheritedChildPath));
            }, core.loadRoot(core.getHash(root)));

        }, core.loadChildren(inst));
    });

    it('should gather correctly all instances', function () {
        var root = core.createNode({}),
            base = core.createNode({parent: root, relid: 'base'}),
            container = core.createNode({parent: root, base: base, relid: 'template'}),
            child = core.createNode({parent: container, base: base, relid: 'child'}),
            instance = core.createNode({parent: root, base: container, relid: 'instance'});

        expect(core.getInstancePaths(root)).to.have.length(0);
        expect(core.getInstancePaths(base)).to.have.members(['/template', '/template/child']);
        expect(core.getInstancePaths(container)).to.have.members(['/instance']);
        expect(core.getInstancePaths(child)).to.have.members(['/instance/child']);

    });

    it('should load all instances correctly', function (done) {
        var root = core.createNode({}),
            base = core.createNode({parent: root, relid: 'base'}),
            container = core.createNode({parent: root, base: base, relid: 'template'}),
            child = core.createNode({parent: container, base: base, relid: 'child'}),
            instance = core.createNode({parent: root, base: container, relid: 'instance'}),
            neededChecks = 2;

        core.persist(root);
        TASYNC.call(function (newRoot) {
            TASYNC.call(function (newChild) {
                TASYNC.call(function (instances) {
                    expect(instances).to.have.length(1);
                    expect(core.getPath(instances[0])).to.equal('/instance/child');
                    if (--neededChecks === 0) {
                        done();
                    }
                }, core.loadInstances(newChild));
                TASYNC.call(function (instances) {
                    var paths = [];
                    expect(instances).to.have.length(2);

                    paths.push(core.getPath(instances[0]));
                    paths.push(core.getPath(instances[1]));
                    expect(paths).to.have.members(['/template', '/template/child']);
                    if (--neededChecks === 0) {
                        done();
                    }
                }, core.loadInstances(core.getBase(newChild)));
            }, core.loadByPath(newRoot, '/template/child'));
        }, core.loadRoot(core.getHash(root)));
    });

    it('should remove atr and reg field of an instance during persist', function (done) {
        var ancestor = core.createNode({parent: root, relid: 'theAncestor'}),
            node = core.createNode({parent: root, base: ancestor, relid: 'theNode'});

        core.persist(root);
        TASYNC.call(function (newRoot) {
            TASYNC.call(function (newNode) {
                core.setAttribute(newNode, 'one', 'value');
                core.delAttribute(newNode, 'one');
                core.setRegistry(newNode, 'two', 'values');
                core.delRegistry(newNode, 'two');
                core.persist(newRoot);
                expect(newNode.data).not.to.have.keys(['atr', 'reg']);
                done();
            }, core.loadByPath(newRoot, '/theNode'));
        }, core.loadRoot(core.getHash(root)));
    });

});
/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('coretype', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        logger = testFixture.logger.fork('coretype.spec'),
        storage,
        expect = testFixture.expect,
        Type = testFixture.requirejs('common/core/coretype'),
        Rel = testFixture.requirejs('common/core/corerel'),
        Tree = testFixture.requirejs('common/core/coretree'),
        NullPtr = testFixture.requirejs('common/core/nullpointercore'),
        TASYNC = testFixture.requirejs('common/core/tasync'),
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
                base = core.createNode({parent: root});
                core.setAttribute(base, 'name', 'base');
                core.setRegistry(base, 'position', {x: 100, y: 100});
                core.setPointer(base, 'parent', root);

                bChild = core.createNode({parent: base});
                core.setPointer(bChild, 'out', root);
                core.setPointer(bChild, 'in', base);
                instance = core.createNode({parent: root, base: base});
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
});
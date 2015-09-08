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
        TASYNC = testFixture.requirejs('common/core/tasync'),
        Core = function (s, options) {
            return new Type(new Rel(new Tree(s, options), options), options);
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
});
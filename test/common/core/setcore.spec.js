/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('set core', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        logger = testFixture.logger.fork('setcore.spec'),
        storage,
        expect = testFixture.expect,
        projectName = 'coreSetTesting',
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
                var project = new testFixture.Project(dbProject, storage, logger, gmeConfig);
                core = new testFixture.WebGME.core(project, {
                    globConf: gmeConfig,
                    logger: testFixture.logger.fork('meta-core:core')
                });
                root = core.createNode();
            })
            .nodeify(done);
    });

    afterEach(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                return storage.closeDatabase();
            })
            .nodeify(done);
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when adding inherited child to a set', function (done) {
        var proto = core.createNode({parent: root, relid: 'p'}),
            derived = core.createNode({parent: root, base: proto, relid: 'd'}),
            setNode = core.createNode({parent: root});

        core.createNode({parent: proto, relid: 'c'});
        core.createSet(setNode, 'set');

        core.loadChildren(derived, function (err, children) {
            var newChild;
            expect(err).to.equal(null);
            expect(children.length).to.equal(1);
            expect(core.getRelid(children[0])).to.equal('c');
            core.addMember(setNode, 'set', children[0]);
            newChild = core.createNode({parent: proto});
            expect(core.getRelid(newChild).length > 1).to.equal(true);
            done();
        });
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when adding set to inherited child', function (done) {
        var proto = core.createNode({parent: root, relid: 'p'}),
            derived = core.createNode({parent: root, base: proto, relid: 'd'});

        core.createNode({parent: proto, relid: 'c'});

        core.loadChildren(derived, function (err, children) {
            var newChild;
            expect(err).to.equal(null);
            expect(children.length).to.equal(1);
            expect(core.getRelid(children[0])).to.equal('c');
            core.createSet(children[0], 'set');
            newChild = core.createNode({parent: proto});
            expect(core.getRelid(newChild).length > 1).to.equal(true);
            done();
        });
    });

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when adding member to inherited child',
        function (done) {
            var proto = core.createNode({parent: root, relid: 'p'}),
                derived = core.createNode({parent: root, base: proto, relid: 'd'}),
                child = core.createNode({parent: proto, relid: 'c'}),
                member = core.createNode({parent: root});

            core.loadChildren(derived, function (err, children) {
                var newChild;
                expect(err).to.equal(null);
                expect(children.length).to.equal(1);
                expect(core.getRelid(children[0])).to.equal('c');
                core.addMember(children[0], 'set', member);
                newChild = core.createNode({parent: proto});
                expect(core.getRelid(newChild).length > 1).to.equal(true);
                done();
            });
        }
    );

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when adding member to inherited child with set on base',
        function (done) {
            var proto = core.createNode({parent: root, relid: 'p'}),
                derived = core.createNode({parent: root, base: proto, relid: 'd'}),
                child = core.createNode({parent: proto, relid: 'c'}),
                member = core.createNode({parent: root});

            core.createSet(child, 'set');

            core.loadChildren(derived, function (err, children) {
                var newChild;
                expect(err).to.equal(null);
                expect(children.length).to.equal(1);
                expect(core.getRelid(children[0])).to.equal('c');
                core.addMember(children[0], 'set', member);
                newChild = core.createNode({parent: proto});
                expect(core.getRelid(newChild).length > 1).to.equal(true);
                done();
            });
        }
    );

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when setting attribute of inherited member in inherited child',
        function (done) {
            var proto = core.createNode({parent: root, relid: 'p'}),
                derived = core.createNode({parent: root, base: proto, relid: 'd'}),
                child = core.createNode({parent: proto, relid: 'c'}),
                member = core.createNode({parent: root});

            core.createSet(child, 'set');
            core.addMember(child, 'set', member);

            core.loadChildren(derived, function (err, children) {
                var newChild;
                expect(err).to.equal(null);
                expect(children.length).to.equal(1);
                expect(core.getRelid(children[0])).to.equal('c');
                core.setMemberAttribute(children[0], 'set', core.getPath(member), 'someName', 'someVal');
                newChild = core.createNode({parent: proto});
                expect(core.getRelid(newChild).length > 1).to.equal(true);
                done();
            });
        }
    );

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when setting registry of inherited member in inherited child',
        function (done) {
            var proto = core.createNode({parent: root, relid: 'p'}),
                derived = core.createNode({parent: root, base: proto, relid: 'd'}),
                child = core.createNode({parent: proto, relid: 'c'}),
                member = core.createNode({parent: root});

            core.createSet(child, 'set');
            core.addMember(child, 'set', member);

            core.loadChildren(derived, function (err, children) {
                var newChild;
                expect(err).to.equal(null);
                expect(children.length).to.equal(1);
                expect(core.getRelid(children[0])).to.equal('c');
                core.setMemberRegistry(children[0], 'set', core.getPath(member), 'someName', 'someVal');
                newChild = core.createNode({parent: proto});
                expect(core.getRelid(newChild).length > 1).to.equal(true);
                done();
            });
        }
    );

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when setting set registry of inherited set in inherited child',
        function (done) {
            var proto = core.createNode({parent: root, relid: 'p'}),
                derived = core.createNode({parent: root, base: proto, relid: 'd'}),
                child = core.createNode({parent: proto, relid: 'c'});

            core.createSet(child, 'set');

            core.loadChildren(derived, function (err, children) {
                var newChild;
                expect(err).to.equal(null);
                expect(children.length).to.equal(1);
                expect(core.getRelid(children[0])).to.equal('c');
                core.setSetRegistry(children[0], 'set', 'someName', 'someVal');
                newChild = core.createNode({parent: proto});
                expect(core.getRelid(newChild).length > 1).to.equal(true);
                done();
            });
        }
    );

    it('should update MINIMAL_RELID_LENGTH_PROPERTY when setting set attribute of inherited set in inherited child',
        function (done) {
            var proto = core.createNode({parent: root, relid: 'p'}),
                derived = core.createNode({parent: root, base: proto, relid: 'd'}),
                child = core.createNode({parent: proto, relid: 'c'});

            core.createSet(child, 'set');

            core.loadChildren(derived, function (err, children) {
                var newChild;
                expect(err).to.equal(null);
                expect(children.length).to.equal(1);
                expect(core.getRelid(children[0])).to.equal('c');
                core.createSet(children[0], 'set');
                core.setSetAttribute(children[0], 'set', 'someName', 'someVal');
                newChild = core.createNode({parent: proto});
                expect(core.getRelid(newChild).length > 1).to.equal(true);
                done();
            });
        }
    );

    it('set members should be inherited as well', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            instanceMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', instanceMember);

        expect(core.getSetNames(setInstance)).to.have.members(['set']);
        expect(core.getMemberPaths(setInstance, 'set')).to.have.members(
            [core.getPath(member), core.getPath(instanceMember)]);

    });

    it('removal of base member should be visible even if overriden by attribute', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            instanceMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', instanceMember);
        core.setMemberAttribute(setInstance, 'set', core.getPath(member), 'myAttr', 'myValue');
        core.delMember(setType, 'set', core.getPath(member));

        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(instanceMember)]);
    });

    it('removal of base member should be visible even if overriden by registry', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            instanceMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', instanceMember);
        core.setMemberRegistry(setInstance, 'set', core.getPath(member), 'myReg', 'myValue');
        core.delMember(setType, 'set', core.getPath(member));

        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(instanceMember)]);
    });

    it('set of instance should not be touched by the removal of the set of the base', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            instanceMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', instanceMember);
        core.deleteSet(setType, 'set');

        expect(core.getSetNames(setType)).not.to.have.members(['set']);
        expect(core.getSetNames(setInstance)).to.have.members(['set']);
        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(instanceMember)]);
    });

    it('removal of set of base should remove even \'attribute overriden\' members', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            instanceMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', instanceMember);
        core.setMemberAttribute(setInstance, 'set', core.getPath(member), 'myAttr', 'myValue');
        core.deleteSet(setType, 'set');

        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(instanceMember)]);
    });

    it('removal of set of base should remove even \'registry overriden\' members', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            instanceMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', instanceMember);
        core.setMemberRegistry(setInstance, 'set', core.getPath(member), 'myReg', 'myValue');
        core.deleteSet(setType, 'set');

        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(instanceMember)]);
    });

    it('fully overriden members should remain even after base member is removed', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);

        expect(core.getMemberPaths(setType, 'set')).to.have.members([core.getPath(member)]);
        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(member)]);

        //override the member
        core.addMember(setInstance, 'set', member);

        expect(core.getMemberPaths(setType, 'set')).to.have.members([core.getPath(member)]);
        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(member)]);

        //remove from base
        core.delMember(setType, 'set', core.getPath(member));
        expect(core.getMemberPaths(setType, 'set')).to.empty;
        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(member)]);
    });

    it('overriding a member should get the already overridden properties', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);

        expect(core.getMemberPaths(setType, 'set')).to.have.members([core.getPath(member)]);
        expect(core.getMemberPaths(setInstance, 'set')).to.have.members([core.getPath(member)]);

        //override the member's properties
        core.setMemberAttribute(setInstance, 'set', core.getPath(member), 'attribute', 'value');
        core.setMemberRegistry(setInstance, 'set', core.getPath(member), 'registry', 'regValue');

        expect(core.getMemberAttribute(setType, 'set', core.getPath(member), 'attribute')).to.equal(undefined);
        expect(core.getMemberAttribute(setInstance, 'set', core.getPath(member), 'attribute')).to.equal('value');
        expect(core.getMemberRegistry(setType, 'set', core.getPath(member), 'registry')).to.equal(undefined);
        expect(core.getMemberRegistry(setInstance, 'set', core.getPath(member), 'registry')).to.equal('regValue');

        //now override the member
        core.addMember(setInstance, 'set', member);

        expect(core.getMemberAttribute(setInstance, 'set', core.getPath(member), 'attribute')).to.equal('value');
        expect(core.getMemberRegistry(setInstance, 'set', core.getPath(member), 'registry')).to.equal('regValue');

        //now delete the base-member
        core.delMember(setType, 'set', core.getPath(member));

        // instance should still have the member
        expect(core.getMemberPaths(setInstance, 'set')).to.deep.equal([core.getPath(member)]);
    });

    it('should return all member as own, that has new information', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            fullyOverriddenMember = core.createNode({parent: root}),
            propertyOverriddenMember = core.createNode({parent: root}),
            newMember = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', fullyOverriddenMember);
        core.addMember(setType, 'set', propertyOverriddenMember);
        core.addMember(setInstance, 'set', newMember);

        expect(core.getOwnMemberPaths(setType, 'set')).to.have.members([
            core.getPath(fullyOverriddenMember),
            core.getPath(propertyOverriddenMember)
        ]);
        expect(core.getOwnMemberPaths(setInstance, 'set')).to.have.members([
            core.getPath(newMember)
        ]);

        //now override the property
        core.setMemberAttribute(setInstance, 'set', core.getPath(propertyOverriddenMember), 'myAttr', 'myValue');

        expect(core.getOwnMemberPaths(setInstance, 'set')).to.have.members([
            core.getPath(propertyOverriddenMember),
            core.getPath(newMember)
        ]);

        //now override the member
        core.addMember(setInstance, 'set', fullyOverriddenMember);

        expect(core.getOwnMemberPaths(setInstance, 'set')).to.have.members([
            core.getPath(fullyOverriddenMember),
            core.getPath(propertyOverriddenMember),
            core.getPath(newMember)
        ]);
    });

    it('setMemberRegistry should not modify the set if path not a member', function () {
        var setType = core.createNode({parent: root});

        core.createSet(setType, 'set');
        try {
            core.setMemberRegistry(setType, 'set', 'doesNotExist', 'myReg', 'myValue');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalArgumentError');
        } finally {
            expect(core.getMemberPaths(setType, 'set')).to.deep.equal([]);
        }
    });

    it('getMemberRegistry/Names and getMemberOwnRegistry/Names should return appropriate', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            mPath = core.getPath(member);

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);

        core.setMemberRegistry(setType, 'set', mPath, 'baseReg', 'myValue1');
        core.setMemberRegistry(setInstance, 'set', mPath, 'instanceReg', 'myValue2');

        expect(core.getMemberRegistryNames(setType, 'set', mPath)).to.deep.equal(['baseReg']);
        expect(core.getMemberRegistryNames(setInstance, 'set', mPath)).to.have.members(['baseReg', 'instanceReg']);
        expect(core.getMemberOwnRegistryNames(setInstance, 'set', mPath)).to.have.members(['instanceReg']);

        expect(core.getMemberRegistry(setType, 'set', mPath, 'baseReg')).to.equal('myValue1');
        expect(core.getMemberRegistry(setType, 'set', mPath, 'instanceReg')).to.equal(undefined);
        expect(core.getMemberRegistry(setInstance, 'set', mPath, 'baseReg')).to.equal('myValue1');
        expect(core.getMemberOwnRegistry(setInstance, 'set', mPath, 'baseReg')).to.equal(undefined);
        expect(core.getMemberRegistry(setInstance, 'set', mPath, 'instanceReg')).to.equal('myValue2');
        expect(core.getMemberOwnRegistry(setInstance, 'set', mPath, 'instanceReg')).to.equal('myValue2');
    });

    it('getMemberAttribute/Names and getAttributeOwnRegistry/Names should return appropriate', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            mPath = core.getPath(member);

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);

        core.setMemberAttribute(setType, 'set', mPath, 'baseAttr', 'myValue1');
        core.setMemberAttribute(setInstance, 'set', mPath, 'instanceAttr', 'myValue2');

        expect(core.getMemberAttributeNames(setType, 'set', mPath)).to.deep.equal(['baseAttr']);
        expect(core.getMemberAttributeNames(setInstance, 'set', mPath)).to.have.members(['baseAttr', 'instanceAttr']);
        expect(core.getMemberOwnAttributeNames(setInstance, 'set', mPath)).to.have.members(['instanceAttr']);

        expect(core.getMemberAttribute(setType, 'set', mPath, 'baseAttr')).to.equal('myValue1');
        expect(core.getMemberAttribute(setType, 'set', mPath, 'instanceAttr')).to.equal(undefined);
        expect(core.getMemberAttribute(setInstance, 'set', mPath, 'baseAttr')).to.equal('myValue1');
        expect(core.getMemberOwnAttribute(setInstance, 'set', mPath, 'baseAttr')).to.equal(undefined);
        expect(core.getMemberAttribute(setInstance, 'set', mPath, 'instanceAttr')).to.equal('myValue2');
        expect(core.getMemberOwnAttribute(setInstance, 'set', mPath, 'instanceAttr')).to.equal('myValue2');
    });

    it('add a memberAttribute/Registry and then delete it twice', function () {
        var setType = core.createNode({parent: root}),
            member = core.createNode({parent: root}),
            memberPath = core.getPath(member);

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);

        core.setMemberAttribute(setType, 'set', core.getPath(member), 'myAttr', 'myAttrValue');
        core.setMemberRegistry(setType, 'set', core.getPath(member), 'myReg', 'myRegValue');

        expect(core.getMemberAttributeNames(setType, 'set', memberPath)).to.deep.equal(['myAttr']);
        expect(core.getMemberRegistryNames(setType, 'set', memberPath)).to.deep.equal(['myReg']);
        expect(core.getMemberAttribute(setType, 'set', memberPath, 'myAttr')).to.equal('myAttrValue');
        expect(core.getMemberRegistry(setType, 'set', memberPath, 'myReg')).to.equal('myRegValue');

        core.delMemberAttribute(setType, 'set', core.getPath(member), 'myAttr');
        core.delMemberRegistry(setType, 'set', core.getPath(member), 'myReg');

        expect(core.getMemberAttributeNames(setType, 'set', memberPath)).to.deep.equal([]);
        expect(core.getMemberRegistryNames(setType, 'set', memberPath)).to.deep.equal([]);
        expect(core.getMemberAttribute(setType, 'set', memberPath, 'myAttr')).to.equal(undefined);
        expect(core.getMemberRegistry(setType, 'set', memberPath, 'myReg')).to.equal(undefined);

        try {
            core.delMemberAttribute(setType, 'set', core.getPath(member), 'myAttr');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.delMemberRegistry(setType, 'set', core.getPath(member), 'myReg');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should set/get/del Set Registries and own should act as expected', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType});

        // Getting before set created
        try {
            core.getSetRegistryNames(setType, 'set');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.getOwnSetRegistryNames(setType, 'set');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.getSetRegistry(setType, 'set', 'base');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.getOwnSetRegistry(setType, 'set', 'base');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }

        core.createSet(setType, 'set');
        core.setSetRegistry(setType, 'set', 'base', 'baseValue');
        core.setSetRegistry(setInstance, 'set', 'instance', 'instanceValue');

        expect(core.getSetRegistryNames(setType, 'set')).to.deep.equal(['base']);
        expect(core.getOwnSetRegistryNames(setType, 'set')).to.deep.equal(['base']);
        expect(core.getSetRegistry(setType, 'set', 'base')).to.equal('baseValue');
        expect(core.getOwnSetRegistry(setType, 'set', 'instance')).to.equal(undefined);

        expect(core.getSetRegistryNames(setInstance, 'set')).to.have.members(['base', 'instance']);
        expect(core.getOwnSetRegistryNames(setInstance, 'set')).to.deep.equal(['instance']);
        expect(core.getSetRegistry(setInstance, 'set', 'base')).to.equal('baseValue');
        expect(core.getOwnSetRegistry(setInstance, 'set', 'instance')).to.equal('instanceValue');

        core.delSetRegistry(setType, 'set', 'base');
        expect(core.getSetRegistryNames(setType, 'set')).to.deep.equal([]);
        expect(core.getSetRegistryNames(setInstance, 'set')).to.deep.equal(['instance']);
    });

    it('should set/get/del Set Attributes and own should act as expected', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType});

        // Getting before set created
        try {
            core.getSetAttributeNames(setType, 'set');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.getOwnSetAttributeNames(setType, 'set');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.getSetAttribute(setType, 'set', 'base');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.getOwnSetAttribute(setType, 'set', 'base');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }

        core.createSet(setType, 'set');
        core.setSetAttribute(setType, 'set', 'base', 'baseValue');
        core.setSetAttribute(setInstance, 'set', 'instance', 'instanceValue');

        expect(core.getSetAttributeNames(setType, 'set')).to.deep.equal(['base']);
        expect(core.getOwnSetAttributeNames(setType, 'set')).to.deep.equal(['base']);
        expect(core.getSetAttribute(setType, 'set', 'base')).to.equal('baseValue');
        expect(core.getOwnSetAttribute(setType, 'set', 'instance')).to.equal(undefined);

        expect(core.getSetAttributeNames(setInstance, 'set')).to.have.members(['base', 'instance']);
        expect(core.getOwnSetAttributeNames(setInstance, 'set')).to.deep.equal(['instance']);
        expect(core.getSetAttribute(setInstance, 'set', 'base')).to.equal('baseValue');
        expect(core.getOwnSetAttribute(setInstance, 'set', 'instance')).to.equal('instanceValue');

        core.delSetAttribute(setType, 'set', 'base');
        expect(core.getSetAttributeNames(setType, 'set')).to.deep.equal([]);
        expect(core.getSetAttributeNames(setInstance, 'set')).to.deep.equal(['instance']);
    });

    it('getOwnSetNames should not include inherited sets', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType});

        core.createSet(setType, 'set');

        expect(core.getSetNames(setType, 'set')).to.have.members(['set']);
        expect(core.getSetNames(setInstance, 'set')).to.have.members(['set']);
        expect(core.getOwnSetNames(setInstance, 'set')).to.have.members([]);

        core.createSet(setInstance, 'setInstance');

        expect(core.getSetNames(setType, 'set')).to.have.members(['set']);
        expect(core.getSetNames(setInstance, 'set')).to.have.members(['set', 'setInstance']);
        expect(core.getOwnSetNames(setInstance, 'set')).to.have.members(['setInstance']);
    });

    it('isFullyOverriddenMember should throw if no set', function () {
        var setType = core.createNode({parent: root});

        try {
            core.isFullyOverriddenMember(setType, 'set', 'dummyMemberPath');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('isFullyOverriddenMember should throw if no base', function () {
        var setType = core.createNode({parent: root});

        core.createSet(setType, 'set');

        try {
            core.isFullyOverriddenMember(setType, 'set', 'dummyMemberPath');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('isFullyOverriddenMember should return false if base does not have set', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            memberPath = core.getPath(member);

        core.createSet(setInstance, 'set');
        core.addMember(setInstance, 'set', member);

        expect(core.isFullyOverriddenMember(setInstance, 'set', memberPath)).to.equal(false);
    });

    it('isFullyOverriddenMember should return false if base has member and instance on modified data', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            memberPath = core.getPath(member);

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberRegistry(setInstance, 'set', memberPath, 'reg', 'regValue');

        expect(core.isFullyOverriddenMember(setInstance, 'set', memberPath)).to.equal(false);
    });

    it('isFullyOverriddenMember should return if base has member and instance has added member', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            memberPath = core.getPath(member);

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', member);

        expect(core.isFullyOverriddenMember(setInstance, 'set', memberPath)).to.equal(true);
    });

    it('isMemberOf should return both base and instance membership if added to both', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            compareObj = {};

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', member);

        compareObj[core.getPath(setType)] = ['set'];
        compareObj[core.getPath(setInstance)] = ['set'];
        expect(core.isMemberOf(member)).to.deep.equal(compareObj);
    });

    it('isMemberOf should return only base membership if not isFullyOverriddenMember in instance', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root}),
            memberPath = core.getPath(member),
            compareObj = {};

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberRegistry(setInstance, 'set', memberPath, 'reg', 'regValue');

        compareObj[core.getPath(setType)] = ['set'];
        expect(core.isMemberOf(member)).to.deep.equal(compareObj);
    });

    it('getCollectionNames should exclude member(ships)', function () {
        var setType = core.createNode({parent: root}),
            member = core.createNode({parent: root}),
            memberPath = core.getPath(member);

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberRegistry(setType, 'set', memberPath, 'reg', 'regValue');
        core.setPointer(setType, 'ptr', member);

        expect(core.getCollectionNames(member)).to.deep.equal(['ptr']);
    });

    // FIXME: This must be resolved
    it.skip('should addMember twice with no duplication', function () {
        var setType = core.createNode({parent: root}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.persist(root);
        core.addMember(setType, 'set', member);
        expect(core.getMemberPaths(setType, 'set')).to.deep.equal([core.getPath(member)]);
        expect(core.persist(root).objects).to.deep.equal({});
    });

    it('should addMember twice with no duplication on instance', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.addMember(setInstance, 'set', member);
        expect(core.getMemberPaths(setInstance, 'set')).to.deep.equal([core.getPath(member)]);
    });

    it('should not delete inherited member', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.persist(root);
        core.delMember(setInstance, 'set', core.getPath(member));
        expect(core.getMemberPaths(setInstance, 'set')).to.deep.equal([core.getPath(member)]);
        expect(core.persist(root).objects).to.deep.equal({});
    });

    it('should not delete inherited member registry', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberRegistry(setType, 'set', core.getPath(member), 'regName', 'regVal');
        core.persist(root);
        core.delMemberRegistry(setInstance, 'set', core.getPath(member), 'regName');
        expect(core.getMemberRegistry(setInstance, 'set', core.getPath(member), 'regName')).to.equal('regVal');
        expect(core.persist(root).objects).to.deep.equal({});
    });

    it('should not delete inherited member attribute', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberAttribute(setType, 'set', core.getPath(member), 'attrName', 'attrVal');
        core.persist(root);
        core.delMemberAttribute(setInstance, 'set', core.getPath(member), 'attrName');
        expect(core.getMemberAttribute(setInstance, 'set', core.getPath(member), 'attrName')).to.equal('attrVal');
        expect(core.persist(root).objects).to.deep.equal({});
    });

    it('should persist when creating empty set', function () {
        var setType = core.createNode({parent: root}),
            persisted;

        core.createSet(setType, 'set');
        core.persist(root);
        core.createSet(setType, 'set2');
        persisted = core.persist(root).objects;
        expect(Object.keys(persisted).length).to.equal(2);
    });

    it('issue #1228 should return all member attribute names although not valid relid', function () {
        var setType = core.createNode({parent: root}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberAttribute(setType, 'set', core.getPath(member), 'attr_name', 'attrVal');
        expect(core.getMemberAttributeNames(setType, 'set', core.getPath(member))).to.deep.equal(['attr_name']);
    });

    it('issue #1228 should return all member registry names although not valid relid', function () {
        var setType = core.createNode({parent: root}),
            member = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.addMember(setType, 'set', member);
        core.setMemberRegistry(setType, 'set', core.getPath(member), 'reg_name', 'regVal');
        expect(core.getMemberRegistryNames(setType, 'set', core.getPath(member))).to.deep.equal(['reg_name']);
    });

    it('issue #1228 should return all set attribute names although not valid relid', function () {
        var setType = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.setSetAttribute(setType, 'set', 'attr_name', 'attrVal');
        expect(core.getSetAttributeNames(setType, 'set')).to.deep.equal(['attr_name']);
    });

    it('issue #1228 should return all set registry names although not valid relid', function () {
        var setType = core.createNode({parent: root});

        core.createSet(setType, 'set');
        core.setSetRegistry(setType, 'set', 'reg_name', 'regVal');
        expect(core.getSetRegistryNames(setType, 'set')).to.deep.equal(['reg_name']);
    });

    it('setSetAttribute/Registry should not alter data when hasSet is false', function () {
        var setType = core.createNode({parent: root}),
            persisted;

        core.persist(root);
        try {
            core.setSetAttribute(setType, 'set', 'someName', 'someVal');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.setSetRegistry(setType, 'set', 'someName', 'someVal');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        persisted = core.persist(root).objects;
        expect(persisted).to.deep.equal({});
    });

    it('setSetAttribute/Registry should alter data when base has set', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            persisted;

        core.createSet(setType, 'set');
        core.persist(root);
        core.setSetAttribute(setInstance, 'set', 'someName', 'someVal');
        core.setSetRegistry(setInstance, 'set', 'someName', 'someVal');
        persisted = core.persist(root).objects;
        expect(Object.keys(persisted).length).to.equal(2);
    });

    it('delSetAttribute/Registry should not alter data when there is no data', function () {
        var setType = core.createNode({parent: root}),
            persisted;

        core.persist(root);
        try {
            core.delSetAttribute(setType, 'set', 'someName');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        try {
            core.delSetRegistry(setType, 'set', 'someName');
        } catch (e) {
            expect(e instanceof Error).to.eql(true);
            expect(e.name).to.eql('CoreIllegalOperationError');
        }
        persisted = core.persist(root).objects;
        expect(persisted).to.deep.equal({});
    });

    it('delSetAttribute/Registry should not alter data when base has set and props', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType}),
            persisted;

        core.createSet(setType, 'set');
        core.setSetAttribute(setType, 'set', 'someName', 'someVal');
        core.setSetRegistry(setType, 'set', 'someName', 'someVal');
        core.persist(root);
        core.delSetAttribute(setInstance, 'set', 'someName', 'someVal');
        core.delSetRegistry(setInstance, 'set', 'someName', 'someVal');
        persisted = core.persist(root).objects;
        expect(persisted).to.deep.equal({});
    });
});
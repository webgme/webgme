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
        core.setMemberAttribute(setInstance,'set',core.getPath(propertyOverriddenMember),'myAttr','myValue');

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
        core.setMemberRegistry(setType, 'set', 'doesNotExist', 'myReg', 'myValue');

        expect(core.getMemberPaths(setType, 'set')).to.deep.equal([]);
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

    it('all member getters should return undefined or empty array when no set defined', function () {
        var node = core.createNode({parent: root}),
            dummyPath = 'doesNotExist',
            dummyPropName = 'dummyProp';

        expect(core.getMemberPaths (node, 'set')).to.deep.equal([]);
        expect(core.getOwnMemberPaths (node, 'set')).to.deep.equal([]);

        expect(core.getMemberAttributeNames(node, 'set', dummyPath)).to.deep.equal([]);
        expect(core.getMemberOwnAttributeNames(node, 'set', dummyPath)).to.deep.equal([]);
        expect(core.getMemberAttribute(node, 'set', dummyPath, dummyPropName)).to.equal(undefined);
        expect(core.getMemberOwnAttribute(node, 'set', dummyPath, dummyPropName)).to.equal(undefined);

        expect(core.getMemberRegistryNames(node, 'set', dummyPath)).to.deep.equal([]);
        expect(core.getMemberOwnRegistryNames(node, 'set', dummyPath)).to.deep.equal([]);
        expect(core.getMemberRegistry(node, 'set', dummyPath, dummyPropName)).to.equal(undefined);
        expect(core.getMemberOwnRegistry(node, 'set', dummyPath, dummyPropName)).to.equal(undefined);
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

        core.delMemberAttribute(setType, 'set', core.getPath(member), 'myAttr');
        core.delMemberRegistry(setType, 'set', core.getPath(member), 'myReg');
    });

    it('should set/get/del Set Registries and own should act as expected', function () {
        var setType = core.createNode({parent: root}),
            setInstance = core.createNode({parent: root, base: setType});

        // Getting before set created
        expect(core.getSetRegistryNames(setType, 'set')).to.deep.equal([]);
        expect(core.getOwnSetRegistryNames(setType, 'set')).to.deep.equal([]);
        expect(core.getSetRegistry(setType, 'set', 'base')).to.equal(undefined);
        expect(core.getOwnSetRegistry(setType, 'set', 'base')).to.equal(undefined);

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
        expect(core.getSetAttributeNames(setType, 'set')).to.deep.equal([]);
        expect(core.getOwnSetAttributeNames(setType, 'set')).to.deep.equal([]);
        expect(core.getSetAttribute(setType, 'set', 'base')).to.equal(undefined);
        expect(core.getOwnSetAttribute(setType, 'set', 'base')).to.equal(undefined);

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
});
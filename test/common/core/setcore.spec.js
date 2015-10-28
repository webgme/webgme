/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
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
});
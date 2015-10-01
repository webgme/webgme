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
});
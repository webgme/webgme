/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../../_globals');

describe('serialization', function () {
    'use strict';
    var projectNameFrom = 'serializationTestFrom',
        projectIdFrom = testFixture.projectName2Id(projectNameFrom),
        projectNameTo = 'serializationTestTo',
        projectIdTo = testFixture.projectName2Id(projectNameTo),
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('serialization.spec'),
        expect = testFixture.expect,
        Serialization = testFixture.requirejs('common/core/users/serialization'),
        storage,
        contextFrom,
        contextTo,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectNameFrom)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: projectIdFrom});
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectNameFrom,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/ActivePanels.json'
                });
            })
            .then(function (result) {
                contextFrom = result;

                return testFixture.importProject(storage, {
                    projectName: projectNameTo,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/EmptyProject.json'
                });
            })
            .then(function (result) {
                contextTo = result;
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.deleteProject({projectId: projectIdFrom})
            .then(function () {
                return Q.allSettled([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .nodeify(done);
    });

    it('should export the meta library, then import it into an empty project', function (done) {
        var libraryJson;
        Q.nfcall(contextFrom.core.loadByPath, contextFrom.rootNode, '/175547009')
            .then(function (libraryRoot) {
                return Q.nfcall(Serialization.export, contextFrom.core, libraryRoot);
            })
            .then(function (resultJson) {
                expect(resultJson).not.to.equal(null);
                expect(resultJson).to.include.keys('relids', 'bases', 'containment', 'nodes', 'metaSheets');

                libraryJson = resultJson;

                //before checks
                expect(contextTo.core.getChildrenRelids(contextTo.rootNode)).to.have.length(1);
                expect(contextTo.core.getMemberPaths(contextTo.rootNode,'MetaAspectSet')).to.have.length(1);

                return Q.nfcall(contextTo.core.loadByPath, contextTo.rootNode, '/1');
            })
            .then(function (targetFCO) {
                var targetLibraryContainer = contextTo.core.createNode({base: targetFCO, parent: contextTo.rootNode});

                return Q.nfcall(Serialization.import, contextTo.core, targetLibraryContainer, libraryJson);
            })
            .then(function () {
                //after checks
                //TODO check if really all member of the sheets have been inserted
                expect(contextTo.core.getChildrenRelids(contextTo.rootNode)).to.have.length(2);
                expect(contextTo.core.getMemberPaths(contextTo.rootNode,'MetaAspectSet')).to.have.length.above(1);
                done();
            })
            .catch(done);
    });

    //TODO add example when the library update removes some nodes
});

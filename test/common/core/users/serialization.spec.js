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
                return storage.deleteProject({projectId: projectIdTo});
            })
            .then(function () {
                return Q.allDone([
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
                expect(contextTo.core.getMemberPaths(contextTo.rootNode, 'MetaAspectSet')).to.have.length(1);

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
                expect(contextTo.core.getMemberPaths(contextTo.rootNode, 'MetaAspectSet')).to.have.length.above(1);
                expect(contextTo.core.getSetNames(contextTo.rootNode))
                    .to.include.members(Object.keys(libraryJson.metaSheets));
                done();
            })
            .catch(done);
    });

    it('should import a library update where some items are removed', function (done) {
        var testProjectName = 'libraryItemRemovalTest',
            testProjectId = testFixture.projectName2Id(testProjectName),
            jsonLibrary,
            testContext;

        storage.getProjects({})
            .then(function (ids) {
                if (ids[testProjectId]) {
                    return storage.deleteProject({projectId: testProjectId});
                } else {
                    return Q();
                }
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: testProjectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/SignalFlowSystem.json'
                });
            })
            .then(function (testContext_) {
                testContext = testContext_;
                jsonLibrary = JSON.parse(
                    testFixture.fs.readFileSync('./test/common/core/users/serialization/libraryRemove.json', 'utf8'));

                return Q.nfcall(testContext.core.loadByPath, testContext.rootNode, '/-2');
            })
            .then(function (libraryContainerNode) {
                return Q.nfcall(Serialization.import, testContext.core, libraryContainerNode, jsonLibrary);
            })
            .then(function () {
                expect(testContext.core.getMemberPaths(testContext.rootNode, 'MetaAspectSet'))
                    .not.to.include('/-2/-16');
                expect(testContext.core.getMemberPaths(testContext.rootNode, 'MetaAspectSet'))
                    .not.to.include('/-2/-17');
            })
            .then(function () {
                return storage.deleteProject({projectId: testProjectId});
            })
            .nodeify(done);
    });

    it('should update library where some item removed only from the META sheets', function (done) {
        var testProjectName = 'sheetItemRemovalTest',
            testProjectId = testFixture.projectName2Id(testProjectName),
            jsonLibrary,
            testContext;

        storage.getProjects({})
            .then(function (ids) {
                if (ids[testProjectId]) {
                    return storage.deleteProject({projectId: testProjectId});
                } else {
                    return Q();
                }
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: testProjectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/SignalFlowSystem.json'
                });
            })
            .then(function (testContext_) {
                testContext = testContext_;
                jsonLibrary = JSON.parse(
                    testFixture.fs.readFileSync('./test/common/core/users/serialization/removeFromSheet.json', 'utf8'));

                return testContext.core.loadByPath(testContext.rootNode, '/-2');
            })
            .then(function (libraryContainerNode) {
                return Q.nfcall(Serialization.import, testContext.core, libraryContainerNode, jsonLibrary);
            })
            .then(function () {
                expect(testContext.core.getMemberPaths(
                    testContext.rootNode, 'MetaAspectSet_2ffaa6f0-de50-9adb-a7f7-50c4251913fe')).to.have.length(0);
            })
            .then(function () {
                return storage.deleteProject({projectId: testProjectId});
            })
            .nodeify(done);
    });

    it('should update library with external nodes', function (done) {
        var testProjectName = 'externalBasesTest',
            testProjectId = testFixture.projectName2Id(testProjectName),
            jsonLibrary,
            testContext;

        storage.getProjects({})
            .then(function (ids) {
                if (ids[testProjectId]) {
                    return storage.deleteProject({projectId: testProjectId});
                } else {
                    return Q();
                }
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: testProjectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/common/core/users/serialization/externalBasesProject.json'
                });
            })
            .then(function (testContext_) {
                testContext = testContext_;
                jsonLibrary = JSON.parse(
                    testFixture.fs.readFileSync('./test/common/core/users/serialization/externalBasesLibrary.json',
                        'utf8'));

                return Q.nfcall(testContext.core.loadByPath, testContext.rootNode, '/1156857239');
            })
            .then(function (libraryContainerNode) {
                return Q.nfcall(Serialization.import, testContext.core, libraryContainerNode, jsonLibrary);
            })
            .then(function () {
                expect(testContext.core.getMemberPaths(testContext.rootNode, 'MetaAspectSet'))
                    .to.include('/1156857239/443867365');
            })
            .then(function () {
                return storage.deleteProject({projectId: testProjectId});
            })
            .nodeify(done);
    });

    it('should export set contents with own flag', function (done) {
        var core = contextFrom.core,
            setNodeGuid = '880bcd49-2d97-6074-c4aa-c54e9b638c86',
            memberGuid = '990bcd49-2d97-6074-c4aa-c54e9b638c86',
            root = core.createNode({}),
            setBase = core.createNode({parent: root}),
            setNode = core.createNode({parent: root, base: setBase, guid: setNodeGuid}),
            member = core.createNode({parent: root, guid: memberGuid});

        core.addMember(setBase, 'set', member);
        core.addMember(setNode, 'set', member);
        Q.nfcall(Serialization.export, core, root)
            .then(function (result) {
                expect(result.nodes[setNodeGuid].sets.set[0].overridden).to.equal(true);
                expect(result.nodes[setNodeGuid].sets.set[0].guid).to.equal(memberGuid);
                done();
            })
            .catch(done);

    });

    it('should import multiple projects parallely using the same core object', function (done) {
        var projects = [
                JSON.parse(testFixture.fs.readFileSync('./seeds/ActivePanels.json')),
                JSON.parse(testFixture.fs.readFileSync('./seeds/EmptyProject.json')),
                JSON.parse(testFixture.fs.readFileSync('./seeds/SignalFlowSystem.json'))
            ],
            roots = [
                contextFrom.core.createNode({}),
                contextFrom.core.createNode({}),
                contextFrom.core.createNode({})
            ],
            promises = [],
            i,
            exportProjects = [];

        for (i = 0; i < projects.length; i += 1) {
            promises.push(Q.nfcall(Serialization.import, contextFrom.core, roots[i], projects[i]));
        }

        Q.allDone(promises)
            .then(function () {
                promises = [];
                for (i = 0; i < projects.length; i += 1) {
                    promises.push(Q.nfcall(Serialization.export, contextFrom.core, roots[i]));
                }
                return Q.allDone(promises);
            })
            .then(function (exports) {
                expect(projects).to.deep.equals(exports);
            })
            .nodeify(done);

    });
});

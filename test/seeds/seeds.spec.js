/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var testFixture = require('../_globals.js');

describe('Seeds', function () {

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        superagent = testFixture.superagent,

        WebGME = testFixture.WebGME,

        logger = testFixture.logger.fork('seeds.spec'),

        seedNames = [
            'ActivePanels',
            'EmptyProject',
            'EmptyWithConstraint',
            'SignalFlowSystem'
        ],
        projects = [],// N.B.: this is getting populated by the createTests function

        gmeAuth,
        safeStorage,

        //guestAccount = testFixture.getGmeConfig().authentication.guestAccount,
        serverBaseUrl,
        server;

    before(function (done) {
        var gmeConfigWithAuth = testFixture.getGmeConfig();
        gmeConfigWithAuth.authentication.enable = true;
        gmeConfigWithAuth.authentication.allowGuests = true;

        server = WebGME.standaloneServer(gmeConfigWithAuth);
        serverBaseUrl = server.getUrl();
        server.start(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            testFixture.clearDBAndGetGMEAuth(gmeConfigWithAuth, projects)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    safeStorage = testFixture.getMemoryStorage(logger, gmeConfigWithAuth, gmeAuth);

                    return Q.allDone([
                        safeStorage.openDatabase()
                    ]);
                })
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allDone([
                gmeAuth.unload(),
                safeStorage.closeDatabase()
            ])
                .nodeify(done);
        });
    });

    // get seed designs 'files' and make sure all of them are getting tested
    it('should get all seed project names', function (done) {
        var agent = superagent.agent();

        agent.get(serverBaseUrl + '/api/seeds', function (err, res) {
            expect(err).to.equal(null);
            expect(res.body).to.deep.equal(seedNames); // ensures that we test all available seeds
            done();
        });
    });

    function createTests() {
        var i,
            projectContents = {};

        function createImportTest(name) {
            var projectName = name + 'Import';

            projects.push(projectName);

            // import seed designs
            it('should import ' + name, function (done) {
                testFixture.importProject(safeStorage, {
                    projectSeed: 'seeds/' + name + '.webgmex',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger,
                    doNotLoad: true
                })
                    .nodeify(done);
            });
        }

        function createExportTest(name) {
            var projectName = name + 'Export',
                seedPath = 'seeds/' + name + '.webgmex';
            projects.push(projectName);

            // export seed designs
            it('should import/export ' + name, function (done) {
                testFixture.importProject(safeStorage, {
                    projectSeed: seedPath,
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger,
                    doNotLoad: true
                })
                    .then(function (ir) {
                        return testFixture.storageUtil.getProjectJson(ir.project, {commitHash: ir.commitHash});
                    })
                    .then(function (projectJson) {
                        return testFixture.compareWebgmexFiles(projectJson, seedPath, logger, gmeConfig);
                    })
                    .nodeify(done);
            });
        }

        function createRoundTripTest(name) {
            var projectName = name + 'RoundTrip',
                seedPath = 'seeds/' + name + '.webgmex',
                ir,
                importedProjectJson;
            projects.push(projectName);

            // import/export/import
            it('should import/export/import ' + name, function (done) {

                testFixture.importProject(safeStorage, {
                    projectSeed: seedPath,
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger,
                    doNotLoad: true
                })
                    .then(function (ir_) {
                        ir = ir_;
                        return testFixture.storageUtil.getProjectJson(ir.project, {commitHash: ir.commitHash});
                    })
                    .then(function (projectJson) {
                        importedProjectJson = projectJson;

                        return testFixture.storageUtil.insertProjectJson(ir.project, projectJson);
                    })
                    .then(function (commitResult) {
                        expect(commitResult.hash).to.not.equal(ir.commitHash);

                        return testFixture.storageUtil.getProjectJson(ir.project, {commitHash: commitResult.hash});
                    })
                    .then(function (projectJson) {
                        return testFixture.compareWebgmexFiles(projectJson, importedProjectJson, logger, gmeConfig);
                    })
                    .nodeify(done);
            });
        }

        for (i = 0; i < seedNames.length; i += 1) {
            createImportTest(seedNames[i]);
            createExportTest(seedNames[i]);
            createRoundTripTest(seedNames[i]);
        }
    }

    createTests();
});

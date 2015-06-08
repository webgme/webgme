/*jshint node:true, mocha:true, expr:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('openContext', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        logger = testFixture.logger,
        Q = testFixture.Q,
        openContext = testFixture.openContext,
        usedProjectNames = ['doesExist', 'willBeOverwritten', 'willBeCreated'],
        storage;

    function importAndCloseProject(importParam, callback) {
        testFixture.importProject(storage, importParam, function (err, result) {
            callback(err, result.commitHash);
        });
    }

    describe('using memory-storage', function () {
        var gmeAuth,
            project,
            commitHash,
            gmeConfig = testFixture.getGmeConfig();

        before(function (done) {
            var importParam = {
                projectSeed: './test/common/util/opencontext/project.json',
                projectName: 'doesExist',
                branchName: 'master',
                gmeConfig: gmeConfig,
                logger: logger.fork('importProject')
            };
            testFixture.clearDBAndGetGMEAuth(gmeConfig, usedProjectNames)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                    return storage.openDatabase();
                })
                .then(function(){
                    return Q.all([
                        storage.deleteProject({projectName:'doesExist'}),
                        storage.deleteProject({projectName:'willBeOverwritten'}),
                        storage.deleteProject({projectName:'willBeCreated'})
                    ]);
                })
                .then(function () {
                    importParam.storage = storage;
                    testFixture.importProject(storage, importParam, function (err, result) {
                        expect(err).to.equal(null);
                        commitHash = result.commitHash;
                        done();
                    });

                })
                .catch(function (err) {
                    done(err);
                });

        });

        beforeEach(function (done) {
            storage.openDatabase(done);
        });

        after(function (done) {
            storage.closeDatabase(done);
        });

        it('should open existing project', function (done) {
            var parameters = {
                projectName: 'doesExist'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);

                expect(result).to.include.keys('project');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing project', function (done) {
            var parameters = {
                projectName: 'doesNotExist'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('"doesNotExist" does not exists among: ');
                project = null;
                done();
            });
        });

        it('should open non-existing project with flag createProject=true', function (done) {
            var parameters = {
                projectName: 'willBeCreated',
                createProject: true
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode', 'branchName');
                project = result.project;
                done();
            });
        });

        it('should return error with createProject=true when project exists', function (done) {
            var parameters = {
                projectName: 'doesExist',
                createProject: true
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('"doesExist" already exists:');
                project = null;
                done();
            });
        });

        it('should open with createProject=true, overwriteProject=true when project exists', function (done) {
            var importParam = {
                    projectSeed: './test/common/util/opencontext/project.json',
                    projectName: 'willBeOverwritten',
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger.fork('importProject')
                },
                parameters = {
                    projectName: 'willBeOverwritten',
                    createProject: true,
                    overwriteProject: true
                };
            importAndCloseProject(importParam, function (err/*, commitHash*/) {
                //expect(err).equal(null);
                openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                    expect(err).equal(null);
                    expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode', 'branchName');
                    project = result.project;
                    done();
                });
            });
        });

        it('should load existing branch', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'branchName');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing branchName', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'b1_lancer'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                project = null;
                done();
            });
        });

        it('should load existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash.substring(0, commitHash.length - 1)
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('No such commitHash "');
                project = null;
                done();
            });
        });

        it('should load existing branch when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: commitHash
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                project = result.project;
                done();
            });
        });

        it('should load existing commitHash when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: 'master'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'branchName');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing branchName when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: 'b1_lancer'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                project = null;
                done();
            });
        });

        it('should return error with non-existing commitHash when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: commitHash.substring(0, commitHash.length - 1)
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('No such commitHash "');
                project = null;
                done();
            });
        });

        it('should load the meta nodes', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'branchName');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                project = result.project;
                done();
            });
        });

        it('should load the meta nodes and nodePaths', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true,
                nodePaths: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes', 'branchName');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                project = result.project;
                done();
            });
        });

        it('should load the nodePaths', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                nodePaths: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'nodes', 'branchName');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                project = result.project;
                done();
            });
        });

        // FIXME: This returns with nodes [!]
        //it('should return error with non-existing nodeIds', function (done) {
        //    var parameters = {
        //        projectName: 'doesExist',
        //        branchName: 'master',
        //        nodeIds: ['/960660211/1365653822/144', '/12']
        //    };
        //    openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
        //        expect(err).equal(null);
        //        project = null;
        //        done();
        //    });
        //});

    });

    describe('using mongo-storage', function () {
        var gmeAuth,
            project,
            commitHash,
            gmeConfig = testFixture.getGmeConfig();

        before(function (done) {
            var importParam = {
                projectSeed: './test/common/util/opencontext/project.json',
                projectName: 'doesExist',
                branchName: 'master',
                gmeConfig: gmeConfig,
                logger: logger.fork('importProject')
            };
            testFixture.clearDBAndGetGMEAuth(gmeConfig, usedProjectNames)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    storage.openDatabase()
                        .then(function () {
                            return storage.deleteProject({projectName: importParam.projectName});
                        })
                        .then(function () {
                            importParam.storage = storage;
                            testFixture.importProject(storage, importParam, function (err, result) {
                                expect(err).to.equal(null);
                                commitHash = result.commitHash;
                                done();
                            });

                        })
                        .catch(function (err) {
                            done(err);
                        });
                }).
                catch(function (err) {
                    done(err);
                });

        });

        beforeEach(function (done) {
            storage.openDatabase(done);
        });

        after(function (done) {
            storage.deleteProject({projectName: 'willBeCreated'})
                .then(function(){
                    return storage.deleteProject({projectName: 'willBeOverwritten'});
                })
                .then(function () {
                    storage.closeDatabase(done);
                })
                .catch(function (err1) {
                    storage.closeDatabase(function (err2) {
                        done(err1 || err2);
                    });
                });
        });

        it('should open existing project', function (done) {
            var parameters = {
                projectName: 'doesExist'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);

                expect(result).to.include.keys('project');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing project', function (done) {
            var parameters = {
                projectName: 'doesNotExist'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('"doesNotExist" does not exists among: ');
                project = null;
                done();
            });
        });

        it('should open non-existing project with flag createProject=true', function (done) {
            var parameters = {
                projectName: 'willBeCreated',
                createProject: true
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode', 'branchName');
                project = result.project;
                done();
            });
        });

        it('should return error with createProject=true when project exists', function (done) {
            var parameters = {
                projectName: 'doesExist',
                createProject: true
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('"doesExist" already exists:');
                project = null;
                done();
            });
        });

        it('should open with createProject=true, overwriteProject=true when project exists', function (done) {
            var importParam = {
                    projectSeed: './test/common/util/opencontext/project.json',
                    projectName: 'willBeOverwritten',
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger.fork('importProject')
                },
                parameters = {
                    projectName: 'willBeOverwritten',
                    createProject: true,
                    overwriteProject: true
                };
            importAndCloseProject(importParam, function (err/*, commitHash*/) {
                //expect(err).equal(null);
                openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                    expect(err).equal(null);
                    expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode', 'branchName');
                    project = result.project;
                    done();
                });
            });
        });

        it('should load existing branch', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'branchName');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing branchName', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'b1_lancer'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                project = null;
                done();
            });
        });

        it('should load existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash.substring(0, commitHash.length - 1)
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('No such commitHash "');
                project = null;
                done();
            });
        });

        it('should load existing branch when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: commitHash
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                project = result.project;
                done();
            });
        });

        it('should load existing commitHash when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: 'master'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'branchName');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing branchName when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: 'b1_lancer'
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                project = null;
                done();
            });
        });

        it('should return error with non-existing commitHash when passed in branchOrCommit', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchOrCommit: commitHash.substring(0, commitHash.length - 1)
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err/*, result*/) {
                expect(err).to.have.string('No such commitHash "');
                project = null;
                done();
            });
        });

        it('should load the meta nodes', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'branchName');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                project = result.project;
                done();
            });
        });

        it('should load the meta nodes and nodePaths', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true,
                nodePaths: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes', 'branchName');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                project = result.project;
                done();
            });
        });

        it('should load the nodePaths', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                nodePaths: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'nodes', 'branchName');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                project = result.project;
                done();
            });
        });

        // FIXME: This returns with nodes [!]
        //it('should return error with non-existing nodeIds', function (done) {
        //    var parameters = {
        //        projectName: 'doesExist',
        //        branchName: 'master',
        //        nodeIds: ['/960660211/1365653822/144', '/12']
        //    };
        //    openContext(storage, gmeConfig, testFixture.logger, parameters, function (err, result) {
        //        expect(err).equal(null);
        //        project = null;
        //        done();
        //    });
        //});

    });
});
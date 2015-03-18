/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('openContext', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        openContext = testFixture.requirejs('common/util/opencontext'),
        Core = testFixture.WebGME.core;

    describe('using local-storage', function () {
        var storage,// Will get local one from importProject.
            project,
            commitHash,
            gmeConfig = testFixture.getGmeConfig();

        before(function (done) {
            var importParam = {
                filePath: './test/asset/sm_basic.json',
                projectName: 'doesExist',
                branchName: 'master',
                gmeConfig: gmeConfig
            };

            testFixture.importProject(importParam, function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                storage = result.storage;
                commitHash = result.commitHash;
                done(err);
            });
        });

        afterEach(function (done) {
            if (project) {
                project.closeProject(function (err) {
                    done(err);
                });
            } else {
                done();
            }
        });

        after(function (done) {
            storage.closeDatabase(function (err) {
                done(err);
            });
        })

        it('should open existing project', function (done) {
            var parameters = {
                projectName: 'doesExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project');
                done();
            });
        });

        it('should return error with non-existing project', function (done) {
            var parameters = {
                projectName: 'doesNotExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.equal('"doesNotExist" does not exists among: doesExist. ' +
                'Set flag "createProject" to create a new project.');
                done();
            });
        });

        it('should open non-existing project with flag createProject=true', function (done) {
            var parameters = {
                projectName: 'doesNotExist',
                createProject: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode');
                done();
            });
        });

        it('should load existing branch', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                done();
            });
        });

        it('should return error with non-existing branchName', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'b1_lancer'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                done();
            });
        });

        it('should load the meta nodes', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                done();
            });
        });

        it('should load the meta nodes and nodeIds', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true,
                nodeIds: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                done();
            });
        });

        it('should load the nodeIds', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                nodeIds: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'nodes');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                done();
            });
        });

        // FIXME: This returns with nodes [!], could it be the local storage?
        //it('should return error with non-existing nodeIds', function (done) {
        //    var parameters = {
        //        projectName: 'doesExist',
        //        branchName: 'master',
        //        nodeIds: ['/960660211/1365653822/144', '/12']
        //    };
        //    openContext(storage, gmeConfig, parameters, function (err, result) {
        //        expect(err).equal(null);
        //        done();
        //    });
        //});
    });

    describe('using client-storage', function () {
        var storage,
            project,
            commitHash,
            server,
            gmeConfig = testFixture.getGmeConfig();

        before(function (done) {
            var importParam = {
                filePath: './test/asset/sm_basic.json',
                projectName: 'doesExist',
                branchName: 'master',
                gmeConfig: gmeConfig,
                storage: null
            };
            gmeConfig.server.port = 9001;
            server = WebGME.standaloneServer(gmeConfig);
            server.start(function (err) {
                storage = new WebGME.clientStorage({
                    globConf: gmeConfig,
                    type: 'node',
                    host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1',
                    webGMESessionId: 'testopencontext'
                });
                importParam.storage = storage;
                testFixture.importProject(importParam, function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }
                    commitHash = result.commitHash;
                    result.project.closeProject(function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.closeDatabase(function (err) {
                            done(err);
                        });
                    });
                });
            });
        });

        afterEach(function (done) {
            if (project) {
                project.closeProject(function (err) {
                    storage.closeDatabase(function (err) {
                        done(err);
                    });
                });
            } else {
                done();
            }
        });

        after(function (done) {
            storage.openDatabase(function (err) {
                storage.deleteProject('willBeCreated', function (err) {
                    storage.closeDatabase(function (err) {
                        server.stop(function () {
                            done();
                        });
                    });
                });
            });

        });

        it('should open existing project', function (done) {
            var parameters = {
                projectName: 'doesExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing project', function (done) {
            var parameters = {
                projectName: 'doesNotExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode');
                project = result.project;
                done();
            });
        });

        it('should load existing branch', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing branchName', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'b1_lancer'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                project = null
                done();
            });
        });

        it('should load the meta nodes', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                project = result.project;
                done();
            });
        });

        it('should load the meta nodes and nodeIds', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true,
                nodeIds: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                project = result.project;
                done();
            });
        });

        it('should load the nodeIds', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                nodeIds: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'nodes');
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
        //    openContext(storage, gmeConfig, parameters, function (err, result) {
        //        expect(err).equal(null);
        //        project = null;
        //        done();
        //    });
        //});


    });

    describe('using server-user-storage', function () {
        var storage,
            project,
            commitHash,
            gmeConfig = testFixture.getGmeConfig();

        before(function (done) {
            var importParam = {
                filePath: './test/asset/sm_basic.json',
                projectName: 'doesExist',
                branchName: 'master',
                gmeConfig: gmeConfig,
                storage: null
            };
            storage = new WebGME.serverUserStorage({
                globConf: gmeConfig,
                log: testFixture.Log.create('openContext')
            });
            importParam.storage = storage;
            testFixture.importProject(importParam, function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                commitHash = result.commitHash;
                result.project.closeProject(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.closeDatabase(function (err) {
                        done(err);
                    });
                });
            });
        });

        afterEach(function (done) {
            if (project) {
                project.closeProject(function (err) {
                    storage.closeDatabase(function (err) {
                        done(err);
                    });
                });
            } else {
                done();
            }
        });

        after(function (done) {
            storage.openDatabase(function (err) {
                storage.deleteProject('willBeCreated', function (err) {
                    storage.closeDatabase(function (err) {
                        done();
                    });
                });
            });

        });

        it('should open existing project', function (done) {
            var parameters = {
                projectName: 'doesExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing project', function (done) {
            var parameters = {
                projectName: 'doesNotExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode');
                project = result.project;
                done();
            });
        });

        it('should load existing branch', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                project = result.project;
                done();
            });
        });

        it('should return error with non-existing branchName', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'b1_lancer'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                project = null
                done();
            });
        });

        it('should load the meta nodes', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                project = result.project;
                done();
            });
        });

        it('should load the meta nodes and nodeIds', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                meta: true,
                nodeIds: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes');
                expect(result.META).to.have.keys('FCO', 'language', 'state', 'transition');
                expect(result.nodes).to.have.keys('/960660211/1365653822', '/1');
                project = result.project;
                done();
            });
        });

        it('should load the nodeIds', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master',
                nodeIds: ['/960660211/1365653822', '/1']
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'nodes');
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
        //    openContext(storage, gmeConfig, parameters, function (err, result) {
        //        expect(err).equal(null);
        //        project = null;
        //        done();
        //    });
        //});

    });
});
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

    function importAndCloseProject(importParam, callback) {
        testFixture.importProject(importParam, function (err, result) {
            if (err) {
                callback(err);
                return;
            }
            result.project.closeProject(function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                importParam.storage.closeDatabase(function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, result.commitHash);
                });
            });
        });
    }

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
            storage = new testFixture.Storage({globConf: gmeConfig});
            importParam.storage = storage;
            importAndCloseProject(importParam, function (err, _commitHash) {
                expect(err).equal(null);
                commitHash = _commitHash;
                done(err);
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

        it('should return error with createProject=true when project exists', function (done) {
            var parameters = {
                projectName: 'doesExist',
                createProject: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.have.string('"doesExist" already exists:');
                project = null;
                done();
            });
        });

        it('should open with createProject=true, overwriteProject=true when project exists', function (done) {
            var importParam = {
                    filePath: './test/asset/sm_basic.json',
                    projectName: 'willBeOverwritten',
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    storage: storage
                },
                parameters = {
                    projectName: 'willBeOverwritten',
                    createProject: true,
                    overwriteProject: true
                };
            importAndCloseProject(importParam, function (err, commitHash) {
                expect(err).equal(null);
                openContext(storage, gmeConfig, parameters, function (err, result) {
                    expect(err).equal(null);
                    expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode');
                    project = result.project;
                    done();
                });
            })
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

        it('should load existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META');
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes');
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
            server = WebGME.standaloneServer(gmeConfig);
            server.start(function (err) {
                storage = new WebGME.clientStorage({
                    globConf: gmeConfig,
                    type: 'node',
                    host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1',
                    webGMESessionId: 'testopencontext'
                });
                importParam.storage = storage;
                importAndCloseProject(importParam, function (err, _commitHash) {
                    expect(err).equal(null);
                    commitHash = _commitHash;
                    done(err);
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

        it('should return error with createProject=true when project exists', function (done) {
            var parameters = {
                projectName: 'doesExist',
                createProject: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.have.string('"doesExist" already exists:');
                project = null;
                done();
            });
        });

        it('should open with createProject=true, overwriteProject=true when project exists', function (done) {
            var importParam = {
                    filePath: './test/asset/sm_basic.json',
                    projectName: 'willBeOverwritten',
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    storage: storage
                },
                parameters = {
                    projectName: 'willBeOverwritten',
                    createProject: true,
                    overwriteProject: true
                };
            importAndCloseProject(importParam, function (err, commitHash) {
                expect(err).equal(null);
                openContext(storage, gmeConfig, parameters, function (err, result) {
                    expect(err).equal(null);
                    expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode');
                    project = result.project;
                    done();
                });
            })
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

        it('should load existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META');
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes');
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
            importAndCloseProject(importParam, function (err, _commitHash) {
                commitHash = _commitHash;
                done(err);
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

        it('should return error with createProject=true when project exists', function (done) {
            var parameters = {
                projectName: 'doesExist',
                createProject: true
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.have.string('"doesExist" already exists:');
                project = null;
                done();
            });
        });

        it('should open with createProject=true, overwriteProject=true when project exists', function (done) {
            var importParam = {
                    filePath: './test/asset/sm_basic.json',
                    projectName: 'willBeOverwritten',
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    storage: storage
                },
                parameters = {
                    projectName: 'willBeOverwritten',
                    createProject: true,
                    overwriteProject: true
            };
            importAndCloseProject(importParam, function (err, commitHash) {
                expect(err).equal(null);
                openContext(storage, gmeConfig, parameters, function (err, result) {
                    expect(err).equal(null);
                    expect(result).to.have.keys('commitHash', 'core', 'project', 'rootNode');
                    project = result.project;
                    done();
                });
            })
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

        it('should load existing commitHash', function (done) {
            var parameters = {
                projectName: 'doesExist',
                commitHash: commitHash
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META');
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
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core', 'META', 'nodes');
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
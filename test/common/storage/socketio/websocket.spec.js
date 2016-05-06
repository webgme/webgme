/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../../_globals.js');

describe('storage socketio websocket', function () {
    'use strict';
    var NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        superagent = testFixture.superagent,
        openSocketIo = testFixture.openSocketIo,
        expect = testFixture.expect,
        Q = testFixture.Q,
        projectName2Id = testFixture.projectName2Id,

        logger = testFixture.logger.fork('nodestorage'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        socket,
        gmeAuth,
        storage,
        agent,
        webSocket,
        safeStorage,

        projectName = 'WebSocketProject',
        projectNameCreate = 'WebSocketCreateProject',
        projectNameDelete = 'WebSocketDeleteProject',
        importResult,
        originalHash,
        commitHash1,
        commitHash2;

    before(function (done) {
        var commitObject,
            commitData;

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName, projectNameCreate, projectNameDelete])
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function (results) {
                    importResult = results[0]; // projectName
                    originalHash = importResult.commitHash;

                    commitObject = importResult.project.createCommitObject([originalHash],
                        importResult.rootHash,
                        'tester1',
                        'commit msg 1');
                    commitData = {
                        projectId: projectName2Id(projectName),
                        commitObject: commitObject,
                        coreObjects: []
                    };

                    return safeStorage.makeCommit(commitData);
                })
                .then(function (result) {
                    commitHash1 = result.hash;

                    commitObject = importResult.project.createCommitObject([originalHash],
                        importResult.rootHash,
                        'tester2',
                        'commit msg 2');
                    commitData = {
                        projectId: projectName2Id(projectName),
                        commitObject: commitObject,
                        coreObjects: []
                    };

                    return safeStorage.makeCommit(commitData);
                })
                .then(function (result) {
                    commitHash2 = result.hash;
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


    beforeEach(function (done) {
        var connected = false;
        agent = superagent.agent();
        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                socket = result.socket;
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);
                storage.open(function (networkState) {
                    if (connected) {
                        return;
                    }
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        webSocket = storage.webSocket;
                        connected = true;
                        done();
                    } else {
                        throw new Error('Unexpected network state: ' + networkState);
                    }
                });
            })
            .catch(done);
    });

    afterEach(function (done) {
        storage.close(function (err) {
            socket.disconnect();
            done(err);
        });
    });

    it('should getProjects', function (done) {
        var data = {};

        Q.nfcall(webSocket.getProjects, data)
            .then(function (projects) {
                expect(projects.length).to.equal(1);
                expect(projects[0].name).to.equal(projectName);
            })
            .nodeify(done);
    });

    it('should openProject', function (done) {
        var data = {
            projectId: projectName2Id(projectName)
        };

        Q.nfcall(webSocket.openProject, data)
            .then(function (project) {
                expect(project.length).to.equal(2);
                expect(project[0]).to.have.property('master');
                expect(project[1]).to.deep.equal({read: true, write: true, delete: true});
            })
            .nodeify(done);
    });

    it('should openProject then closeProject', function (done) {
        var data = {
            projectId: projectName2Id(projectName)
        };

        Q.nfcall(webSocket.openProject, data)
            .then(function (project) {
                expect(project.length).to.equal(2);
                expect(project[0]).to.have.property('master');
                expect(project[1]).to.deep.equal({read: true, write: true, delete: true});
                return Q.nfcall(webSocket.closeProject, data);
            })
            .nodeify(done);
    });

    it('should openBranch', function (done) {
        var data = {
            projectId: projectName2Id(projectName),
            branchName: 'master'
        };

        Q.nfcall(webSocket.openBranch, data)
            .then(function (branch) {
                expect(branch.branchName).to.equal('master');
            })
            .nodeify(done);
    });

    it('should openBranch then closeBranch', function (done) {
        var data = {
            projectId: projectName2Id(projectName),
            branchName: 'master'
        };

        Q.nfcall(webSocket.openBranch, data)
            .then(function (branch) {
                expect(branch.branchName).to.equal('master');
                return Q.nfcall(webSocket.closeBranch, data);
            })
            .nodeify(done);
    });

    it('should getBranches', function (done) {
        var data = {
            projectId: projectName2Id(projectName)
        };

        Q.nfcall(webSocket.getBranches, data)
            .then(function (branches) {
                expect(branches).to.have.property('master');
            })
            .nodeify(done);
    });

    it('should getCommits', function (done) {
        var data = {
            projectId: projectName2Id(projectName),
            before: (new Date()).getTime(),
            number: 100
        };

        Q.nfcall(webSocket.getCommits, data)
            .then(function (commits) {
                expect(commits.length).to.equal(3);
                // TODO: add any other checks that we may need.
            })
            .nodeify(done);
    });


    it('should getLatestCommitData', function (done) {
        var data = {
            projectId: projectName2Id(projectName),
            branchName: 'master'
        };

        Q.nfcall(webSocket.getLatestCommitData, data)
            .then(function (commit) {
                expect(commit).to.have.property('branchName');
                expect(commit.branchName).to.equal('master');
                expect(commit).to.have.property('commitObject');
                expect(commit).to.have.property('coreObjects');
                expect(commit).to.have.property('projectId');
            })
            .nodeify(done);
    });

    it('should getCommonAncestorCommit', function (done) {
        var data = {
            projectId: projectName2Id(projectName),
            commitA: commitHash1,
            commitB: commitHash2
        };

        Q.nfcall(webSocket.getCommonAncestorCommit, data)
            .then(function (commit) {
                expect(commit).to.equal(originalHash);
            })
            .nodeify(done);
    });

    it('should createProject', function (done) {
        var data = {
            projectName: projectNameCreate
        };

        Q.nfcall(webSocket.createProject, data)
            .then(function (result) {
                expect(result).to.equal(projectName2Id(projectNameCreate));
            })
            .nodeify(done);
    });

    // Database and project events
    // These depened on gmeConfig.storage.broadcastProjectEvents is set to false
    // since it is the same client that makes the changes.

    it('should createProject and deleteProject', function (done) {
        var data = {
                projectName: projectNameDelete
            },
            deleteData = {
                projectId: projectName2Id(projectNameDelete)
            };

        Q.nfcall(webSocket.createProject, data)
            .then(function (result) {
                expect(result).to.equal(projectName2Id(projectNameDelete));
                return Q.nfcall(webSocket.deleteProject, deleteData);
            })
            .then(function (result) {
                expect(result).to.equal(true);
            })
            .nodeify(done);
    });

    it('should trigger PROJECT_CREATED when watching database', function (done) {
        var data = {
                projectName: projectNameDelete
            },
            deleteData = {
                projectId: projectName2Id(projectNameDelete)
            };

        webSocket.addEventListener(STORAGE_CONSTANTS.PROJECT_CREATED, function (ws, eData) {
            expect(eData).to.include.keys('etype', 'projectId');
            expect(eData.etype).to.equal(STORAGE_CONSTANTS.PROJECT_CREATED);
            expect(eData.projectId).to.equal(deleteData.projectId);

            webSocket.removeEventListener(STORAGE_CONSTANTS.PROJECT_CREATED, this);
            Q.nfcall(webSocket.watchDatabase, {join: false})
                .then(function () {
                    return Q.nfcall(webSocket.deleteProject, deleteData);
                })
                .nodeify(done);
        });

        Q.nfcall(webSocket.watchDatabase, {join: true})
            .then(function () {
                return Q.nfcall(webSocket.createProject, data);
            })
            .then(function (result) {
                expect(result).to.equal(deleteData.projectId);
            })
            .catch(function (err) {
                done(new Error(err));
            });
    });

    it('should trigger PROJECT_DELETED when watching database', function (done) {
        var data = {
                projectName: projectNameDelete
            },
            deleteData = {
                projectId: projectName2Id(projectNameDelete)
            };

        webSocket.addEventListener(STORAGE_CONSTANTS.PROJECT_DELETED, function (ws, eData) {
            expect(eData).to.include.keys('etype', 'projectId');
            expect(eData.etype).to.equal(STORAGE_CONSTANTS.PROJECT_DELETED);
            expect(eData.projectId).to.equal(deleteData.projectId);

            webSocket.removeEventListener(STORAGE_CONSTANTS.PROJECT_DELETED, this);
            Q.nfcall(webSocket.watchDatabase, {join: false}, done);
        });

        Q.nfcall(webSocket.watchDatabase, {join: true})
            .then(function () {
                return Q.nfcall(webSocket.createProject, data);
            })
            .then(function (result) {
                expect(result).to.equal(deleteData.projectId);
                return Q.nfcall(webSocket.deleteProject, deleteData);
            })
            .catch(function (err) {
                done(new Error(err));
            });
    });

    it('should trigger BRANCH_CREATED when watching project', function (done) {
        var branchName = 'branchCreateBranch',
            createData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: '',
                newHash: originalHash
            },
            deleteData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: originalHash,
                newHash: ''
            },
            eventName = STORAGE_CONSTANTS.BRANCH_CREATED + createData.projectId;

        webSocket.addEventListener(eventName, function (ws, eData) {
            expect(eData).to.include.keys('etype', 'projectId', 'branchName', 'oldHash', 'newHash');
            expect(eData.etype).to.equal(STORAGE_CONSTANTS.BRANCH_CREATED);
            expect(eData.projectId).to.equal(createData.projectId);
            expect(eData.branchName).to.equal(branchName);
            expect(eData.newHash).to.equal(originalHash);

            webSocket.removeEventListener(eventName, this);
            Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: false})
                .then(function () {
                    return Q.nfcall(webSocket.setBranchHash, deleteData);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                })
                .nodeify(done);
        });

        Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: true})
            .then(function () {
                return Q.nfcall(webSocket.setBranchHash, createData);
            })
            .catch(function (err) {
                done(new Error(err));
            });
    });

    it('should trigger BRANCH_DELETED when watching project', function (done) {
        var branchName = 'branchDeletedBranch',
            createData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: '',
                newHash: originalHash
            },
            deleteData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: originalHash,
                newHash: ''
            },
            eventName = STORAGE_CONSTANTS.BRANCH_DELETED + createData.projectId;

        webSocket.addEventListener(eventName, function (ws, eData) {
            expect(eData).to.include.keys('etype', 'projectId', 'branchName', 'oldHash', 'newHash');
            expect(eData.etype).to.equal(STORAGE_CONSTANTS.BRANCH_DELETED);
            expect(eData.projectId).to.equal(createData.projectId);
            expect(eData.branchName).to.equal(branchName);
            expect(eData.oldHash).to.equal(originalHash);

            webSocket.removeEventListener(eventName, this);
            Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: false})
                .nodeify(done);
        });

        Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: true})
            .then(function () {
                return Q.nfcall(webSocket.setBranchHash, createData);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return Q.nfcall(webSocket.setBranchHash, deleteData);
            })
            .catch(function (err) {
                done(new Error(err));
            });
    });

    it('should trigger BRANCH_HASH_UPDATED when watching project', function (done) {
        var branchName = 'branchHashUpdateBranch',
            createData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: '',
                newHash: originalHash
            },
            updateHashData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: originalHash,
                newHash: commitHash1
            },
            deleteData = {
                projectId: projectName2Id(projectName),
                branchName: branchName,
                oldHash: commitHash1,
                newHash: ''
            },
            eventName = STORAGE_CONSTANTS.BRANCH_HASH_UPDATED + createData.projectId;

        webSocket.addEventListener(eventName, function (ws, eData) {
            expect(eData).to.include.keys('etype', 'projectId', 'branchName', 'oldHash', 'newHash');
            expect(eData.etype).to.equal(STORAGE_CONSTANTS.BRANCH_HASH_UPDATED);
            expect(eData.projectId).to.equal(createData.projectId);
            expect(eData.branchName).to.equal(branchName);
            expect(eData.oldHash).to.equal(originalHash);
            expect(eData.newHash).to.equal(commitHash1);

            webSocket.removeEventListener(eventName, this);
            Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: false})
                .then(function () {
                    return Q.nfcall(webSocket.setBranchHash, deleteData);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                })
                .nodeify(done);
        });

        Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: true})
            .then(function () {
                return Q.nfcall(webSocket.setBranchHash, createData);
            })
            .then(function () {
                return Q.nfcall(webSocket.setBranchHash, updateHashData);
            })
            .catch(function (err) {
                done(new Error(err));
            });
    });

    // Branch events
    // These tests use an additional client that makes the changes.
    it.skip('should trigger BRANCH_UPDATED when watching branch', function (done) {
        var branchName = 'branchUpdateBranch',
            projectId = projectName2Id(projectName),
        // Variables for 2nd connected client.
            connected2 = false,
            agent2 = superagent.agent(),
            storage2,
            webSocket2;

        function whenConnected() {
            var eventName = webSocket.getBranchUpdateEventName(projectId, branchName);

            webSocket.addEventListener(eventName, function (ws, eData) {
                expect(eData).to.include.keys('etype', 'projectId', 'branchName', 'oldHash', 'newHash');
                expect(eData.etype).to.equal(STORAGE_CONSTANTS.BRANCH_HASH_UPDATED);
                expect(eData.projectId).to.equal(createData.projectId);
                expect(eData.branchName).to.equal(branchName);
                expect(eData.oldHash).to.equal(originalHash);
                expect(eData.newHash).to.equal(commitHash1);

                webSocket.removeEventListener(eventName, this);
                Q.nfcall(webSocket.watchProject, {projectId: createData.projectId, join: false})
                    .then(function () {
                        return Q.nfcall(webSocket.setBranchHash, deleteData);
                    })
                    .then(function (result) {
                        expect(result.status).to.equal('SYNCED');
                    })
                    .nodeify(done);
            });
        }

        openSocketIo(server, agent2, guestAccount, guestAccount)
            .then(function (result) {
                storage2 = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);
                storage2.open(function (networkState) {
                    if (connected2) {
                        return;
                    }
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        webSocket2 = storage.webSocket;
                        connected2 = true;
                        whenConnected();
                    } else {
                        throw new Error('Unexpected network state: ' + networkState);
                    }
                });
            })
            .catch(done);
    });

    // TODO: EVENTS
    // TODO: BRANCH_UPDATED
    // TODO: watchBranch

    it('should getBranchUpdateEventName', function () {
        var eventName;

        eventName = webSocket.getBranchUpdateEventName(projectName2Id(projectName), 'master');
        expect(typeof eventName).to.equal('string');
        expect(eventName.indexOf('master')).to.gte(0);
        expect(eventName.indexOf(projectName2Id(projectName))).to.gte(0);
    });


    // TODO: makeCommit
    // TODO: loadObjects

    it('should fail to execute simpleQuery without addOn configured', function (done) {
        Q.nfcall(webSocket.simpleQuery, 'someWorkerId', {})
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.include('wrong request');
                done();
            })
            .done();
    });


    it('should disconnect', function (done) {
        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);
                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        webSocket = storage.webSocket;
                        webSocket.disconnect();
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        done();
                    } else {
                        throw new Error('Unexpected network state: ' + networkState);
                    }
                });
            })
            .catch(done);
    });

    it('should connect and reconnect', function (done) {
        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);
                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        webSocket = storage.webSocket;
                        webSocket.connect(function (err, networkStateNew) {
                            if (networkStateNew === STORAGE_CONSTANTS.RECONNECTED) {
                                done();
                            } else {
                                throw new Error('Unexpected network state: ' + networkStateNew + ' error: ' + err);
                            }
                        });
                    } else {
                        // ok
                    }
                });
            })
            .catch(done);

    });

    it.skip('should not connect to invalid port', function (done) {
        var gmeConfigMod = testFixture.getGmeConfig();

        gmeConfigMod.port = 5555;

        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfigMod);
                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.ERROR) {
                        done();
                    } else {
                        throw new Error('Unexpected network state: ' + networkState);
                    }
                });
            })
            .catch(done);
    });
});
/*globals requireJS*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('WebSocket', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('WebSocket.spec'),
        Q = testFixture.Q,
        WebGME = testFixture.WebGME,
        CONSTANTS = requireJS('common/storage/constants'),

        superagent = testFixture.superagent,

        gmeAuth,
        projectName = 'WebSocketTestProject',
        projectNameUnauthorized = 'WebSocketTestUnauthorizedProject',

        projects = [
            projectName,
            projectNameUnauthorized,
            'WebSocketTest_NewProject',
            'WebSocketTest_ProjectToBeDeleted',
            'WebSocketTest_PROJECT_CREATED',
            'WebSocketTest_PROJECT_DELETED',
            'WebSocketTest_BRANCH_CREATED',
            'WebSocketTest_BRANCH_DELETED',
            'WebSocketTest_BRANCH_HASH_UPDATED',
            'WebSocketTest_BRANCH_UPDATED'
        ],

        guestAccount = gmeConfig.authentication.guestAccount,
        projectName2Id = testFixture.projectName2Id,
        safeStorage,

        server,
        serverBaseUrl,
        agent,

        logIn = function (callback) {
            agent.post(serverBaseUrl + '/login?redirect=%2F')
                .type('form')
                .send({username: guestAccount})
                .send({password: guestAccount})
                .end(function (err, res) {
                    if (err) {
                        return callback(err);
                    }
                    expect(res.status).to.equal(200);
                    callback(err, res);
                });
        },
        openSocketIo = function (sessionId) {
            var io = require('socket.io-client');
            return Q.nfcall(logIn)
                .then(function (/*res*/) {
                    var socket,
                        socketReq = {url: serverBaseUrl},
                        defer = Q.defer(),
                        query;

                    agent.attachCookies(socketReq);

                    if (sessionId) {
                        query = 'webGMESessionId=' + sessionId;
                    } else {
                        query = 'webGMESessionId=' + /webgmeSid=s:([^;]+)\./.exec(
                            decodeURIComponent(socketReq.cookies))[1];
                    }

                    socket = io.connect(serverBaseUrl,
                        {
                            query: query,
                            transports: gmeConfig.socketIO.transports,
                            multiplex: false
                        });

                    socket.on('error', function (err) {
                        logger.error(err);
                        defer.reject(err || 'could not connect');
                        socket.disconnect();
                    });
                    socket.on('connect', function () {
                        defer.resolve(socket);
                    });

                    return defer.promise;
                });
        };

    describe('with valid sessionId as a guest user, auth turned on', function () {
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
                        safeStorage = testFixture.getMongoStorage(logger, gmeConfigWithAuth, gmeAuth);

                        return Q.all([
                            safeStorage.openDatabase(),
                            gmeAuth.authorizeByUserId(guestAccount, 'project_does_not_exist', 'create',
                                {
                                    read: true,
                                    write: true,
                                    delete: true
                                })
                        ]);
                    })
                    //.then(function () {
                    //    var promises = [],
                    //        i;
                    //
                    //    for (i = 0; i < projects.length; i += 1) {
                    //        promises.push(safeStorage.deleteProject({projectId: projects[i]}));
                    //    }
                    //
                    //    return Q.all(promises);
                    //})
                    //.then(function () {
                    //    return Q.all([
                    //        testFixture.importProject(safeStorage, {
                    //            projectSeed: 'seeds/EmptyProject.json',
                    //            projectName: projectName,
                    //            gmeConfig: gmeConfigWithAuth,
                    //            logger: logger
                    //        }),
                    //        testFixture.importProject(safeStorage, {
                    //            projectSeed: 'seeds/EmptyProject.json',
                    //            projectName: projectNameUnauthorized,
                    //            gmeConfig: gmeConfigWithAuth,
                    //            logger: logger
                    //        })
                    //    ]);
                    //})
                    .then(function () {
                        return Q.all([
                            gmeAuth.authorizeByUserId(guestAccount, projectNameUnauthorized, 'create',
                                {
                                    read: false,
                                    write: false,
                                    delete: false
                                })
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

                Q.all([
                    gmeAuth.unload(),
                    safeStorage.closeDatabase()
                ])
                    .nodeify(done);
            });
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        it('should getUserId', function (done) {
            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'getUserId');
                })
                .then(function (result) {
                    expect(result).to.equal(guestAccount);
                })
                .nodeify(done);
        });

        it('should fail to getUserId with invalid session id', function (done) {
            openSocketIo('invalid_session_id')
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'getUserId');
                })
                .then(function () {
                    throw new Error('should have failed to getUserId');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('User was not found') > -1) {
                        return;
                    }
                    throw new Error('should have failed to getUserId: ' + err);
                })
                .nodeify(done);
        });
    });

    describe('with valid sessionId as a guest user', function () {
        before(function (done) {
            server = WebGME.standaloneServer(gmeConfig);
            serverBaseUrl = server.getUrl();
            server.start(function (err) {
                if (err) {
                    done(new Error(err));
                    return;
                }

                testFixture.clearDBAndGetGMEAuth(gmeConfig, projects)
                    .then(function (gmeAuth_) {
                        gmeAuth = gmeAuth_;
                        safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

                        return Q.all([
                            safeStorage.openDatabase(),
                            gmeAuth.authorizeByUserId(guestAccount, 'project_does_not_exist', 'create',
                                {
                                    read: true,
                                    write: true,
                                    delete: true
                                })
                        ]);
                    })
                    //.then(function () {
                    //    var promises = [],
                    //        i;
                    //
                    //    for (i = 0; i < projects.length; i += 1) {
                    //        promises.push(safeStorage.deleteProject({projectId: projects[i]}));
                    //    }
                    //
                    //    return Q.all(promises);
                    //})
                    .then(function () {
                        return Q.all([
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.json',
                                projectName: projectName,
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.json',
                                projectName: projectNameUnauthorized,
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.json',
                                projectName: 'WebSocketTest_BRANCH_CREATED',
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.json',
                                projectName: 'WebSocketTest_BRANCH_DELETED',
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.json',
                                projectName: 'WebSocketTest_BRANCH_HASH_UPDATED',
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.json',
                                projectName: 'WebSocketTest_BRANCH_UPDATED',
                                gmeConfig: gmeConfig,
                                logger: logger
                            })
                        ]);
                    })
                    .then(function () {
                        return Q.all([
                            gmeAuth.authorizeByUserId(guestAccount, projectName2Id(projectNameUnauthorized), 'create',
                                {
                                    read: false,
                                    write: false,
                                    delete: false
                                })
                        ]);
                    })
                    .nodeify(done);
            });
        });

        after(function (done) {

            gmeAuth.authorizeByUserId(guestAccount, projectName2Id(projectNameUnauthorized), 'create',
                {
                    read: true,
                    write: true,
                    delete: true
                })
            .then(function () {
                    var promises = [],
                        i;
                    for (i = 0; i < projects.length; i += 1) {
                        promises.push(safeStorage.deleteProject({projectId: projectName2Id(projects[i])}));
                    }

                    return Q.all(promises);
                })
            .finally(function () {
                    server.stop(function (err) {
                        if (err) {
                            done(new Error(err));
                            return;
                        }

                        Q.all([
                            gmeAuth.unload(),
                            safeStorage.closeDatabase()
                        ])
                            .nodeify(done);
                    });
                });
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        it('should getUserId', function (done) {
            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'getUserId');
                })
                .then(function (result) {
                    expect(result).to.equal(guestAccount);
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should fail to getUserId with invalid session id', function (done) {
            openSocketIo('invalid_session_id')
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'getUserId');
                })
                .then(function () {
                    throw new Error('should have failed to getUserId');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('User was not found') > -1) {
                        return;
                    }
                    throw new Error('should have failed to getUserId: ' + err);
                })
                .nodeify(done);
        });

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Project related tests

        it('should getProjects', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {};

                    return Q.ninvoke(socket, 'emit', 'getProjects', data);
                })
                .then(function (result) {
                    expect(result.length).to.greaterThan(1);
                    // TODO: add more specific check for the actual project existence
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });


        it('should getProjects and branches', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        branches: true
                    };

                    return Q.ninvoke(socket, 'emit', 'getProjects', data);
                })
                .then(function (result) {
                    expect(result.length).to.equal(5);
                    expect(result[0].branches).to.have.property('master');
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should createProject', function (done) {
            var data = {
                projectName: 'WebSocketTest_NewProject'
            };

            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'createProject', data);
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should create and delete a project', function (done) {
            var socket,
                data = {
                    projectName: 'WebSocketTest_ProjectToBeDeleted'
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'createProject', data);
                })
                .then(function (projectId) {
                    expect(projectId).to.equal(projectName2Id('WebSocketTest_ProjectToBeDeleted'));
                    // assuming the project was successfully created
                    return Q.ninvoke(socket, 'emit', 'deleteProject', {projectId: projectId});
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should open an existing project and return with auth info for project', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectName)
                    };

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function (callbackArgs) {
                    expect(callbackArgs[0]).to.have.property('master'); // branches
                    expect(callbackArgs[1]).to.include.keys('read', 'write', 'delete'); // access
                    expect(callbackArgs[1].read).to.equal(true);
                    expect(callbackArgs[1].write).to.equal(true);
                    expect(callbackArgs[1].delete).to.equal(true);
                })
                .nodeify(done);
        });

        it('should open and close an existing project', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id(projectName)
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function (callbackArgs) {
                    expect(callbackArgs[0]).to.have.property('master'); // branches
                    expect(callbackArgs[1]).to.include.keys('read', 'write', 'delete'); // access
                    return Q.ninvoke(socket, 'emit', 'closeProject', data);
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should fail to open an existing project if data is not an object', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = projectName;

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function () {
                    throw new Error('should have failed to openProject');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('Invalid argument') > -1) {
                        return;
                    }
                    throw new Error('should have failed to openProject: ' + err);
                })
                .nodeify(done);
        });

        it('should fail to open a non-existent project', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: 'project_does_not_exist'
                    };

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function () {
                    throw new Error('should have failed to openProject');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('Project does not exist') > -1) {
                        return;
                    }
                    throw new Error('should have failed to openProject: ' + err);
                })
                .nodeify(done);
        });

        it('should fail to open a project, when there is no read access', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectNameUnauthorized)
                    };

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function () {
                    throw new Error('should have failed to openProject');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('Not authorized') > -1) {
                        return;
                    }
                    throw new Error('should have failed to openProject: ' + err);
                })
                .nodeify(done);
        });


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Branch related tests

        it('should open an existing branch', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectName),
                        branchName: 'master'
                    };

                    return Q.ninvoke(socket, 'emit', 'openBranch', data);
                })
                .then(function (result) {
                    expect(result.branchName).to.equal('master');
                    expect(result.projectId).to.equal(projectName2Id(projectName));
                })
                .nodeify(done);
        });

        it('should fail to open a non-existing branch', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectName),
                        branchName: 'branch_does_not_exist'
                    };

                    return Q.ninvoke(socket, 'emit', 'openBranch', data);
                })
                .then(function () {
                    throw new Error('should have failed to openBranch');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('does not exist') > -1) {
                        return;
                    }
                    throw new Error('should have failed to openBranch: ' + err);
                })
                .nodeify(done);
        });

        it('should open and close branch', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id(projectName),
                    branchName: 'master'
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'openBranch', data);
                })
                .then(function (result) {
                    expect(result.branchName).to.equal('master');
                    expect(result.projectId).to.equal(projectName2Id(projectName));
                    return Q.ninvoke(socket, 'emit', 'closeBranch', data);
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should getBranches', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectName)
                    };

                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    done();
                })
                .catch(function (err) {
                    done(new Error(err));
                });
        });

        it('should create and delete branch using setBranchHash', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id(projectName),
                    branchName: 'newBranch'
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    expect(result).to.not.have.property(data.branchName);
                    data.oldHash = '';
                    data.newHash = result.master;
                    return Q.ninvoke(socket, 'emit', 'setBranchHash', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    expect(result).to.have.property(data.branchName);
                    data.oldHash = data.newHash;
                    data.newHash = '';
                    return Q.ninvoke(socket, 'emit', 'setBranchHash', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    expect(result).to.not.have.property(data.branchName);
                })
                .nodeify(done);
        });

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Commit related tests

        it('should getCommits', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectName),
                        before: (new Date()).getTime(), // current time
                        number: 100
                    };

                    return Q.ninvoke(socket, 'emit', 'getCommits', data);
                })
                .then(function (result) {
                    expect(result.length).to.equal(1);
                    expect(result[0]).to.have.property('message');
                    expect(result[0]).to.have.property('parents');
                    expect(result[0]).to.have.property('root');
                    expect(result[0]).to.have.property('time');
                    expect(result[0]).to.have.property('type');
                    expect(result[0]).to.have.property('updater');
                    expect(result[0]).to.have.property('_id');
                })
                .nodeify(done);
        });

        it('should getLatestCommitData', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectId: projectName2Id(projectName),
                        branchName: 'master'
                    };

                    return Q.ninvoke(socket, 'emit', 'getLatestCommitData', data);
                })
                .then(function (result) {
                    expect(result.projectId).to.equal(projectName2Id(projectName));
                    expect(result.branchName).to.equal('master');
                    expect(result).to.have.property('commitObject');
                    expect(result).to.have.property('coreObjects');
                })
                .nodeify(done);
        });

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Watcher related tests

        it('should get PROJECT_CREATED event with watchDatabase', function (done) {
            var socket,
                data = {
                    projectName: 'WebSocketTest_PROJECT_CREATED',
                    branchName: 'master',
                    join: true
                },
                deferred = Q.defer(),
                eventHandler = function (resultData) {
                    expect(resultData.projectId).to.equal(projectName2Id(data.projectName));

                    data.join = false;
                    Q.ninvoke(socket, 'emit', 'watchDatabase', data)
                        .then(function () {
                            deferred.resolve(resultData);
                        })
                        .catch(deferred.reject);
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    socket.on(CONSTANTS.PROJECT_CREATED, eventHandler);
                    return Q.ninvoke(socket, 'emit', 'watchDatabase', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'createProject', data);
                })
                .then(function () {
                    return deferred.promise;
                })
                .nodeify(done);
        });

        it('should get PROJECT_DELETED event with watchDatabase', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id('WebSocketTest_PROJECT_DELETED'),
                    branchName: 'master',
                    join: true
                },
                deferred = Q.defer(),
                eventHandler = function (resultData) {
                    expect(resultData.projectId).to.equal(data.projectId);

                    data.join = false;
                    Q.ninvoke(socket, 'emit', 'watchDatabase', data)
                        .then(function () {
                            deferred.resolve(resultData);
                        })
                        .catch(deferred.reject);
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    socket.on(CONSTANTS.PROJECT_DELETED, eventHandler);
                    return Q.ninvoke(socket, 'emit', 'watchDatabase', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'createProject', {projectName: 'WebSocketTest_PROJECT_DELETED'});
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'deleteProject', data);
                })
                .then(function () {
                    return deferred.promise;
                })
                .nodeify(done);
        });

        it('should get BRANCH_CREATED event with watchProject', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id('WebSocketTest_BRANCH_CREATED'),
                    branchName: 'new_branch',
                    join: true
                },
                deferred = Q.defer(),
                newBranchHash,
                eventHandler = function (resultData) {
                    expect(resultData.projectId).to.equal(data.projectId);
                    expect(resultData.branchName).to.equal(data.branchName);
                    expect(resultData.newHash).to.equal(newBranchHash);

                    data.join = false;
                    Q.ninvoke(socket, 'emit', 'watchProject', data)
                        .then(function () {
                            deferred.resolve(resultData);
                        })
                        .catch(deferred.reject);
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    socket.on(CONSTANTS.BRANCH_CREATED, eventHandler);
                    return Q.ninvoke(socket, 'emit', 'watchProject', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    expect(result).to.not.have.property(data.branchName);
                    data.oldHash = '';
                    data.newHash = result.master;
                    newBranchHash = data.newHash;
                    return Q.ninvoke(socket, 'emit', 'setBranchHash', data);
                })
                .then(function () {
                    return deferred.promise;
                })
                .nodeify(done);
        });

        it('should get BRANCH_DELETED event with watchProject', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id('WebSocketTest_BRANCH_DELETED'),
                    branchName: 'master',
                    join: true
                },
                deferred = Q.defer(),
                newBranchHash,
                eventHandler = function (resultData) {
                    expect(resultData.projectId).to.equal(data.projectId);
                    expect(resultData.branchName).to.equal(data.branchName);
                    expect(resultData.newHash).to.equal(newBranchHash);

                    data.join = false;
                    Q.ninvoke(socket, 'emit', 'watchProject', data)
                        .then(function () {
                            deferred.resolve(resultData);
                        })
                        .catch(deferred.reject);
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    socket.on(CONSTANTS.BRANCH_DELETED, eventHandler);
                    return Q.ninvoke(socket, 'emit', 'watchProject', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    data.oldHash = result.master;
                    data.newHash = '';
                    newBranchHash = data.newHash;
                    return Q.ninvoke(socket, 'emit', 'setBranchHash', data);
                })
                .then(function () {
                    return deferred.promise;
                })
                .nodeify(done);
        });

        it.skip('should get BRANCH_HASH_UPDATED event with watchProject', function (done) {
            var socket,
                data = {
                    projectId: projectName2Id('WebSocketTest_BRANCH_HASH_UPDATED'),
                    branchName: 'master',
                    join: true
                },
                deferred = Q.defer(),
                newBranchHash,
                eventHandler = function (resultData) {
                    expect(resultData.projectId).to.equal(data.projectId);
                    expect(resultData.branchName).to.equal(data.branchName);
                    expect(resultData.newHash).to.equal(newBranchHash);

                    data.join = false;
                    Q.ninvoke(socket, 'emit', 'watchBranch', data)
                        .then(function () {
                            deferred.resolve(resultData);
                        })
                        .catch(deferred.reject);
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    socket.on(CONSTANTS.BRANCH_HASH_UPDATED, eventHandler);
                    return Q.ninvoke(socket, 'emit', 'watchBranch', data);
                })
                .then(function () {
                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    data.oldHash = result.master;
                    data.newHash = '#_________dummyHash';
                    newBranchHash = data.newHash;
                    return Q.ninvoke(socket, 'emit', 'setBranchHash', data);
                })
                .then(function () {
                    return deferred.promise;
                })
                .nodeify(done);
        });
    });
});
/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('WebSocket', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('websocket.spec'),
        Q = testFixture.Q,
        WebGME = testFixture.WebGME,

        superagent = testFixture.superagent,

        gmeAuth,
        projectName = 'webSocketTestProject',
        projectNameUnauthorized = 'webSocketTestUnauthorizedProject',
        guestAccount = gmeConfig.authentication.guestAccount,

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
        openSocketIo = function () {
            var io = require('socket.io-client');
            return Q.nfcall(logIn)
                .then(function (res) {
                    var socket,
                        socketReq = {url: serverBaseUrl},
                        defer = Q.defer();

                    agent.attachCookies(socketReq);

                    socket = io.connect(serverBaseUrl,
                        {
                            query: 'webGMESessionId=' + /webgmeSid=s:([^;]+)\./.exec(
                                decodeURIComponent(socketReq.cookies))[1],
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

    describe('with valid sessionId as a guest user', function () {
        before(function (done) {
            server = WebGME.standaloneServer(gmeConfig);
            serverBaseUrl = server.getUrl();
            server.start(function (err) {
                if (err) {
                    done(new Error(err));
                    return;
                }

                testFixture.clearDBAndGetGMEAuth(gmeConfig, [
                    projectName,
                    projectNameUnauthorized,
                    'webSocketTest_NewProject',
                    'webSocketTest_ProjectToBeDeleted'
                ])
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
                    .then(function () {
                        return Q.all([
                            safeStorage.deleteProject({projectName: projectName}),
                            safeStorage.deleteProject({projectName: projectNameUnauthorized}),
                            safeStorage.deleteProject({projectName: 'webSocketTest_NewProject'}),
                            safeStorage.deleteProject({projectName: 'webSocketTest_ProjectToBeDeleted'})
                        ]);
                    })
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
                            })
                        ]);
                    })
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

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Project related tests

        it('should getProjectNames', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {};

                    return Q.ninvoke(socket, 'emit', 'getProjectNames', data);
                })
                .then(function (result) {
                    expect(result).to.deep.equal([projectName]);
                })
                .nodeify(done);
        });

        it('should getProjects', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {};

                    return Q.ninvoke(socket, 'emit', 'getProjects', data);
                })
                .then(function (result) {
                    expect(result.length).to.greaterThan(1);
                    // TODO: add more specific check for the actual project existence
                })
                .nodeify(done);
        });


        it('should getProjectsAndBranches', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {};

                    return Q.ninvoke(socket, 'emit', 'getProjectsAndBranches', data);
                })
                .then(function (result) {
                    expect(result.length).to.equal(1);
                    expect(result[0].name).to.equal(projectName);
                    expect(result[0].branches).to.have.property('master');
                })
                .nodeify(done);
        });

        it('should createProject', function (done) {
            var data = {
                projectName: 'webSocketTest_NewProject'
            };

            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'createProject', data);
                })
                .then(function (result) {
                    expect(result.name).to.equal(data.projectName);
                })
                .nodeify(done);
        });

        it('should create and delete a project', function (done) {
            var socket,
                data = {
                    projectName: 'webSocketTest_ProjectToBeDeleted'
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'createProject', data);
                })
                .then(function (result) {
                    expect(result.name).to.equal(data.projectName);
                    return Q.ninvoke(socket, 'emit', 'deleteProject', data);
                })
                .nodeify(done);
        });

        it('should open an existing project', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectName: projectName
                    };

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                })
                .nodeify(done);
        });

        it('should open and close an existing project', function (done) {
            var socket,
                data = {
                    projectName: projectName
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                    return Q.ninvoke(socket, 'emit', 'closeProject', data);
                })
                .nodeify(done);
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
                    } else {
                        throw new Error('should have failed to openProject');
                    }
                })
                .nodeify(done);
        });

        it('should fail to open a non-existent project', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectName: 'project_does_not_exist'
                    };

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function () {
                    throw new Error('should have failed to openProject');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('Project does not exist') > -1) {
                        return;
                    } else {
                        throw new Error('should have failed to openProject');
                    }
                })
                .nodeify(done);
        });

        it('should fail to open a project, when there is no read access', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectName: projectNameUnauthorized
                    };

                    return Q.ninvoke(socket, 'emit', 'openProject', data);
                })
                .then(function () {
                    throw new Error('should have failed to openProject');
                })
                .catch(function (err) {
                    if (typeof err === 'string' && err.indexOf('Not authorized') > -1) {
                        return;
                    } else {
                        throw new Error('should have failed to openProject');
                    }
                })
                .nodeify(done);
        });


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Branch related tests

        it('should open an existing branch', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectName: projectName,
                        branchName: 'master'
                    };

                    return Q.ninvoke(socket, 'emit', 'openBranch', data);
                })
                .then(function (result) {
                    expect(result.branchName).to.equal('master');
                    expect(result.projectName).to.equal(projectName);
                })
                .nodeify(done);
        });

        it('should fail to open a non-existing branch', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectName: projectName,
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
                    } else {
                        throw new Error('should have failed to openBranch');
                    }
                })
                .nodeify(done);
        });

        it('should open and close branch', function (done) {
            var socket,
                data = {
                    projectName: projectName,
                    branchName: 'master'
                };

            openSocketIo()
                .then(function (socket_) {
                    socket = socket_;
                    return Q.ninvoke(socket, 'emit', 'openBranch', data);
                })
                .then(function (result) {
                    expect(result.branchName).to.equal('master');
                    expect(result.projectName).to.equal(projectName);
                    return Q.ninvoke(socket, 'emit', 'closeBranch', data);
                })
                .nodeify(done);
        });

        it('should getBranches', function (done) {
            openSocketIo()
                .then(function (socket) {
                    var data = {
                        projectName: projectName
                    };

                    return Q.ninvoke(socket, 'emit', 'getBranches', data);
                })
                .then(function (result) {
                    expect(result).to.have.property('master');
                })
                .nodeify(done);
        });

        it('should create and delete branch using setBranchHash', function (done) {
            var socket,
                data = {
                    projectName: projectName,
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
                        projectName: projectName,
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
                        projectName: projectName,
                        branchName: 'master'
                    };

                    return Q.ninvoke(socket, 'emit', 'getLatestCommitData', data);
                })
                .then(function (result) {
                    expect(result.projectName).to.equal(projectName);
                    expect(result.branchName).to.equal('master');
                    expect(result).to.have.property('commitObject');
                    expect(result).to.have.property('coreObjects');
                })
                .nodeify(done);
        });
    });
});
/*jshint node:true, mocha:true, expr:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('TestAddOn', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        Core = testFixture.WebGME.core,
        logger = testFixture.logger.fork('TestAddOn.spec'),
        superagent = testFixture.superagent,
        agent = superagent.agent(),
        importResult,
        serverBaseUrl,
        server,
        storage,
        webgmeSessionId,
        socket,
        projectName = 'TestAddOnProject',
        projectId = testFixture.projectName2Id(projectName),
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        logIn = function (callback) {
            agent.post(serverBaseUrl + '/login')
                .type('form')
                .send({username: gmeConfig.authentication.guestAccount})
                .send({password: 'guest'})
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
                    webgmeSessionId = /webgmeSid=s:([^;]+)\./.exec(decodeURIComponent(socketReq.cookies))[1];

                    logger.debug('session', webgmeSessionId);
                    //FIXME this socket does not needed as the storage created
                    // during the test would be sufficient to check the update
                    socket = io.connect(serverBaseUrl,
                        {
                            query: 'webGMESessionId=' + webgmeSessionId,
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
        },
        addOnName = 'TestAddOn',
        TestAddOn = testFixture.requirejs('addon/' + addOnName + '/' + addOnName + '/' + addOnName),

        safeStorage,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(safeStorage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/EmptyProject.json'
                });
            })
            .then(function (result) {
                importResult = result;
                return safeStorage.closeDatabase();
            })
            .then(function () {
                server = WebGME.standaloneServer(gmeConfig);
                serverBaseUrl = server.getUrl();
                return Q.ninvoke(server, 'start');
            })
            .then(function () {
                return openSocketIo();
            })
            .then(function (socket_) {
                socket = socket_;
            })
            .nodeify(done);
    });

    after(function (done) {
        socket.disconnect();
        server.stop(done);
    });

    it('should start, query, update, query, and stop', function (done) {
        var _addOn,
            startParam = {
                projectId: projectId,
                branchName: 'master',
                logger: logger.fork(TestAddOn)
            };

        storage = testFixture.NodeStorage.createStorage('127.0.0.1', webgmeSessionId, logger, gmeConfig);
        _addOn = new TestAddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName),
            gmeConfig.authentication.guestAccount);

        expect(_addOn.getName()).to.equal('TestAddOn');

        storage.open(function (networkStatus) {
            if (networkStatus === testFixture.STORAGE_CONSTANTS.CONNECTED) {
                logger.debug('starting addon', {metadata: addOnName});

                //start
                Q.ninvoke(_addOn, 'start', startParam)
                    .then(function () {
                        return Q.ninvoke(_addOn, 'query', 'test');
                    })
                    .then(function (result) {
                        expect(result[0]).to.equal('test');
                        expect(result[1]).to.equal(0);
                        // update model
                        return _addOn.project.makeCommit('master', [importResult.commitHash], importResult.rootHash, {},
                            'new commit');
                    })
                    .then(function (result) {
                        expect(result.status).to.equal(_addOn.project.CONSTANTS.SYNCED);
                        return Q.ninvoke(_addOn, 'query', 'test2');
                    })
                    .then(function (result) {
                        expect(result[0]).to.equal('test2');
                        expect(result[1]).to.equal(1); // update was called once

                        return Q.ninvoke(_addOn, 'stop');
                    })
                    .then(function () {
                        storage.close(function () {
                            done();
                        });
                    })
                    .catch(function (err) {
                        storage.close(function () {
                            done(new Error(err));
                        });
                    })
                    .done();
            } else {
                storage.close(function () {
                    done(new Error('unable to connect storage'));
                });
            }
        });
    });

    it('should fail to start if project id is not given', function (done) {
        var _addOn,
            startParam = {
                branchName: 'master',
                logger: logger.fork(TestAddOn)
            };

        storage = testFixture.NodeStorage.createStorage('127.0.0.1', webgmeSessionId, logger, gmeConfig);
        _addOn = new TestAddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName),
            gmeConfig.authentication.guestAccount);


        storage.open(function (networkStatus) {
            if (networkStatus === testFixture.STORAGE_CONSTANTS.CONNECTED) {
                logger.debug('starting addon', {metadata: addOnName});

                //start
                Q.ninvoke(_addOn, 'start', startParam)
                    .then(function () {
                        done(new Error('should have failed to initialize'));
                    })
                    .catch(function (err) {
                        storage.close(function () {
                            expect(err).to.match(/Failed to initialize/);
                            done();
                        });
                    });
            } else {
                storage.close(function () {
                    done(new Error('unable to connect storage'));
                });
            }
        });
    });


    it('should fail to start if branch name is not given', function (done) {
        var _addOn,
            startParam = {
                projectId: projectId,
                logger: logger.fork(TestAddOn)
            };

        storage = testFixture.NodeStorage.createStorage('127.0.0.1', webgmeSessionId, logger, gmeConfig);
        _addOn = new TestAddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName),
            gmeConfig.authentication.guestAccount);


        storage.open(function (networkStatus) {
            if (networkStatus === testFixture.STORAGE_CONSTANTS.CONNECTED) {
                logger.debug('starting addon', {metadata: addOnName});

                //start
                Q.ninvoke(_addOn, 'start', startParam)
                    .then(function () {
                        done(new Error('should have failed to initialize'));
                    })
                    .catch(function (err) {
                        storage.close(function () {
                            expect(err).to.match(/Failed to initialize/);
                            done();
                        });
                    });
            } else {
                storage.close(function () {
                    done(new Error('unable to connect storage'));
                });
            }
        });
    });


    it('should fail to start if branch does not exist', function (done) {
        var _addOn,
            startParam = {
                projectId: projectId,
                branchName: 'does_not_exist',
                logger: logger.fork(TestAddOn)
            };

        storage = testFixture.NodeStorage.createStorage('127.0.0.1', webgmeSessionId, logger, gmeConfig);
        _addOn = new TestAddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName),
            gmeConfig.authentication.guestAccount);


        storage.open(function (networkStatus) {
            if (networkStatus === testFixture.STORAGE_CONSTANTS.CONNECTED) {
                logger.debug('starting addon', {metadata: addOnName});

                //start
                Q.ninvoke(_addOn, 'start', startParam)
                    .then(function () {
                        done(new Error('should have failed to initialize'));
                    })
                    .catch(function (err) {
                        storage.close(function () {
                            expect(err).to.match(/no such branch/);
                            done();
                        });
                    });
            } else {
                storage.close(function () {
                    done(new Error('unable to connect storage'));
                });
            }
        });
    });

    it('should fail if start is called multiple times', function (done) {
        var _addOn,
            startParam = {
                projectId: projectId,
                branchName: 'master',
                logger: logger.fork(TestAddOn)
            };

        storage = testFixture.NodeStorage.createStorage('127.0.0.1', webgmeSessionId, logger, gmeConfig);
        _addOn = new TestAddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName),
            gmeConfig.authentication.guestAccount);


        storage.open(function (networkStatus) {
            if (networkStatus === testFixture.STORAGE_CONSTANTS.CONNECTED) {
                logger.debug('starting addon', {metadata: addOnName});

                //start
                Q.ninvoke(_addOn, 'start', startParam)
                    .then(function () {
                        return Q.ninvoke(_addOn, 'start', startParam);
                    })
                    .then(function () {
                        done(new Error('should have failed to initialize'));
                    })
                    .catch(function (err) {
                        storage.close(function () {
                            expect(err.message).to.match(/AddOn is already running/);
                            done();
                        });
                    })
                    .done();
            } else {
                storage.close(function () {
                    done(new Error('unable to connect storage'));
                });
            }
        });
    });
});

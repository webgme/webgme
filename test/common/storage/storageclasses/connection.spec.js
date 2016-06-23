/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('storage-connection', function () {
    'use strict';
    var EditorStorage = testFixture.requirejs('common/storage/storageclasses/editorstorage'),
        WebSocket = testFixture.requirejs('common/storage/socketio/websocket'),
        socketIO = require('socket.io-client'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        openSocketIo = testFixture.openSocketIo,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        projectName2Id = testFixture.projectName2Id,

        logger = testFixture.logger.fork('connection.spec'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        ir,

        projectName = 'ConnectionProject';

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName])
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
            .then(function (res) {
                ir = res[0];
                return Q.allDone([
                    ir.project.createBranch('b1', ir.commitHash),
                    ir.project.createBranch('b2', ir.commitHash),
                    ir.project.createBranch('b3', ir.commitHash),
                    ir.project.createBranch('b4', ir.commitHash),
                    ir.project.createBranch('b5', ir.commitHash),
                    ir.project.createBranch('b6', ir.commitHash)
                ]);
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            safeStorage.closeDatabase()
        ])
            .nodeify(done);
    });

    function createStorage(host, webgmeToken, logger, gmeConfig) {
        var ioClient,
            webSocket,
            result = {
                socket: null,
                storage: null,
                webSocket: null
            };


        function IoClient(host, webgmeToken, mainLogger, gmeConfig) {
            var logger = mainLogger.fork('socketio-nodeclient');

            this.connect = function (callback) {
                var socketIoOptions = JSON.parse(JSON.stringify(gmeConfig.socketIO.clientOptions)),
                    protocol = 'http',
                    hostUrl = protocol + '://' + host + ':' + gmeConfig.server.port;

                if (webgmeToken) {
                    socketIoOptions.extraHeaders = {
                        Cookies: 'access_token=' + webgmeToken
                    };
                }

                logger.debug('Connecting to "' + hostUrl + '" with options', {metadata: socketIoOptions});

                result.socket = socketIO.connect(hostUrl, socketIoOptions);
                callback(null, result.socket);
            };

            this.getToken = function () {
                return webgmeToken;
            };
        }

        ioClient = new IoClient(host, webgmeToken, logger, gmeConfig);
        webSocket = new WebSocket(ioClient, logger, gmeConfig);
        result.storage = new EditorStorage(webSocket, logger, gmeConfig);
        result.webSocket = webSocket;

        return result;
    }

    it('should disconnect when server stops', function (done) {
        var agent = superagent.agent(),
            connected = false,
            serverStopped = false,
            res,
            storage,
            socket,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;
                        server.stop(function () {
                            serverStopped = true;
                        });

                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error('Was never connected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        // Make sure server has been closed.
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should disconnect and reconnect when disconnect on actual socket', function (done) {
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;
                        res.socket.disconnect();
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                if (socket) {
                    socket.disconnect();
                }
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should reconnect with branch open', function (done) {
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            project,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;
                        Q.nfcall(storage.openProject, projectName2Id(projectName))
                            .then(function (result) {
                                project = result[0];

                                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                                    callback(null, true);
                                }

                                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                                }

                                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                                    hashUpdateHandler, branchStatusHandler);
                            })
                            .then(function () {
                                res.socket.disconnect();
                            });
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should reconnect and commit uncommitted commit', function (done) {
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            project,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;

                        Q.nfcall(storage.openProject, projectName2Id(projectName))
                            .then(function (result) {
                                var branchOpened = false;

                                project = result[0];

                                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                                    if (branchOpened) {
                                        res.socket.disconnect();
                                    }
                                    branchOpened = true;
                                    callback(null, true);
                                }

                                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                                }

                                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b2',
                                    hashUpdateHandler, branchStatusHandler);
                            })
                            .then(function () {
                                return project.makeCommit('b2', [ir.commitHash], ir.rootHash, {}, 'new committt');
                            })
                            .then(function (commitStatus) {
                                if (disconnected && commitStatus.status === STORAGE_CONSTANTS.SYNCED) {
                                    deferred.resolve();
                                } else {
                                    deferred.reject('Not synced after commit ' +  commitStatus.status);
                                }
                            })
                            .catch(deferred.reject);
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            // All is fine. Wait for the branch status SYNC (could come before this event too).
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should reconnect get into sync with commit send to server but acknowledge did not return', function (done) {
        //  Hc
        //  |
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            project,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;
                        Q.nfcall(storage.openProject, projectName2Id(projectName))
                            .then(function (result) {
                                project = result[0];

                                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                                    callback(null, true);
                                }

                                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {
                                }

                                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b3',
                                    hashUpdateHandler, branchStatusHandler);
                            })
                            .then(function () {
                                // Overwrite makeCommit function to block acknowledgement.
                                res.webSocket.makeCommit = function (data/*, callback*/) {
                                    res.webSocket.socket.emit('makeCommit', data, function (err /*, commitStatus*/) {
                                        if (err) {
                                            done(new Error(err));
                                        }
                                        res.socket.disconnect();
                                    });
                                };

                                return project.makeCommit('b3', [ir.commitHash], ir.rootHash, {}, 'new commie');
                            })
                            .then(function (commitStatus) {
                                if (disconnected && commitStatus.status === STORAGE_CONSTANTS.SYNCED) {
                                    deferred.resolve();
                                } else {
                                    deferred.reject('Not synced after commit ' +  commitStatus.status);
                                }
                            })
                            .catch(function (err) {
                                done(err);
                            });
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            // All is fine. Wait for the branch status SYNC (could come before this event too).
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should reconnect get into forked with commit send to server but acknowledge did not return', function (done) {
        // This test sets the branch hash using the safe-storage after the first commit.
        //  c
        //  H
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            project,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;
                        Q.nfcall(storage.openProject, projectName2Id(projectName))
                            .then(function (result) {
                                project = result[0];

                                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                                    callback(null, true);
                                }

                                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {
                                }

                                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b4',
                                    hashUpdateHandler, branchStatusHandler);
                            })
                            .then(function () {
                                // Overwrite makeCommit function to block acknowledgement.
                                res.webSocket.makeCommit = function (data/*, callback*/) {
                                    res.webSocket.socket.emit('makeCommit', data, function (err, commitStatus) {
                                        if (err) {
                                            done(new Error(err));
                                        }
                                        ir.project.setBranchHash('b4', ir.commitHash, commitStatus.hash)
                                            .then(function (commitStatus) {
                                                if (commitStatus.status === STORAGE_CONSTANTS.SYNCED) {
                                                    res.socket.disconnect();
                                                } else {
                                                    deferred.reject('Server setBranchHash not synced ' +
                                                        commitStatus.status);
                                                }
                                            })
                                            .catch(deferred.reject);
                                    });
                                };

                                return project.makeCommit('b4', [ir.commitHash], ir.rootHash, {}, 'new commie');
                            })
                            .then(function (commitStatus) {
                                if (disconnected && commitStatus.status === STORAGE_CONSTANTS.FORKED) {
                                    deferred.resolve();
                                } else {
                                    deferred.reject('Not FORKED after commit ' +  commitStatus.status);
                                }
                            })
                            .catch(function (err) {
                                done(err);
                            });
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            // All is fine. Wait for the branch status SYNC (could come before this event too).
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should reconnect get into forked with commit send to server but acknowledge did not return 2', function (done) {
        // This test sets the branch hash and makes a commit using the safe-storage after the first commit.
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            project,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;
                        Q.nfcall(storage.openProject, projectName2Id(projectName))
                            .then(function (result) {
                                project = result[0];

                                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                                    callback(null, true);
                                }

                                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {
                                }

                                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b5',
                                    hashUpdateHandler, branchStatusHandler);
                            })
                            .then(function () {
                                // Overwrite makeCommit function to block acknowledgement.
                                res.webSocket.makeCommit = function (data/*, callback*/) {
                                    res.webSocket.socket.emit('makeCommit', data, function (err, commitStatus) {
                                        if (err) {
                                            done(new Error(err));
                                        }
                                        ir.project.setBranchHash('b5', ir.commitHash, commitStatus.hash)
                                            .then(function (commitStatus) {
                                                if (commitStatus.status === STORAGE_CONSTANTS.SYNCED) {
                                                    ir.project.makeCommit('b5', [ir.commitHash], ir.rootHash, {}, 's')
                                                        .then(function (commitStatus) {
                                                            if (commitStatus.status === STORAGE_CONSTANTS.SYNCED) {
                                                                res.socket.disconnect();
                                                            } else {
                                                                deferred.reject('Server commit not synced ' +
                                                                    commitStatus.status);
                                                            }
                                                        });
                                                } else {
                                                    deferred.reject('Server setBranchHash not synced ' +
                                                        commitStatus.status);
                                                }
                                            })
                                            .catch(deferred.reject);
                                    });
                                };

                                return project.makeCommit('b5', [ir.commitHash], ir.rootHash, {}, 'new commie');
                            })
                            .then(function (commitStatus) {
                                if (disconnected && commitStatus.status === STORAGE_CONSTANTS.FORKED) {
                                    deferred.resolve();
                                } else {
                                    deferred.reject('Not FORKED after commit ' +  commitStatus.status);
                                }
                            })
                            .catch(function (err) {
                                done(err);
                            });
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            // All is fine. Wait for the branch status SYNC (could come before this event too).
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });

    it('should reconnect and commit uncommitted commits', function (done) {
        var agent = superagent.agent(),
            connected = false,
            disconnected = false,
            res,
            storage,
            socket,
            project,
            webgmeToken;

        server = WebGME.standaloneServer(gmeConfig);
        Q.ninvoke(server, 'start')
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                var deferred = Q.defer();
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                res = createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);

                storage = res.storage;

                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        connected = true;

                        Q.nfcall(storage.openProject, projectName2Id(projectName))
                            .then(function (result) {
                                var branchOpened;

                                project = result[0];

                                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                                    if (branchOpened === true) {
                                        res.socket.disconnect();
                                        branchOpened = false; // Only trigger disconnect once.
                                        project.makeCommit('b6', [data.commitData.commitObject._id],
                                            ir.rootHash, {}, 'new com')
                                            .then(function (commitStatus) {
                                                if (disconnected && commitStatus.status === STORAGE_CONSTANTS.SYNCED) {
                                                    deferred.resolve();
                                                } else {
                                                    deferred.reject('Not synced after 2nd commit ' +
                                                        commitStatus.status);
                                                }
                                            })
                                            .catch(deferred.reject);
                                    } else if (typeof branchOpened === 'undefined') {
                                        branchOpened = true;
                                    }

                                    callback(null, true);
                                }

                                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                                }

                                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b6',
                                    hashUpdateHandler, branchStatusHandler);
                            })
                            .then(function () {
                                return project.makeCommit('b6', [ir.commitHash], ir.rootHash, {}, 'new commit');
                            })
                            .catch(deferred.reject);
                    } else if (networkState === STORAGE_CONSTANTS.DISCONNECTED) {
                        if (connected === true) {
                            disconnected = true;
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else if (networkState === STORAGE_CONSTANTS.RECONNECTED) {
                        if (disconnected === true) {
                            // All is fine. Wait for the branch status SYNC (could come before this event too).
                        } else {
                            deferred.reject(new Error('Was not connected before reconnected'));
                        }
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .nodeify(function (err) {
                socket.disconnect();
                Q.ninvoke(storage, 'close')
                    .finally(function (err2) {
                        Q.ninvoke(server, 'stop')
                            .finally(function (err3) {
                                done(err || err2 || err3);
                            });
                    });
            });
    });
});
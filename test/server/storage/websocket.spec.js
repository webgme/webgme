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

    describe('valid sessionId as a guest user', function () {
        before(function (done) {
            server = WebGME.standaloneServer(gmeConfig);
            serverBaseUrl = server.getUrl();
            server.start(function (err) {
                if (err) {
                    done(new Error(err));
                    return;
                }

                testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName])
                    .then(function (gmeAuth_) {
                        gmeAuth = gmeAuth_;
                        safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

                        return safeStorage.openDatabase();
                    })
                    .then(function () {
                        return safeStorage.deleteProject({projectName: projectName});
                    })
                    .then(function () {
                        return testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        });
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
        
    });
});
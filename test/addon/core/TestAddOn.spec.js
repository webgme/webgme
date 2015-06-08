/*jshint node:true, mocha:true, expr:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe.skip('TestAddOn', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        Core = testFixture.WebGME.core,
        logger = testFixture.logger.fork('TestAddOn.spec'),
        superagent = testFixture.superagent,
        agent = superagent.agent(),
        serverBaseUrl,
        server,
        storage,
        webgmeSessionId,
        socket,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        importParam = {
            projectSeed: './test/addon/core/TestAddOn/project.json',
            projectName: 'TestAddOn',
            branchName: 'master',
            gmeConfig: gmeConfig,
            logger: logger
        },
        logIn = function (callback) {
            agent.post(serverBaseUrl + '/login?redirect=%2F')
                .type('form')
                .send({username: gmeConfig.authentication.guestAccount})
                .send({password: 'plaintext'})
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
        testFixture.clearDBAndGetGMEAuth(gmeConfig, importParam.projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return safeStorage.deleteProject({projectName: importParam.projectName});
            })
            .then(function () {
                return testFixture.importProject(safeStorage, importParam);
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
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    after(function (done) {
        storage.close();
        server.stop(done);
    });

    //TODO: We need a corresponding WebGMESessionId.
    it('should start, update and stop', function (done) {
        var _addOn,
            startParam = {
                projectName: 'TestAddOn',
                branchName: 'master',
                logger: logger.fork(TestAddOn)
            };

        storage = testFixture.NodeStorage.createStorage(server.getUrl(), webgmeSessionId, logger, gmeConfig);
        _addOn = new TestAddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName),
            gmeConfig.authentication.guestAccount);

        storage.open(function (networkStatus) {
            if (networkStatus === testFixture.STORAGE_CONSTANTS.CONNECTED) {
                logger.debug('starting addon', {metadata: addOnName});

                _addOn.start(startParam, function (err) {

                });
            } else {
                storage.close();
                done('unable to connect storage');
            }
        });
    });
});

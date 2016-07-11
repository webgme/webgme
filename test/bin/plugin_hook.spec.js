/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

describe('plugin_hook', function () {
    var testFixture = require('../_globals.js'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        openSocketIo = testFixture.openSocketIo,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('plugin_hook.spec'),
        PluginHandler = require('../../src/bin/plugin_hook'),

        projectName = 'plugin_hook_test',
        ir,
        gmeAuth,
        safeStorage,
        server;

    before(function (done) {

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            testFixture.clearDBAndGetGMEAuth(gmeConfig)
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

    it('should start and stop with no project', function (done) {
        var pluginId = 'DummyPlugin',
            handlerPort = 9999,
            handlerUrl = 'http://127.0.0.1:' + handlerPort,
            ph = new PluginHandler({pluginId: pluginId, handlerPort: handlerPort});

        ph.start()
            .then(function () {
                var stopDef = Q.defer();
                superagent.get(handlerUrl + '/result')
                    .end(function (err, res) {
                        console.log('got');
                        if (err) {
                            stopDef.reject(err);
                            return;
                        }

                        try {
                            expect(res.body).to.deep.equal([]);
                            ph.stop()
                                .then(stopDef.resolve)
                                .catch(stopDef.reject);
                        } catch (e) {
                            stopDef.reject(e);
                        }
                    });

                return stopDef.promise;
            })
            .nodeify(done);
    });

    it('should add a webhook at start and remove it at stop', function (done) {
        var pluginId = 'DummyPlugin',
            handlerPort = 9999,
            getUrl = server.getUrl() + '/api/projects/' + gmeConfig.authentication.guestAccount + '/' +
                projectName + '/hooks',
            ph = new PluginHandler({pluginId: pluginId, projectName: projectName, handlerPort: handlerPort});

        ph.start()
            .then(function () {
                var stopDef = Q.defer();
                superagent.get(getUrl)
                    .end(function (err, res) {
                        if (err) {
                            stopDef.reject(err);
                            return;
                        }

                        try {
                            expect(Object.keys(res.body)).to.deep.equal(['pluginDebugHook']);
                            expect(res.body.pluginDebugHook.events).to.deep.equal(['COMMIT']);
                            expect(res.body.pluginDebugHook.url)
                                .to.equal('http://127.0.0.1:' + handlerPort + '/pluginDebugHook');
                            ph.stop()
                                .then(stopDef.resolve)
                                .catch(stopDef.reject);
                        } catch (e) {
                            stopDef.reject(e);
                        }
                    });

                return stopDef.promise;
            })
            .then(function () {
                var checkDef = Q.defer();
                superagent.get(getUrl)
                    .end(function (err, res) {
                        if (err) {
                            checkDef.reject(err);
                            return;
                        }

                        try {
                            expect(res.body).to.deep.equal({});
                            checkDef.resolve();
                        } catch (e) {
                            checkDef.reject(e);
                        }
                    });

                return checkDef.promise;
            })
            .nodeify(done);
    });

    it('should add a webhook at start and leave it at stop', function (done) {
        var pluginId = 'DummyPlugin',
            handlerPort = 9999,
            getUrl = server.getUrl() + '/api/projects/' + gmeConfig.authentication.guestAccount + '/' +
                projectName + '/hooks',
            ph = new PluginHandler({
                pluginId: pluginId,
                projectName: projectName,
                handlerPort: handlerPort,
                leaveHook: true
            });

        ph.start()
            .then(function () {
                var stopDef = Q.defer();
                superagent.get(getUrl)
                    .end(function (err, res) {
                        if (err) {
                            stopDef.reject(err);
                            return;
                        }

                        try {
                            expect(Object.keys(res.body)).to.deep.equal(['pluginDebugHook']);
                            expect(res.body.pluginDebugHook.events).to.deep.equal(['COMMIT']);
                            expect(res.body.pluginDebugHook.url)
                                .to.equal('http://127.0.0.1:' + handlerPort + '/pluginDebugHook');
                            ph.stop()
                                .then(stopDef.resolve)
                                .catch(stopDef.reject);
                        } catch (e) {
                            stopDef.reject(e);
                        }
                    });

                return stopDef.promise;
            })
            .then(function () {
                var checkDef = Q.defer();
                superagent.get(getUrl)
                    .end(function (err, res) {
                        if (err) {
                            checkDef.reject(err);
                            return;
                        }

                        try {
                            expect(Object.keys(res.body)).to.deep.equal(['pluginDebugHook']);
                            expect(res.body.pluginDebugHook.events).to.deep.equal(['COMMIT']);
                            expect(res.body.pluginDebugHook.url)
                                .to.equal('http://127.0.0.1:' + handlerPort + '/pluginDebugHook');
                            checkDef.resolve();
                        } catch (e) {
                            checkDef.reject(e);
                        }
                    });

                return checkDef.promise;
            })
            .nodeify(done);
    });

    it('should fail to start if project does not exist', function (done) {
        var pluginId = 'DummyPlugin',
            handlerPort = 9999,
            ph = new PluginHandler({
                pluginId: pluginId,
                projectName: 'Does_not_exist',
                handlerPort: handlerPort
            });

        ph.start()
            .then(function () {
                throw new Error('Should have failed to start');
            })
            .catch(function (err) {
                expect(err.message).to.include('Project does not exist');
            })
            .nodeify(done);
    });
});
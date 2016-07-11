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

        NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),

        projectName = 'plugin_hook_test',
        ir,
        gmeAuth,
        safeStorage,
        server;

    before(function (done) {
        gmeConfig.webhooks.enable = true;
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
                    return Q.allDone([
                        ir.project.createBranch('b1', ir.commitHash),
                        ir.project.createBranch('b2', ir.commitHash),
                        ir.project.createBranch('b3', ir.commitHash),
                        ir.project.createBranch('b4', ir.commitHash)
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

    describe('with connected storage', function () {
        var agent,
            socket,
            webgmeToken,
            ph,
            storage;

            beforeEach(function (done) {
            agent = superagent.agent();
            openSocketIo(server, agent)
                .then(function (result) {
                    socket = result.socket;
                    webgmeToken = result.webgmeToken;
                    storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                        result.webgmeToken,
                        logger,
                        gmeConfig);
                    storage.open(function (networkState) {
                        if (networkState === STORAGE_CONSTANTS.CONNECTED) {
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
                ph.stop(function (err2) {
                    done(err || err2 || null);
                });
            });
        });

        it('should run ConfigurationArtifact plugin when registered and commit is made', function (done) {
            var pluginId = 'ConfigurationArtifact',
                handlerPort = 9999,
                hookUrl = 'http://127.0.0.1:' + handlerPort + '/';

            ph = new PluginHandler({
                pluginId: pluginId,
                projectName: projectName,
                handlerPort: handlerPort,
                leaveHook: true
            });

            ph.start()
                .then(function () {
                    return Q.ninvoke(storage, 'makeCommit', testFixture.projectName2Id(projectName),
                        'b1', [ir.commitHash], ir.rootHash, {}, 'new commit');
                })
                .then(function () {
                    var deferred = Q.defer(),
                        tries = 0,
                        intervalId = setInterval(function () {
                            superagent.get(hookUrl)
                                .end(function (err, res) {
                                    tries += 1;
                                    if (err) {
                                        clearInterval(intervalId);
                                        deferred.reject(err);
                                    } else {
                                        if (res.body.length === 1 && res.body[0].pluginResult !== null) {
                                            clearInterval(intervalId);
                                            try {
                                                expect(res.body[0].exception).to.equal(null);
                                                expect(res.body[0].payload.hookId).to.equal('pluginDebugHook');
                                                expect(res.body[0].pluginResult.success).to.equal(true);
                                                deferred.resolve();
                                            } catch (e) {
                                                deferred.reject(e);
                                            }
                                            clearInterval(intervalId);
                                        } else if (tries === 5) {
                                            clearInterval(intervalId);
                                            deferred.reject(new Error('Result did not make it in 5 tries'));
                                        } else {
                                            logger.warn('Awaiting results');
                                        }
                                    }
                                });
                        }, 200);

                    return deferred.promise;
                })
                .nodeify(done);
        });

        it('should run MinimalWorkingExample and not get into a loop due to commits from the plugin', function (done) {
            var pluginId = 'MinimalWorkingExample',
                hookUrl = 'http://127.0.0.1:' + (gmeConfig.server.port + 1) + '/';

            ph = new PluginHandler({
                pluginId: pluginId,
                projectName: projectName,
                activeNode: '/1',
                activeSelection: '/1'
            });

            ph.start()
                .then(function () {
                    return Q.ninvoke(storage, 'makeCommit', testFixture.projectName2Id(projectName),
                        'b2', [ir.commitHash], ir.rootHash, {}, 'new commit');
                })
                .then(function () {
                    var deferred = Q.defer(),
                        tries = 0,
                        intervalId = setInterval(function () {
                            superagent.get(hookUrl)
                                .end(function (err, res) {
                                    tries += 1;
                                    if (err) {
                                        clearInterval(intervalId);
                                        deferred.reject(err);
                                    } else {
                                        if (res.body.length === 1 && res.body[0].pluginResult !== null) {
                                            clearInterval(intervalId);
                                            try {
                                                expect(res.body[0].exception).to.equal(null);
                                                expect(res.body[0].payload.hookId).to.equal('pluginDebugHook');
                                                expect(res.body[0].pluginResult.success).to.equal(true);
                                                deferred.resolve();
                                            } catch (e) {
                                                deferred.reject(e);
                                            }
                                        } else if (tries === 100) {
                                            clearInterval(intervalId);
                                            deferred.reject(new Error('Result did not make it in 5 tries'));
                                        } else {
                                            logger.warn('Awaiting results');
                                        }
                                    }
                                });
                        }, 200);

                    return deferred.promise;
                })
                .nodeify(done);
        });

        it('should run MinimalWorkingExample and fail and report the error', function (done) {
            var pluginId = 'MinimalWorkingExample',
                hookUrl = 'http://127.0.0.1:' + (gmeConfig.server.port + 1) + '/';

            ph = new PluginHandler({
                pluginId: pluginId,
                projectName: projectName,
                pluginConfigPath: './test/bin/plugin_hook/pluginConfig.json'
            });

            ph.start()
                .then(function () {
                    return Q.ninvoke(storage, 'makeCommit', testFixture.projectName2Id(projectName),
                        'b3', [ir.commitHash], ir.rootHash, {}, 'new commit');
                })
                .then(function () {
                    var deferred = Q.defer(),
                        tries = 0,
                        intervalId = setInterval(function () {
                            superagent.get(hookUrl)
                                .end(function (err, res) {
                                    tries += 1;
                                    if (err) {
                                        clearInterval(intervalId);
                                        deferred.reject(err);
                                    } else {
                                        if (res.body.length === 1 && res.body[0].pluginResult !== null) {
                                            clearInterval(intervalId);
                                            try {
                                                expect(res.body[0].exception).to.equal(null);
                                                expect(res.body[0].payload.hookId).to.equal('pluginDebugHook');
                                                expect(res.body[0].pluginResult.success).to.equal(false);
                                                deferred.resolve();
                                            } catch (e) {
                                                deferred.reject(e);
                                            }
                                        } else if (tries === 5) {
                                            clearInterval(intervalId);
                                            deferred.reject(new Error('Result did not make it in 5 tries'));
                                        } else {
                                            logger.warn('Awaiting results');
                                        }
                                    }
                                });
                        }, 200);

                    return deferred.promise;
                })
                .nodeify(done);
        });

        it('should report an exception if plugin execution fails', function (done) {
            var pluginId = 'ConfigurationArtifact',
                hookUrl = 'http://127.0.0.1:' + (gmeConfig.server.port + 1) + '/';

            ph = new PluginHandler({
                pluginId: pluginId,
                projectName: projectName,
                pluginConfigPath: './test/path/to/pluginConfig/that_does_not_exist.json'
            });

            ph.start()
                .then(function () {
                    return Q.ninvoke(storage, 'makeCommit', testFixture.projectName2Id(projectName),
                        'b4', [ir.commitHash], ir.rootHash, {}, 'new commit');
                })
                .then(function () {
                    var deferred = Q.defer(),
                        tries = 0,
                        intervalId = setInterval(function () {
                            superagent.get(hookUrl)
                                .end(function (err, res) {
                                    tries += 1;
                                    if (err) {
                                        clearInterval(intervalId);
                                        deferred.reject(err);
                                    } else {
                                        if (res.body.length === 1 && res.body[0].exception !== null) {
                                            clearInterval(intervalId);
                                            try {
                                                expect(res.body[0].payload.hookId).to.equal('pluginDebugHook');
                                                expect(res.body[0].exception).to.include('that_does_not_exist.json');
                                                deferred.resolve();
                                            } catch (e) {
                                                deferred.reject(e);
                                            }
                                        } else if (tries === 5) {
                                            clearInterval(intervalId);
                                            deferred.reject(new Error('Result did not make it in 5 tries'));
                                        } else {
                                            logger.warn('Awaiting results');
                                        }
                                    }
                                });
                        }, 200);

                    return deferred.promise;
                })
                .nodeify(done);
        });
    });


});
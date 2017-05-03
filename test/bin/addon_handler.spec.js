/*jshint node:true, mocha:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('addon_handler bin', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        AddOnHandler = require('../../src/bin/addon_handler'),
        logger = testFixture.logger.fork('addon_handler_spec'),
        NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        Q = testFixture.Q,
        superagent = testFixture.superagent,
        projectId,
        agent,
        server,
        core,
        socket,
        webgmeToken,
        connStorage,
        project,
        addOnHandler,
        gmeAuth,
        storage,
        ir,
        projectName = 'addon_handler_bin_test',
        cnt = 0;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    projectSeed: './seeds/EmptyProject.webgmex'
                });
            })
            .then(function (ir_) {
                ir = ir_;
                core = ir.core;
                project = ir.project;
                projectId = project.projectId;
                done();
            })
            .catch(done);
    });

    after('outer after', function (done) {
        storage.closeDatabase()
            .finally(function () {
                gmeAuth.unload(done);
            });
    });

    function prepBranch(branchName, addOnReg) {
        var newRootHash,
            newCommitHash;

        return core.loadRoot(ir.rootHash)
            .then(function (rootNode) {
                var persisted;

                core.setRegistry(rootNode, 'usedAddOns', addOnReg);
                persisted = core.persist(rootNode);

                newRootHash = persisted.rootHash;

                return project.makeCommit(branchName, [''], persisted.rootHash, persisted.objects, 'msg' + cnt++);
            })
            .then(function (result) {
                expect(result.status).to.equal(project.CONSTANTS.SYNCED);

                newCommitHash = result.hash;

                return core.loadRoot(newRootHash);
            })
            .then(function (rootNode) {

                return {
                    fco: core.getFCO(rootNode),
                    rootNode: rootNode,
                    rootHash: newRootHash,
                    commitHash: newCommitHash
                };
            });
    }

    function openBranch(branchName, rootHash, hashHandler, statusHandler) {
        var deferred = Q.defer(),
            result = {
                project: null,
                core: null,
                rootNode: null
            };

        statusHandler = statusHandler || function () {};
        hashHandler = hashHandler || function (data, commitQueue, updateQueue, callback) {
                callback(null, true);
            };

        connStorage.openProject(project.projectId, function (err, connProject) {
            if (err) {
                return deferred.reject(err);
            }

            result.project = connProject;

            connStorage.openBranch(project.projectId, branchName, hashHandler, statusHandler, function (err) {
                if (err) {
                    return deferred.reject(err);
                }

                result.core = new testFixture.Core(connProject, {
                    globConf: gmeConfig,
                    logger: logger
                });

                result.core.loadRoot(rootHash)
                    .then(function (rootNode) {
                        result.rootNode = rootNode;
                        deferred.resolve(result);
                    })
                    .catch(deferred.reject);
            });
        });

        return deferred.promise;
    }

    function getAddOnStatus(delay, fromWebGMEServer) {
        var deferred = Q.defer(),
            statusUrl = fromWebGMEServer ? server.getUrl() + '/api/addOnStatus' : gmeConfig.addOn.workerUrl + '/status';

        setTimeout(function () {
            superagent
                .get(statusUrl)
                .end(function (err, res) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(res.body);
                    }
                });
        }, delay);

        return deferred.promise;
    }

    describe('no auth', function () {
        before(function (done) {
            gmeConfig = testFixture.getGmeConfig();
            gmeConfig.addOn.enable = true;
            gmeConfig.addOn.workerUrl = 'http://127.0.0.1:' + (gmeConfig.server.port + 1);
            gmeConfig.authentication.enable = false;

            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(done);
        });

        beforeEach(function (done) {
            agent = superagent.agent();
            testFixture.openSocketIo(server, agent, 'guest', 'guest')
                .then(function (result) {
                    socket = result.socket;
                    webgmeToken = result.webgmeToken;
                    connStorage = NodeStorage.createStorage(null,
                        result.webgmeToken,
                        logger,
                        gmeConfig);

                    connStorage.open(function (networkState) {
                        if (networkState === project.CONSTANTS.CONNECTED) {
                            done();
                        } else {
                            throw new Error('Unexpected network state: ' + networkState);
                        }
                    });
                })
                .catch(done);
        });

        afterEach(function (done) {
            connStorage.close(function (/*err*/) {
                socket.disconnect();
                addOnHandler.stop(done);
            });
        });

        after(function (done) {
            server.stop(done);
        });


        it('opening branch should start addon', function (done) {
            var branchName = 'b1',
                rootHash,
                commitHash;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    addOnHandler = new AddOnHandler({});

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function () {

                    function checkStatus(delay) {

                        getAddOnStatus(delay, true)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');
                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);
                })
                .catch(done);
        });

        it('committing to branch should start addon', function (done) {
            var branchName = 'b2',
                rootHash,
                commitHash,
                tBeforeCommit,
                b;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    return openBranch(branchName, rootHash); // This will log an error in AddOnEventPropagator
                })
                .then(function (res) {
                    b = res;
                    addOnHandler = new AddOnHandler({});

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    b.core.setAttribute(b.rootNode, 'name', 'newRootNode');

                    tBeforeCommit = Date.now();

                    var persisted = b.core.persist(b.rootNode);

                    return b.project.makeCommit('b2', [commitHash], persisted.rootHash, persisted.objects, 'change');
                })
                .then(function (/*res*/) {
                    function checkStatus(delay) {

                        getAddOnStatus(delay)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');

                                    expect(status[projectId].branchMonitors[branchName].lastActivity > tBeforeCommit)
                                        .to.equal(true);

                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);
                })
                .catch(done);
        });


        it('commit with change of usedAddOns should switch running add-on', function (done) {
            var branchName = 'b3',
                rootHash,
                commitHash,
                b;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    addOnHandler = new AddOnHandler({});

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function (res) {
                    b = res;

                    var deferred = Q.defer();

                    function checkStatus(delay) {

                        getAddOnStatus(delay)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');

                                    deferred.resolve();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(deferred.reject);
                    }

                    checkStatus(150);

                    return deferred.promise;
                })
                .then(function () {
                    b.core.setRegistry(b.rootNode, 'usedAddOns', 'TestAddOn');

                    var persisted = b.core.persist(b.rootNode);

                    return b.project.makeCommit(branchName, [commitHash], persisted.rootHash, persisted.objects,
                        branchName);
                })
                .then(function () {
                    return getAddOnStatus(150);
                })
                .then(function (status) {
                    expect(!!(status[projectId] && status[projectId].branchMonitors[branchName])).to.equal(true);
                    expect(status[projectId].branchMonitors[branchName].runningAddOns.length).to.equal(1);
                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id).to.equal('TestAddOn');
                    done();
                })
                .catch(done);
        });

        it('commit with change of usedAddOns should add to running add-ons', function (done) {
            var branchName = 'b4',
                rootHash,
                commitHash,
                b;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    addOnHandler = new AddOnHandler({});

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function (res) {
                    b = res;

                    var deferred = Q.defer();

                    function checkStatus(delay) {

                        getAddOnStatus(delay)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {

                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');

                                    deferred.resolve();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(deferred.reject);
                    }

                    checkStatus(150);

                    return deferred.promise;
                })
                .then(function () {
                    b.core.setRegistry(b.rootNode, 'usedAddOns', 'NotificationAddOn TestAddOn');

                    var persisted = b.core.persist(b.rootNode);

                    return b.project.makeCommit(branchName, [commitHash], persisted.rootHash, persisted.objects,
                        branchName);
                })
                .then(function () {
                    return getAddOnStatus(150);
                })
                .then(function (status) {
                    expect(!!(status[projectId] && status[projectId].branchMonitors[branchName])).to.equal(true);
                    expect(status[projectId].branchMonitors[branchName].runningAddOns.length).to.equal(2);
                    done();
                })
                .catch(done);
        });
    });

    describe('auth enabled', function () {
        before(function (done) {
            gmeConfig = testFixture.getGmeConfig();
            gmeConfig.addOn.enable = true;
            gmeConfig.addOn.workerUrl = 'http://127.0.0.1:' + (gmeConfig.server.port + 1);
            gmeConfig.authentication.enable = true;

            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(done);
        });

        beforeEach(function (done) {
            agent = superagent.agent();
            testFixture.openSocketIo(server, agent, 'guest', 'guest')
                .then(function (result) {
                    socket = result.socket;
                    webgmeToken = result.webgmeToken;
                    connStorage = NodeStorage.createStorage(null,
                        result.webgmeToken,
                        logger,
                        gmeConfig);

                    connStorage.open(function (networkState) {
                        if (networkState === project.CONSTANTS.CONNECTED) {
                            done();
                        } else {
                            throw new Error('Unexpected network state: ' + networkState);
                        }
                    });
                })
                .catch(done);
        });

        afterEach(function (done) {
            connStorage.close(function (/*err*/) {
                socket.disconnect();
                addOnHandler.stop(done);
            });
        });

        after(function (done) {
            server.stop(done);
        });


        it('opening branch should start addon when no auth info passed in handler', function (done) {
            var branchName = 'bb1',
                rootHash,
                commitHash;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    addOnHandler = new AddOnHandler({});

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function () {

                    function checkStatus(delay) {

                        getAddOnStatus(delay)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');
                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);


                })
                .catch(done);
        });

        it('opening branch should start addon add use passed credentials', function (done) {
            var branchName = 'bb2',
                rootHash,
                commitHash;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    addOnHandler = new AddOnHandler({
                        credentials: 'admin:admin'
                    });

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function () {

                    function checkStatus(delay) {

                        getAddOnStatus(delay)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');
                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);
                })
                .catch(done);
        });

        it('opening branch should start addon add renew token for user', function (done) {
            var branchName = 'bb3',
                rootHash,
                commitHash;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    addOnHandler = new AddOnHandler({
                        credentials: 'admin:admin',
                        tokenRefreshInterval: 50
                    });

                    return addOnHandler.start();
                })
                .then(function () {
                    return getAddOnStatus();
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function () {

                    function checkStatus(delay) {

                        getAddOnStatus(delay)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');
                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);
                })
                .catch(done);
        });
    });

    // This is here in order to reuse the helper functions
    describe('addon worker process', function () {
        beforeEach(function (done) {
            gmeConfig = testFixture.getGmeConfig();
            gmeConfig.addOn.enable = true;
            gmeConfig.addOn.workerUrl = null;
            gmeConfig.authentication.enable = false;

            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(function (err) {
                if (err) {
                    return done(err);
                }

                agent = superagent.agent();
                testFixture.openSocketIo(server, agent, 'guest', 'guest')
                    .then(function (result) {
                        socket = result.socket;
                        webgmeToken = result.webgmeToken;
                        connStorage = NodeStorage.createStorage(null,
                            result.webgmeToken,
                            logger,
                            gmeConfig);

                        connStorage.open(function (networkState) {
                            if (networkState === project.CONSTANTS.CONNECTED) {
                                done();
                            } else {
                                throw new Error('Unexpected network state: ' + networkState);
                            }
                        });
                    })
                    .catch(done);
            });
        });

        afterEach(function (done) {
            connStorage.close(function (/*err*/) {
                socket.disconnect();
                server.stop(done);
            });
        });

        it('opening branch should start addon', function (done) {
            var branchName = 'bbb1',
                rootHash,
                commitHash;

            addOnHandler = null;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;

                    return getAddOnStatus(0, true);
                })
                .then(function (status) {
                    expect(status).to.deep.equal({});
                    return openBranch(branchName, rootHash);
                })
                .then(function () {

                    function checkStatus(delay) {

                        getAddOnStatus(delay, true)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');
                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);


                })
                .catch(done);
        });

        it('committing to branch should start addon', function (done) {
            var branchName = 'bbb2',
                rootHash,
                commitHash,
                tBeforeCommit;

            addOnHandler = null;

            prepBranch(branchName, 'NotificationAddOn')
                .then(function (res) {
                    rootHash = res.rootHash;
                    commitHash = res.commitHash;
                    return openBranch(branchName, rootHash); // This will log an error in AddOnEventPropagator
                })
                .then(function (b) {
                    b.core.setAttribute(b.rootNode, 'name', 'newRootNode');

                    tBeforeCommit = Date.now();

                    var persisted = b.core.persist(b.rootNode);

                    return b.project.makeCommit(branchName, [commitHash], persisted.rootHash, persisted.objects,
                        branchName);
                })
                .then(function (/*res*/) {
                    function checkStatus(delay) {

                        getAddOnStatus(delay, true)
                            .then(function (status) {
                                if (status[projectId] && status[projectId].branchMonitors[branchName] &&
                                    status[projectId].branchMonitors[branchName].runningAddOns.length === 1) {
                                    expect(status[projectId].branchMonitors[branchName].runningAddOns[0].id)
                                        .to.equal('NotificationAddOn');

                                    expect(status[projectId].branchMonitors[branchName].lastActivity > tBeforeCommit)
                                        .to.equal(true);

                                    done();
                                } else if (delay > 250) {
                                    throw new Error('AddOn did not get started in time ' + JSON.stringify(status));
                                } else {
                                    console.log('No status, new delay', delay + 50);
                                    checkStatus(delay + 50);
                                }
                            })
                            .catch(done);
                    }

                    checkStatus(150);
                })
                .catch(done);
        });
    });
});
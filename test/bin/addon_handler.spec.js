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
        gmeConfig.addOn.enable = true;
        gmeConfig.addOn.workerUrl = 'http://127.0.0.1:' + (gmeConfig.server.port + 1);

        server = testFixture.WebGME.standaloneServer(gmeConfig);
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

                server.start(done);
            })
            .catch(done);
    });

    beforeEach(function (done) {
        agent = superagent.agent();
        testFixture.openSocketIo(server, agent)
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
        connStorage.close(function (err) {
            socket.disconnect();

            addOnHandler.stop()
                .then(function () {
                    done();
                })
                .catch(done);
        });
    });

    after(function (done) {
        Q.nfcall(server.stop)
            .finally(function () {
                return storage.closeDatabase();
            })
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
            })
        });

        return deferred.promise;
    }

    function getAddOnStatus(delay) {
        var deferred = Q.defer(),
            statusUrl = gmeConfig.addOn.workerUrl + '/status';

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

    it('opening branch should start addon', function (done) {
        var rootHash,
            commitHash;

        prepBranch('b1', 'NotificationAddOn')
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
                return openBranch('b1', rootHash)
            })
            .then(function () {

                function checkStatus(delay) {

                    getAddOnStatus(delay)
                        .then(function (status) {
                            if (status[projectId] && status[projectId].branchMonitors.b1
                                && status[projectId].branchMonitors.b1.runningAddOns.length === 1) {
                                expect(status[projectId].branchMonitors.b1.runningAddOns[0].id)
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
        var rootHash,
            commitHash,
            tBeforeCommit,
            b;

        prepBranch('b2', 'NotificationAddOn')
            .then(function (res) {
                rootHash = res.rootHash;
                commitHash = res.commitHash;
                return openBranch('b2', rootHash); // This will log an error in AddOnEventPropagator
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
            .then(function (res) {
                function checkStatus(delay) {

                    getAddOnStatus(delay)
                        .then(function (status) {
                            if (status[projectId] && status[projectId].branchMonitors.b2
                                && status[projectId].branchMonitors.b2.runningAddOns.length === 1) {
                                expect(status[projectId].branchMonitors.b2.runningAddOns[0].id)
                                    .to.equal('NotificationAddOn');

                                expect(status[projectId].branchMonitors.b2.lastActivity > tBeforeCommit)
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
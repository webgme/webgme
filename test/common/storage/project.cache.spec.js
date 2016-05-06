/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../_globals.js');

describe('ProjectCache', function () {
    'use strict';
    var NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        openSocketIo = testFixture.openSocketIo,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        projectName2Id = testFixture.projectName2Id,

        expect = testFixture.expect,

        agent,
        logger = testFixture.logger.fork('ProjectCache'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        storage,
        socket,

        projectName = 'StorageProject',
        importResult,
        originalHash;

    before(function (done) {
        var safeStorage;
        gmeConfig.storage.cache = 1;
        server = WebGME.standaloneServer(gmeConfig);
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
            .then(function (results) {
                importResult = results[0];
                originalHash = importResult.commitHash;
                return Q.allDone([
                    importResult.project.createBranch('b1', originalHash)
                ]);
            })
            .then(function () {
                return safeStorage.closeDatabase();
            })
            .then(function () {
                return Q.ninvoke(server, 'start');
            })
            .nodeify(done);
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allDone([
                gmeAuth.unload()
            ])
                .nodeify(done);
        });
    });

    beforeEach(function (done) {
        agent = superagent.agent();
        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                socket = result.socket;
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
            done(err);
        });
    });

    function openProjectAndBranch(branchName, hashUpdateHandler, branchStatusHandler) {
        var deferred = Q.defer(),
            project,
            core;
        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                core = new testFixture.Core(project, {
                    globConf: gmeConfig,
                    logger: logger
                });

                branchStatusHandler = branchStatusHandler || function () {
                    };
                return Q.nfcall(storage.openBranch, projectName2Id(projectName), branchName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function (latestCommitData) {
                core.loadRoot(latestCommitData.commitObject.root, function (err, rootNode) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        core.loadByPath(rootNode, '/1', function (err, fcoNode) {
                            if (err) {
                                deferred.reject(err);
                            }
                            deferred.resolve({
                                project: project,
                                core: core,
                                rootNode: rootNode,
                                fcoNode: fcoNode,
                                commitData: latestCommitData
                            });
                        });
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    it('should openProject', function (done) {
        var initialLoad = true,
            project,
            core,
            newRootHash,
            nodesLoaded = false,
            paths = [],
            hashUpdateHandler = function (data, commitQueue, updateQueue, callback) {
                if (initialLoad) {
                    // 1.
                    initialLoad = false;
                    callback(null, true); // proceed
                    return;
                }
                //3. This blocks the commit from making it to the server
                core.loadRoot(newRootHash, function (err, rootNode) {
                    var i,
                        cnt = paths.length;

                    function nodeLoaded(err, node) {
                        if (err) {
                            nodesLoaded = false;
                        } else {
                            //console.log(core.getAttribute(node, 'name'));
                        }
                        cnt -= 1;
                        if (cnt === 0) {
                            callback(null, true); // always make the commit proceed.
                        }
                    }

                    if (err) {
                        nodesLoaded = false;
                        callback(null, true); // always make the commit proceed.
                    } else {
                        nodesLoaded = true;
                        for (i = 0; i < paths.length; i += 1) {
                            core.loadByPath(rootNode, paths[i], nodeLoaded);
                        }
                    }
                });
            };

        openProjectAndBranch('b1', hashUpdateHandler)
            .then(function (data) {
                //2.
                var persisted,
                    newNode;
                project = data.project;
                core = data.core;

                newNode = core.createNode({parent: data.rootNode, base: data.fcoNode});
                core.setAttribute(newNode, 'name', 'Node1');
                paths.push(core.getPath(newNode));

                newNode = core.createNode({parent: data.rootNode, base: data.fcoNode});
                core.setAttribute(newNode, 'name', 'Node2');
                paths.push(core.getPath(newNode));

                newNode = core.createNode({parent: data.rootNode, base: data.fcoNode});
                core.setAttribute(newNode, 'name', 'Node3');
                paths.push(core.getPath(newNode));

                persisted = core.persist(data.rootNode);
                expect(Object.keys(persisted.objects).length).to.equal(4);
                newRootHash = persisted.rootHash;

                return project.makeCommit('b1', [originalHash], persisted.rootHash, persisted.objects, 'new nodes');
            })
            .then(function () {
                //4.
                expect(nodesLoaded).to.equal(true, 'Failed to load nodes before they were persisted!');
            })
            .nodeify(done);
    });
});
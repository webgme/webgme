/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('standalone multiple back-ends', function () {
    'use strict';
    var testFixture = require('../_globals.js'),
        WebGME = testFixture.WebGME,
        ConnStorage = testFixture.requirejs('common/storage/nodestorage'),
        connStorages = [],
        safeStorage,
        gmeAuth,
        ir,
        expect = testFixture.expect,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        logger = testFixture.logger.fork('standalone multiple back-ends'),
        agent,
        server1,
        server2,
        cfg1,
        cfg2;

    function getConnectedStorage(server, gmeConfig, callback) {
        var deferred = Q.defer(),
            connStorage = ConnStorage.createStorage(server.getUrl(), null, logger, gmeConfig);

        connStorage.open(function (networkState) {
            if (networkState === connStorage.CONSTANTS.CONNECTED) {
                connStorages.push(connStorage);
                deferred.resolve(connStorage);
            } else {
                deferred.reject(new Error('Problems connecting to the webgme server, network state: ' +
                    networkState));
            }
        });

        return deferred.promise.nodeify(callback);
    }

    before(function (done) {
        var gmeConfig = testFixture.getGmeConfig();

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
                        projectName: 'storage_multiple_back_ends',
                        gmeConfig: gmeConfig,
                        logger: logger
                    })
                ]);
            })
            .then(function (res) {
                cfg1 = testFixture.getGmeConfig();
                cfg2 = testFixture.getGmeConfig();

                ir = res[0];

                cfg1.socketIO.adapter.type = 'redis';
                cfg2.socketIO.adapter.type = 'redis';

                cfg1.socketIO.adapter.options.uri = 'redis://127.0.0.1:6379';
                cfg2.socketIO.adapter.options.uri = 'redis://127.0.0.1:6379';

                cfg1.server.port = 9003;
                cfg2.server.port = 9004;

                server1 = WebGME.standaloneServer(cfg1);
                server2 = WebGME.standaloneServer(cfg2);


                return Q.allDone([
                    Q.ninvoke(server1, 'start'),
                    Q.ninvoke(server2, 'start'),
                ]);
            })
            .nodeify(done);
    });

    beforeEach(function () {
        connStorages = [];
        agent = superagent.agent();
    });

    afterEach(function (done) {
        Q.allDone(connStorages.map(function (storage) {
            return Q.ninvoke(storage, 'close');
        }))
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            Q.ninvoke(server1, 'stop'),
            Q.ninvoke(server2, 'stop'),
        ])
            .then(function () {
                return gmeAuth.unload();
            })
            .then(function () {
                return safeStorage.closeDatabase();
            })
            .nodeify(done);
    });

    it('both servers should be up and running and respond', function (done) {
        var def1 = Q.defer(),
            def2 = Q.defer();

        superagent.get(server1.getUrl() + '/gmeConfig.json', function (err, res) {
            if (err) {
                def1.reject(err);
            } else {
                def1.resolve(res.body);
            }
        });

        superagent.get(server2.getUrl() + '/gmeConfig.json', function (err, res) {
            if (err) {
                def2.reject(err);
            } else {
                def2.resolve(res.body);
            }
        });


        Q.allDone([
            def1.promise,
            def2.promise
        ])
            .then(function (res) {
                expect(res[0].server.port).to.equal(9003);
                expect(res[1].server.port).to.equal(9004);
            })
            .nodeify(done);
    });

    it('creating project should send event to other servers socket', function (done) {
        var cnt = 0;

        function handler(_s, data) {
            expect(data).to.deep.equal({
                etype: 'PROJECT_CREATED',
                projectId: 'guest+newProject',
                userId: 'guest'
            });
            cnt += 1;

            if (cnt === 2) {
                done();
            }
        }

        getConnectedStorage(server1, cfg1)
            .then(function (connStorage) {
                return connStorage.watchDatabase(handler);
            })
            .then(function () {
                superagent.put(server2.getUrl() + '/api/projects/guest/newProject')
                    .send({
                        type: 'db',
                        seedName: ir.project.projectId
                    })
                    .end(function (err) {
                        cnt += 1;
                        if (err) {
                            done(err);
                        } else if (cnt === 2) {
                            done();
                        }
                    });
            })
            .catch(done);
    });

    it('committing to a branch on one server should trigger event to other servers socket', function (done) {
        var cnt = 0,
            error,
            storage1,
            storage2;

        function handler(data, commitQueue, updateQueue, callback) {
            if (data.commitData.commitObject._id === ir.commitHash) {
                // Branch opened..
                callback(null, true);
            } else {
                try {
                    expect(data.commitData.commitObject.message).to.equal('hello there');
                    expect(data.commitData.changedNodes).to.equal(null);
                    expect(data.commitData.coreObjects.length).to.equal(2);
                } catch (e) {
                    error = error || e;
                }

                cnt += 1;

                if (cnt === 2) {
                    done(error);
                }
            }
        }

        Q.allDone([
            getConnectedStorage(server1, cfg1),
            getConnectedStorage(server2, cfg2)
        ])
            .then(function (res) {
                storage1 = res[0];
                storage2 = res[1];

                return Q.allDone([
                    Q.ninvoke(storage1, 'openProject', ir.project.projectId),
                    Q.ninvoke(storage2, 'openProject', ir.project.projectId)
                ]);
            })
            .then(function () {
                return Q.allDone([
                    Q.ninvoke(storage1, 'openBranch',
                        ir.project.projectId,
                        'master',
                        function (data, commitQueue, updateQueue, callback) {
                            callback(null, true);
                        },
                        function () {
                            //console.log('branch status changed');
                        }),
                    Q.ninvoke(storage2, 'openBranch',
                        ir.project.projectId,
                        'master',
                        handler,
                        function () {
                            //console.log('branch status changed');
                        })
                ]);
            })
            .then(function () {
                storage1.makeCommit(
                    ir.project.projectId,
                    'master',
                    [ir.commitHash],
                    ir.rootHash,
                    {
                        '#hashhash1': {
                            _id: '#hashhash1',
                            num: 1
                        },
                        '#hashhash2': {
                            _id: '#hashhash2',
                            num: 2
                        }
                    },
                    'hello there',
                    function (err) {
                        cnt += 1;
                        error = error || err;
                        if (cnt === 2) {
                            done(error);
                        }
                    }
                );
            })
            .catch(done);
    });
});
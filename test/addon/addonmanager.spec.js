/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('AddOnManager', function () {
    'use strict';
    var expect = testFixture.expect,
        AddOnManager = require('../../src/addon/addonmanager'),
        logger = testFixture.logger.fork('AddOnManager'),
        Q = testFixture.Q;

    describe('starting and stopping monitors using a mock storage', function () {
        var gmeConfig = testFixture.getGmeConfig();

        gmeConfig.addOn.enable = true;
        gmeConfig.addOn.monitorTimeout = 50;

        function StorageMock() {
            var self = this;
            this.branchCounter = 0;
            this.closeTimeout = 0;

            this.openBranch = function (projectId, branchName, updateFn, branchStatusFn, callback) {
                setTimeout(function () {
                    self.branchCounter += 1;
                    callback(null);
                });
            };

            this.closeBranch = function (projectId, branchName, callback) {
                setTimeout(function () {
                    self.branchCounter -= 1;
                    callback(null);
                }, self.closeTimeout);
            };
        }

        it('should dispatch NO_MONITORS after monitor branch and no activity',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test1',
                    monitorResolved = false;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {
                    },
                    insertObject: function () {
                    },
                    loadPaths: function () {
                    }
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    var error;
                    try {
                        expect(monitorResolved).to.equal(true);
                        expect(storage.branchCounter).to.equal(0);
                        expect(manager.branchMonitors).to.deep.equal({});
                    } catch (e) {
                        error = e;
                    }

                    done(error);
                });

                manager.monitorBranch(branchName)
                    .then(function () {
                        expect(storage.branchCounter).to.equal(1);
                        monitorResolved = true;
                    })
                    .catch(done);
            }
        );

        it('should dispatch NO_MONITORS after monitor branch twice and no activity',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test1',
                    monitorResolved = false;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {
                    },
                    insertObject: function () {
                    },
                    loadPaths: function () {
                    }
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    var error;
                    try {
                        expect(monitorResolved).to.equal(true);
                        expect(storage.branchCounter).to.equal(0);
                        expect(manager.branchMonitors).to.deep.equal({});
                    } catch (e) {
                        error = e;
                    }

                    done(error);
                });

                Q.allDone([
                    manager.monitorBranch(branchName),
                    manager.monitorBranch(branchName)
                ])
                    .then(function () {
                        expect(storage.branchCounter).to.equal(1);
                        monitorResolved = true;
                    })
                    .catch(done);
            }
        );

        it('should monitor a new branch while waiting for closing branch to close',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test1',
                    monitorResolved = 0;

                storage.closeTimeout = 100;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {
                    },
                    insertObject: function () {
                    },
                    loadPaths: function () {
                    }
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    var error;
                    try {
                        expect(monitorResolved).to.equal(2);
                        expect(storage.branchCounter).to.equal(0);
                        expect(manager.branchMonitors).to.deep.equal({});
                    } catch (e) {
                        error = e;
                    }

                    done(error);
                });


                manager.monitorBranch(branchName)
                    .then(function () {
                        var deferred = Q.defer();
                        setTimeout(function () {
                            manager.monitorBranch(branchName)
                                .then(deferred.resolve)
                                .catch(deferred.reject);

                        }, gmeConfig.addOn.monitorTimeout);

                        monitorResolved += 1;
                        return deferred.promise;
                    })
                    .then(function () {
                        monitorResolved += 1;
                    })
                    .catch(done);
            }
        );

        it('should monitor a new branch (2 requests) while waiting for closing branch to close',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test1',
                    monitorResolved = 0;

                storage.closeTimeout = 100;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {
                    },
                    insertObject: function () {
                    },
                    loadPaths: function () {
                    }
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    var error;
                    try {
                        expect(monitorResolved).to.equal(3);
                        expect(storage.branchCounter).to.equal(0);
                        expect(manager.branchMonitors).to.deep.equal({});
                    } catch (e) {
                        error = e;
                    }

                    done(error);
                });


                manager.monitorBranch(branchName)
                    .then(function () {
                        var deferred = Q.defer();
                        setTimeout(function () {
                            Q.all([
                                manager.monitorBranch(branchName),
                                manager.monitorBranch(branchName)
                            ])
                                .then(deferred.resolve)
                                .catch(deferred.reject);

                        }, gmeConfig.addOn.monitorTimeout);

                        monitorResolved += 1;
                        return deferred.promise;
                    })
                    .then(function () {
                        monitorResolved += 1;
                        monitorResolved += 1;
                    })
                    .catch(done);
            }
        );
    });

});

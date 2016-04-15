/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe.skip('AddOnManager', function () {
    'use strict';
    var expect = testFixture.expect,
        AddOnManager = require('../../src/addon/addonmanager'),
        logger = testFixture.logger.fork('AddOnManager');

    describe('starting and stopping monitors using a mock storage', function () {
        var gmeConfig = testFixture.getGmeConfig();

        gmeConfig.addOn.enable = true;
        gmeConfig.addOn.monitorTimeout = 100;

        function StorageMock(manager, done) {
            var self = this;
            this.branchCounter = 0;
            this.deferredCnt = 0;
            this.monitorTimeout = 40;
            this.unMonitorTimeout = 40;

            this.closeBranchTimeout = 5;

            this.openBranch = function (projectId, branchName, updateFn, branchStatusFn, callback) {
                setTimeout(function () {
                    self.branchCounter += 1;
                    callback(null);

                    setTimeout(function () {
                        self.deferredCnt += 1;
                        manager.monitorBranch(null, branchName)
                            .then(function () {
                                self.deferredCnt -= 1;
                                //console.log('monitorBranch');
                            })
                            .catch(done);
                    }, self.monitorTimeout);

                }, 5);
            };

            this.closeBranch = function (projectId, branchName, callback) {
                setTimeout(function () {
                    self.branchCounter -= 1;
                    if (self.branchCounter < 0) {
                        done(new Error('branch counter became negative'));
                    }
                    callback(null);

                    setTimeout(function () {
                        self.deferredCnt += 1;
                        manager.unMonitorBranch(null, branchName)
                            .then(function () {
                                self.deferredCnt -= 1;
                                //console.log('unMonitorBranch');
                            })
                            .catch(done);
                    }, self.unMonitorTimeout);

                }, self.closeBranchTimeout);
            };

        }

        it('should dispatch NO_MONITORS after open branch and closing AFTER the monitor opened the branch',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test1';
                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    expect(storage.branchCounter).to.equal(0);
                    expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                    expect(manager.branchMonitors).to.deep.equal({});
                    done();
                });

                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {
                    expect(storage.branchCounter).to.equal(1);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);

                    setTimeout(function () {
                        expect(storage.branchCounter).to.equal(2);
                        expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                        storage.closeBranch('mockProjectId', branchName, function (/*err*/) {
                            expect(storage.branchCounter).to.equal(1);
                        });
                    }, 140);
                });
            }
        );

        it('should dispatch NO_MONITORS after open branch and closing BEFORE the monitor opened the branch',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test2';
                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    expect(storage.branchCounter).to.equal(0);
                    expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                    expect(manager.branchMonitors).to.deep.equal({});
                    done();
                });

                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {
                    expect(storage.branchCounter).to.equal(1);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);
                    storage.closeBranch('mockProjectId', branchName, function (/*err*/) {

                    });
                });
            }
        );

        it('should dispatch NO_MONITORS (once) after open branch and closing AFTER the monitor opened the branch' +
            ' and opening branch while monitor is in timeout.',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test3';
                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    expect(storage.branchCounter).to.equal(0);
                    expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                    expect(manager.branchMonitors).to.deep.equal({});
                    done();
                });

                storage.openBranch('mockProjectId', branchName, null, null, function () {
                    expect(storage.branchCounter).to.equal(1);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);
                    setTimeout(function () {
                        expect(storage.branchCounter).to.equal(2);
                        expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                        storage.closeBranch('mockProjectId', branchName, function () {
                            expect(storage.branchCounter).to.equal(1);
                            expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                            storage.openBranch('mockProjectId', branchName, null, null, function () {
                                expect(storage.branchCounter).to.equal(2);
                                setTimeout(function () {
                                    expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                                    storage.closeBranch('mockProjectId', branchName, function () {

                                    });
                                }, 120);
                            });
                        });
                    }, 120);
                });
            }
        );

        it('should dispatch NO_MONITORS (twice) after open branch and closing BEFORE the monitor opened the branch' +
            ' and opening branch and closing branch.',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    emptyCnt = 0,
                    branchName = 'test4';

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    emptyCnt += 1;
                    if (emptyCnt === 2) {
                        expect(storage.branchCounter).to.equal(0);
                        expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                        expect(manager.branchMonitors).to.deep.equal({});
                        done();
                    }
                });

                storage.openBranch('mockProjectId', branchName, null, null, function () {
                    expect(storage.branchCounter).to.equal(1);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);

                    storage.closeBranch('mockProjectId', branchName, function () {
                        expect(storage.branchCounter).to.equal(0);
                        expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);

                        setTimeout(function () {
                            expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);

                            storage.openBranch('mockProjectId', branchName, null, null, function () {
                                setTimeout(function () {
                                    expect(storage.branchCounter).to.equal(2);
                                    expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                                    storage.closeBranch('mockProjectId', branchName, function () {

                                    });
                                }, 120);
                            });
                        }, 120);
                    });
                });
            }
        );

        it('should dispatch NO_MONITORS (once) after 2 open branches and closing AFTER the monitor opened the branch.',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test5';

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    expect(storage.branchCounter).to.equal(0);
                    expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                    expect(manager.branchMonitors).to.deep.equal({});
                    done();
                });

                storage.openBranch('mockProjectId', branchName, null, null, function () {});
                storage.openBranch('mockProjectId', branchName, null, null, function () {
                    expect(storage.branchCounter).to.equal(2);
                    setTimeout(function () {
                        expect(storage.branchCounter).to.equal(3);
                        expect(manager.branchMonitors[branchName].connectionCnt).to.equal(3);
                        storage.closeBranch('mockProjectId', branchName, function () {});
                        storage.closeBranch('mockProjectId', branchName, function () {});
                    }, 120);
                });
            }
        );

        it('should dispatch NO_MONITORS (twice) after 2 open branches and closing AFTER the monitor opened the branch.',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test6',
                    emptyCnt = 0;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    emptyCnt += 1;
                    if (emptyCnt === 2) {
                        expect(storage.branchCounter).to.equal(0);
                        expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                        expect(manager.branchMonitors).to.deep.equal({});
                        done();
                    }
                });

                storage.openBranch('mockProjectId', branchName, null, null, function () {});
                storage.openBranch('mockProjectId', branchName, null, null, function () {
                    expect(storage.branchCounter).to.equal(2);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);
                    storage.closeBranch('mockProjectId', branchName, function () {});
                    storage.closeBranch('mockProjectId', branchName, function () {});
                });
            }
        );

        it('should enter StopAndStarted and succeed gracefully with one new monitor',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test7',
                    emptyCnt = 0;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    emptyCnt += 1;
                    if (emptyCnt === 2) {
                        expect(storage.branchCounter).to.equal(0);
                        expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                        expect(manager.branchMonitors).to.deep.equal({});
                        done();
                    }
                });

                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {
                    expect(storage.branchCounter).to.equal(1);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);

                    setTimeout(function () {
                        expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                        // Monitor has connected..

                        storage.closeBranch('mockProjectId', branchName, function (/*err*/) {
                            storage.closeBranchTimeout = 400; //Slow down the branch closing for the monitor.
                            expect(storage.branchCounter).to.equal(1);
                            setTimeout(function () {
                                // Here the timeout should have started and triggered.
                                // But branch still open for monitor..
                                expect(manager.branchMonitors[branchName].connectionCnt).to.equal(1);
                                expect(manager.branchMonitors[branchName].instance.stopRequested).to.equal(true);
                                // At this point we connect a new client.
                                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {
                                    setTimeout(function () {
                                        storage.closeBranchTimeout = 40; //Set it back.
                                        storage.closeBranch('mockProjectId', branchName, function () {});
                                    }, 300);
                                });

                            }, 200);
                        });
                    }, 120);
                });
            }
        );

        it('should enter StopAndStarted and succeed gracefully with two new monitors',
            function (done) {
                var manager = new AddOnManager('mockProjectId', logger, gmeConfig),
                    storage = new StorageMock(manager, done),
                    branchName = 'test8',
                    emptyCnt = 0;

                manager.project = {
                    ID_NAME: '_id',
                    loadObject: function () {},
                    insertObject: function () {},
                    loadPaths: function () {}
                };
                manager.storage = storage;

                manager.addEventListener('NO_MONITORS', function () {
                    emptyCnt += 1;
                    if (emptyCnt === 2) {
                        expect(storage.branchCounter).to.equal(0);
                        expect(storage.deferredCnt).to.equal(1); // The monitors own won't have triggered.
                        expect(manager.branchMonitors).to.deep.equal({});
                        done();
                    }
                });

                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {
                    expect(storage.branchCounter).to.equal(1);
                    expect(manager.branchMonitors.hasOwnProperty(branchName)).to.equal(false);

                    setTimeout(function () {
                        expect(manager.branchMonitors[branchName].connectionCnt).to.equal(2);
                        // Monitor has connected..

                        storage.closeBranch('mockProjectId', branchName, function (/*err*/) {
                            storage.closeBranchTimeout = 400; //Slow down the branch closing for the monitor.
                            expect(storage.branchCounter).to.equal(1);
                            setTimeout(function () {
                                // Here the timeout should have started and triggered.
                                // But branch still open for monitor..
                                expect(manager.branchMonitors[branchName].connectionCnt).to.equal(1);
                                expect(manager.branchMonitors[branchName].instance.stopRequested).to.equal(true);
                                // At this point we connect a new client.
                                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {});
                                storage.openBranch('mockProjectId', branchName, null, null, function (/*err*/) {
                                    setTimeout(function () {
                                        storage.closeBranchTimeout = 40; //Set it back.
                                        storage.closeBranch('mockProjectId', branchName, function () {});
                                        storage.closeBranch('mockProjectId', branchName, function () {});
                                    }, 300);
                                });

                            }, 200);
                        });
                    }, 120);
                });
            }
        );
    });

});

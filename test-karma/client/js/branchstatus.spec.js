/*globals requirejs, expect*/
/* jshint browser: true, mocha: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('branch status', function () {
    'use strict';
    var client,
        storage,
        project,
        core,
        logger,
        gmeConfig,
        originalCommitHash,
        currentBranchName,
        currentBranchHash,
        projectName = 'branchStatus',
        projectId;

    before(function (done) {
        requirejs([
            'js/client',
            'js/logger',
            'common/storage/browserstorage',
            'common/core/core',
            'text!gmeConfig.json'
        ], function (Client, Logger, Storage, Core, gmeConfigJSON) {
            gmeConfig = JSON.parse(gmeConfigJSON);
            logger = Logger.create('test:branchStatus', gmeConfig.client.log);
            client = new Client(gmeConfig);
            projectId = gmeConfig.authentication.guestAccount + client.CONSTANTS.STORAGE.PROJECT_ID_SEP +
                    projectName;
            client.connectToDatabase(function (err) {
                expect(err).to.equal(null);
                client.selectProject(projectId, null, function (err) {
                    expect(err).to.equal(null);

                    storage = Storage.getStorage(logger, gmeConfig, true);
                    storage.open(function (status) {
                        logger.debug('storage is open');
                        expect(status).to.equal(client.CONSTANTS.STORAGE.CONNECTED);

                        storage.openProject(projectId, function (err, project_, branches) {
                            expect(err).to.equal(null);

                            project = project_;
                            core = new Core(project, {
                                globConf: gmeConfig,
                                logger: logger.fork('core')
                            });

                            originalCommitHash = branches.master;

                            done();
                        });
                    });
                });
            });
        });
    });

    after(function (done) {
        storage.close(function (err) {
            client.disconnectFromDatabase(function (err2) {
                done(err || err2);
            });
        });
    });

    afterEach(function (done) {
        client.selectBranch('master', null, function (err) {
            client.deleteBranch(projectId, currentBranchName, currentBranchHash, function (err2) {
                done(err || err2);
            });
        });
    });

    function createSelectBranch(branchName, callback) {
        client.createBranch(projectId, branchName, originalCommitHash, function (err) {
            expect(err).to.equal(null);
            client.selectBranch(branchName, null, callback);
        });
    }

    function changeRootNodeName(newName, commitHash, msg, callback) {
        // 1. Load commit-hash
        project.loadObject(commitHash, function (err, commitObject) {
            expect(err).to.equal(null);
            expect(typeof commitObject.root).to.equal('string');
            expect(commitObject.root.indexOf('#')).to.equal(0);
            // 2. Load root-node
            core.loadRoot(commitObject.root, function (err, rootNode) {
                var persisted;
                expect(err).to.equal(null);

                // 3. Modify the name and persist
                core.setAttribute(rootNode, 'name', newName);
                persisted = core.persist(rootNode);

                // 4. Make the commit w/o setting the branch-hash.
                project.makeCommit(null, [commitHash], persisted.rootHash, persisted.objects, msg,
                    function (err, commitResult) {
                        expect(err).to.equal(null);
                        expect(typeof commitResult.hash).to.equal('string');
                        expect(commitResult.hash.indexOf('#')).to.equal(0);

                        // 5. Return the new commit-hash.
                        callback(null, commitResult.hash);
                    }
                );
            });
        });
    }

    it('should go from SYNC to AHEAD_SYNC to SYNC when making changes.', function (done) {
        var branchName = 'sync_aheadSync_sync',
            prevStatus;

        currentBranchName = branchName;

        function removeHandler() {
            client.removeEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);
        }

        function eventHandler(__client, eventData) {
            if (prevStatus === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                prevStatus = eventData.status;
            } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);
                removeHandler();
                currentBranchHash = client.getActiveCommitHash();
                done();
            } else {
                removeHandler();
                done(new Error('Unexpected BranchStatus ' + eventData.status));
            }
        }

        createSelectBranch(branchName, function (err) {
            expect(err).to.equal(null);

            prevStatus = client.getBranchStatus();
            expect(prevStatus).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);

            client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);

            var loaded = false,
                userGuid;

            function nodeEventHandler(events) {
                if (loaded) {
                    done(new Error('More than one event'));
                } else {
                    loaded = true;
                    expect(events.length).to.equal(2);
                    client.removeUI(userGuid);

                    client.setAttributes('', 'name', 'newRootName',
                        'should go from SYNC to AHEAD_SYNC to SYNC when making changes.');
                }
            }

            userGuid = client.addUI({}, nodeEventHandler);
            client.updateTerritory(userGuid, {'': {children: 0}});
        });
    });

    it('should go from SYNC to PULLING to SYNC when external changes are made.', function (done) {
        var branchName = 'sync_pull_sync',
            prevStatus;

        currentBranchName = branchName;

        function removeHandler() {
            client.removeEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);
        }

        function eventHandler(__client, eventData) {
            if (prevStatus === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.PULLING);
                prevStatus = eventData.status;
            } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.PULLING) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);
                removeHandler();
                currentBranchHash = client.getActiveCommitHash();
                done();
            } else {
                removeHandler();
                done(new Error('Unexpected BranchStatus' + eventData.status));
            }
        }

        createSelectBranch(branchName, function (err) {
            expect(err).to.equal(null);

            var currentHash = client.getActiveCommitHash(),
                msg = 'should go from SYNC to PULLING to SYNC when external changes are made.';

            prevStatus = client.getBranchStatus();
            expect(prevStatus).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);
            client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);

            changeRootNodeName('newRootName', currentHash, msg, function (err, newHash) {
                expect(err).to.equal(null);
                project.setBranchHash(branchName, newHash, currentHash,
                    function (err, result) {
                        expect(err).to.equal(null);
                        expect(result.status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                    }
                );
            });
        });
    });

    it('should go from SYNC to AHEAD_SYNC to AHEAD_NOT_SYNC when making changes during external changes.',
        function (done) {
            var branchName = 'sync_aheadSync_aheadNotSync',
                currentHash,
                prevStatus;

            currentBranchName = branchName;

            function removeHandler() {
                client.removeEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);
            }

            function eventHandler(__client, eventData) {
                if (prevStatus === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    // 1) Here it starts pulling the external changes..
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.PULLING);
                    prevStatus = eventData.status;
                } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.PULLING) {
                    // 2) It starts with its own commit and disregards the pulling
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                    prevStatus = eventData.status;
                } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                    // 3) When the commit returns its forked and the client is not in sync.
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC);
                    removeHandler();
                    currentBranchHash = client.getActiveCommitHash();
                    done();
                } else {
                    removeHandler();
                    done(new Error('Unexpected BranchStatus ' + eventData.status));
                }
            }

            createSelectBranch(branchName, function (err) {
                expect(err).to.equal(null);

                prevStatus = client.getBranchStatus();
                expect(prevStatus).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);

                currentHash = client.getActiveCommitHash();

                client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);

                var loaded = false,
                    userGuid;

                function nodeEventHandler(events) {
                    if (loaded) {
                        done(new Error('More than one event'));
                    } else {
                        loaded = true;
                        expect(events.length).to.equal(2);
                        client.removeUI(userGuid);
                        changeRootNodeName('newConflictRootName', currentHash, 'externalChange',
                            function (err, newHash) {
                                expect(err).to.equal(null);
                                client.startTransaction('sync_aheadSync_aheadNotSync__start');
                                project.setBranchHash(branchName, newHash, currentHash,
                                    function (err, result) {
                                        expect(err).to.equal(null);
                                        expect(result.status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                                        client.setAttributes('', 'name', 'newRootyName', 'conflicting change');
                                        client.completeTransaction('sync_aheadSync_aheadNotSync__stop');
                                    }
                                );

                            }
                        );
                    }
                }

                userGuid = client.addUI({}, nodeEventHandler);
                client.updateTerritory(userGuid, {'': {children: 0}});
            });
        }
    );

    it('should go from AHEAD_NOT_SYNC to AHEAD_NOT_SYNC and increase commitQueue when making more changes.',
        function (done) {
            var branchName = 'sync_aheadSync_aheadNotSync_aheadNotSync',
                currentHash,
                prevStatus;

            currentBranchName = branchName;

            function removeHandler() {
                client.removeEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);
            }

            function eventHandler(__client, eventData) {
                if (prevStatus === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    prevStatus = eventData.status;
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.PULLING);
                } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.PULLING) {
                    prevStatus = eventData.status;
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                    prevStatus = eventData.status;
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC);
                    expect(eventData.commitQueue.length).to.equal(1);
                    client.setAttributes('', 'name', 'newRootyName2Test2', 'change when ahead not sync');
                } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC) {
                    expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC);
                    expect(eventData.commitQueue.length).to.equal(2);
                    removeHandler();
                    currentBranchHash = client.getActiveCommitHash();
                    done();
                } else {
                    removeHandler();
                    done(new Error('Unexpected BranchStatus ' + eventData.status));
                }
            }

            createSelectBranch(branchName, function (err) {
                expect(err).to.equal(null);

                prevStatus = client.getBranchStatus();
                expect(prevStatus).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);

                currentHash = client.getActiveCommitHash();

                client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);

                var loaded = false,
                    userGuid;

                function nodeEventHandler(events) {
                    if (loaded) {
                        done(new Error('More than one event'));
                    } else {
                        loaded = true;
                        expect(events.length).to.equal(2);
                        client.removeUI(userGuid);
                        changeRootNodeName('newConflictRootName', currentHash, 'externalChange',
                            function (err, newHash) {
                                expect(err).to.equal(null);
                                client.startTransaction('sync_aheadSync_aheadNotSync_aheadNotSync__start');
                                project.setBranchHash(branchName, newHash, currentHash,
                                    function (err, result) {
                                        expect(err).to.equal(null);
                                        expect(result.status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                                        client.setAttributes('', 'name', 'newRootyNameTest2', 'conflicting change');
                                        client.completeTransaction('sync_aheadSync_aheadNotSync_aheadNotSync__stop');
                                    }
                                );

                            }
                        );
                    }
                }

                userGuid = client.addUI({}, nodeEventHandler);
                client.updateTerritory(userGuid, {'': {children: 0}});
            });
        }
    );
});
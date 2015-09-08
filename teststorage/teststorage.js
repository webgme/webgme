/*globals define*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
var CREATE_BRANCH = false;
//PROJECT_NAME = 'IBug',
//BRANCH_NAME = 'master',
//NEW_BRANCH_HASH = '#d2d00cdd50a1ca144666a52a471af59d280ac751';

define([
    'js/logger',
    'common/storage/browserstorage',
    'common/core/core',
    'common/storage/constants'
], function (Logger, Storage, Core, CONSTANTS) {
    'use strict';
    function Client(gmeConfig, projectName, branchName) {
        var logger = Logger.create('gme:client', gmeConfig.client.log),
            storage = Storage.getStorage(logger, gmeConfig),
            currRootNode,
            currCommitObject,
            intervalId,
            core,
            PROJECT_NAME = projectName,
            BRANCH_NAME = branchName;

        logger.debug('ctor');
        function loadChildrenAndSetAttribute(rootNode, commitObject) {
            core.loadChildren(rootNode, function (err, children) {
                if (err) {
                    throw new Error(err);
                }
                logger.debug('children loaded', children);
                //children.map(function (child) {
                var newPos;
                logger.debug('child name', core.getAttribute(children[0], 'name'));
                //if (core.getAttribute(children[0], 'name') === 'newName') {
                newPos = {x: 70 + getRandomInt(0, 100), y: 70 + getRandomInt(0, 100)};
                core.setRegistry(children[0], 'position', newPos);
                logger.debug('setting new position', newPos);
                //}
                //});
                currRootNode = rootNode;
                core.persist(rootNode, function (err, persisted) {
                    if (err) {
                        throw new Error(err);
                    }
                    logger.debug('cb persist data', persisted);
                    currCommitObject = storage.makeCommit(PROJECT_NAME, BRANCH_NAME,
                        [commitObject._id],
                        persisted.rootHash,
                        persisted.objects,
                        'First commit from new storage'
                    );

                });
                //logger.debug('persistData', persistData);
                //core.loadChildren(rootNode, function (err, children) {
                //    if (err) {
                //        throw new Error(err);
                //    }
                //    logger.debug('children loaded again (should come from cache)', children);
                //});
            });
        }

        storage.open(function (status) {
            logger.debug('storage is open');
            if (status === CONSTANTS.CONNECTED) {
                storage.getProjectNames({}, function (err, projectNames) {
                    if (err) {
                        throw new Error(err);
                    }
                    if (projectNames.indexOf(projectName) < 0) {
                        throw new Error('Project does not exist');
                    }
                    logger.debug(projectNames);
                    storage.watchProject(PROJECT_NAME, function (_ws, data) {
                        logger.debug('watchProject event', data);
                    });
                    storage.openProject(PROJECT_NAME, function (err, project, branches) {
                        if (err) {
                            throw new Error(err);
                        }
                        var updateHandler = function (newCommitData) {
                            logger.debug('updateHandler invoked', newCommitData);
                            logger.debug('would call loadNodes...');
                            currCommitObject = newCommitData.commitObject;
                            core.loadRoot(newCommitData.commitObject.root, function (err, rootNode) {
                                if (err) {
                                    throw new Error(err);
                                }
                                logger.debug('rootNode loaded', rootNode);
                                currRootNode = rootNode;
                                core.loadChildren(rootNode, function (err, children) {
                                    if (err) {
                                        throw new Error(err);
                                    }
                                    logger.debug('children loaded', children);
                                    children.map(function (child) {
                                        logger.debug('child name', core.getAttribute(child, 'name'));
                                        if (core.getAttribute(child, 'name') === 'newName') {
                                            logger.debug('Got new position', core.getRegistry(child, 'position'));
                                        }
                                    });
                                });
                            });
                        };
                        var commitHandler = function (commitQueue, result, callback) {
                            logger.debug('commitHandler', result);
                            if (result.status === CONSTANTS.SYNCH) {
                                callback(true); // All is fine, continue with the commitQueue..
                            } else if (result.status === CONSTANTS.FORKED) {
                                logger.debug('You got forked, queued commits', commitQueue);
                                callback(false);
                            } else {
                                throw new Error('Unexpected result', result);
                            }
                        };
                        logger.debug('openProject project', project);
                        logger.debug('openProject returned branches', branches);
                        storage.openBranch(PROJECT_NAME, BRANCH_NAME, updateHandler, commitHandler,
                            function (err, latestCommit) {
                                if (err) {
                                    throw new Error(err);
                                }
                                logger.debug('latestCommit', latestCommit);
                                currCommitObject = latestCommit.commitObject;
                                core = new Core(project, {
                                    globConf: gmeConfig,
                                    logger: logger.fork('core')
                                });
                                logger.debug('core instantiated');
                                core.loadRoot(latestCommit.commitObject.root, function (err, rootNode) {
                                    if (err) {
                                        throw new Error(err);
                                    }
                                    logger.debug('rootNode loaded', rootNode);
                                    loadChildrenAndSetAttribute(rootNode, latestCommit.commitObject);
                                });
                            }
                        );
                        //storage.deleteBranch(PROJECT_NAME, 'b535', branches['b535'], function () {
                        //    logger.debug('branch deleted', arguments);
                        //});
                    });
                    if (CREATE_BRANCH) {
                        storage.getBranches(PROJECT_NAME, {}, function (err, data) {
                            if (err) {
                                throw new Error(err);
                            }
                            logger.debug('getBranches return', data);
                        });
                        var newBranchName = 'br' + getRandomInt(2, 9999);
                        logger.debug('will create', newBranchName);
                        setTimeout(function () {
                            storage.createBranch(PROJECT_NAME,
                                newBranchName,
                                NEW_BRANCH_HASH,
                                function (err) {
                                    if (err) {
                                        throw new Error(err);
                                    }
                                    storage.getBranches(PROJECT_NAME, {}, function (err, data) {
                                        if (err) {
                                            throw new Error(err);
                                        }
                                        logger.debug('getBranches after create returned', data);
                                    });
                                });
                        }, 2000);
                    }
                });
            } else if (status === CONSTANTS.RECONNECTED) {
                logger.debug('Reconnected!');
                clearInterval(intervalId);
            } else if (status === CONSTANTS.DISCONNECTED) {
                logger.debug('Got disconnect, waiting for reconnect...');
                intervalId = setInterval(function () {
                    loadChildrenAndSetAttribute(currRootNode, currCommitObject);
                }, 2000);
            } else if (status === CONSTANTS.ERROR) {
                throw new Error('Could not connect');
            }
        });

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }

    return Client;
});
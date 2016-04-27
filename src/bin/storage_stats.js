/*jshint node: true*/

/**
 * TODO: Add options for storing the results.
 * TODO: Fix the REGEX to work.
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    path = require('path'),
    Core = webgme.requirejs('common/core/coreQ'),
    mongodb = require('mongodb'),
    Q = require('q');

/**
 *
 * @param {object} [options]
 */
function getStats(options) {
    var gmeConfig = require(path.join(process.cwd(), 'config')),
        logger,
        gmeAuth,
        params = {},
        err,
        mongoConn,
        storage;

    webgme.addToRequireJsPaths(gmeConfig);
    logger = new webgme.Logger.create('clean_up', gmeConfig.bin.log, false);

    options = options || {};
    params.username = options.username || gmeConfig.authentication.guestAccount;

    if (options.regex) {
        params.regex = new RegExp(options.regex);
    } else {
        params.regex = new RegExp('.*');
    }

    if (options.fullProjectStat) {
        params.fullProjectStat = true;
    }

    if (options.excludeMongoStats) {
        params.excludeMongoStats = true;
    }

    return webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth_) {
            gmeAuth = gmeAuth_;
            storage = webgme.getStorage(logger, gmeConfig, gmeAuth);

            return storage.openDatabase();
        })
        .then(function () {
            return storage.getProjects({
                username: params.username,
                info: true,
                rights: true,
                branches: true
            });
        })
        .then(function (projects) {
            logger.info('Will match project name against "' + params.regex.source + '"');
            function getProjectPromise(projectInfo) {
                var result = {
                        projectId: projectInfo._id,
                        commitCnt: null,
                        metaNodeCnt: null,
                        nodeCnt: null,
                        branchCnt: Object.keys(projectInfo.branches).length,
                        tagCnt: null,
                        collectionStats: null
                    },
                    project;

                return storage.openProject({projectId: result.projectId, username: params.username})
                    .then(function (project_) {
                        project = project_;

                        return project.getTags();
                    })
                    .then(function (tags) {
                        result.tagCnt = Object.keys(tags).length;

                        return project.getCommits(Date.now(), 0);
                    })
                    .then(function (commits) {
                        var coreDeferred = Q.defer(),
                            core;

                        result.commitCnt = commits.length;
                        if (commits.length > 0) {
                            core = new Core(project, {
                                globConf: gmeConfig,
                                logger: logger
                            });
                            core.loadRoot(commits[0].root)
                                .then(function (rootNode) {
                                    result.metaNodeCnt = Object.keys(core.getAllMetaNodes(rootNode)).length;
                                    if (params.fullProjectStat === true) {
                                        logger.warn('Will load entire project-tree, this could take some time...');
                                        core.loadSubTree(rootNode)
                                            .then(function (nodes) {
                                                result.nodeCnt = nodes.length;
                                                coreDeferred.resolve(result);
                                            })
                                            .catch(coreDeferred.reject);
                                    } else {
                                        coreDeferred.resolve(result);
                                    }
                                })
                                .catch(coreDeferred.reject);
                        } else {
                            coreDeferred.resolve(result);
                        }

                        return coreDeferred.promise;
                    });
            }

            return Q.all(projects.map(getProjectPromise));
        })
        .then(function (results) {
            var mongoDeferred = Q.defer();
            if (params.excludeMongoStats === true) {
                mongoDeferred.resolve(results);
                mongoConn = {
                    close: function (cb) {
                        cb();
                    }
                };
            } else {
                Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
                    .then(function (db) {
                        mongoConn = db;
                        function getCollectionPromise(result) {
                            return Q.ninvoke(mongoConn, 'collection', result.projectId)
                                .then(function (coll) {
                                    return Q.ninvoke(coll, 'stats');
                                })
                                .then(function (stats) {
                                    result.collectionStats = stats;
                                })
                                .catch(function (err) {
                                    logger.error('Failed getting coll stat for project', result.projectId, err);
                                });
                        }

                        return Q.all(results.map(getCollectionPromise));
                    })
                    .then(function () {
                        mongoDeferred.resolve(results);
                    })
                    .catch(function (err) {
                        logger.error('Failed connecting to mongo', err);
                        mongoDeferred.resolve(results);
                    });
            }
            return mongoDeferred.promise;
        })
        .then(function (results) {
            console.log(results);

        })
        .catch(function (err_) {
            err = err_;
        })
        .finally(function () {
            logger.debug('Closing database connections...');
            return Q.allSettled([storage.closeDatabase(), gmeAuth.unload(), Q.ninvoke(mongoConn, 'close')])
                .finally(function () {
                    logger.debug('Closed.');
                    if (err) {
                        throw err;
                    }
                });
        });
}

module.exports = getStats;

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command();

    program
        .version('2.0.0')
        .option('-r, --regex [string]', 'Project names must match the regexp [.*].', '.*')
        .option('-u, --username [string]', 'The user account being used. [guest account]')
        .option('-f, --fullNodeStat [boolean]', 'If true will load all nodes for the project at latest commit ' +
        ' [false].', false)
        .option('-m, --excludeMongoStats [boolean]', 'Set parameter if the data is not stored in mongodb.', false)
        .on('--help', function () {
            console.log('Use this script to gather statistics about project sizes etc. Since the script uses ' +
                'the storage API including authorization, the given user must have read access to the projects.');
            console.log();
            console.log('  Examples:');
            console.log();
            console.log('    $ node storage_stats.js');
            console.log('    $ node storage_stats.js --username demo --fullNodeStat --regex ^demo_');
            console.log('    $ node storage_stats.js --regex ^startsWith --excludeMongoStats');
        })
        .parse(process.argv);

    getStats(program)
        .catch(function (err) {
            console.error(err.stack);
        });
}
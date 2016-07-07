/*jshint node: true*/

/**
 * Script for gathering data about the project collections.
 * See options at bottom for usage.
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    path = require('path'),
    fs = require('fs'),
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
        startTime = Date.now(),
        mongoConn,
        storage;

    webgme.addToRequireJsPaths(gmeConfig);
    logger = new webgme.Logger.create('stats', gmeConfig.bin.log, false);

    options = options || {};
    params.username = options.username || gmeConfig.authentication.guestAccount;

    if (options.regex) {
        params.regex = new RegExp(options.regex);
    } else {
        params.regex = new RegExp('.*');
    }

    if (options.fullNodeStat) {
        params.fullNodeStat = true;
    }

    if (options.excludeMongoStats) {
        params.excludeMongoStats = true;
    }

    if (typeof options.outputFile === 'string') {
        params.outputFile = options.outputFile;
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

            projects = projects.filter(function (projectInfo) {
                return params.regex.test(projectInfo.name);
            });

            function getProjectPromise(projectInfo) {
                var result = {
                        projectId: projectInfo._id,
                        commitCnt: null,
                        metaNodeCnt: null,
                        nodeCnt: null,
                        branchCnt: Object.keys(projectInfo.branches).length,
                        tagCnt: null,
                        collectionStats: null,
                        errors: []
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
                                    function visitorFn(node, done) {
                                        result.nodeCnt += 1;
                                        done();
                                    }

                                    result.metaNodeCnt = Object.keys(core.getAllMetaNodes(rootNode)).length;
                                    if (params.fullNodeStat === true) {
                                        logger.info('Traversing', result.projectId);
                                        result.nodeCnt = 0;
                                        core.traverse(rootNode, {stopOnError: true}, visitorFn)
                                            .then(function () {
                                                coreDeferred.resolve(result);
                                            })
                                            .catch(function (err) {
                                                logger.error(err);
                                                result.errors.push(err);
                                                coreDeferred.resolve(result);
                                            });
                                    } else {
                                        coreDeferred.resolve(result);
                                    }
                                })
                                .catch(function (err) {
                                    logger.error(err);
                                    result.errors.push(err);
                                    coreDeferred.resolve(result);
                                });
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
                                    logger.error(err);
                                    result.errors.push(err);
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
            var packageDeferred = Q.defer(),
                augmentedResults = {
                    scriptParams: params,
                    projects: results,
                    packageJson: null
                };

            // Print the source of the regex.
            augmentedResults.scriptParams.regex = augmentedResults.scriptParams.regex.source;

            Q.nfcall(fs.readFile, 'package.json', 'utf8')
                .then(function (content) {
                    augmentedResults.packageJson = JSON.parse(content);
                    packageDeferred.resolve(augmentedResults);
                })
                .catch(function (err) {
                    logger.error('Error trying to extract package data reading in: ', err);
                    packageDeferred.resolve(augmentedResults);
                });

            return packageDeferred.promise;
        })
        .then(function (result) {
            var writeDeferred = Q.defer();

            if (params.outputFile) {
                writeDeferred.promise = Q.nfcall(fs.writeFile, params.outputFile, JSON.stringify(result));
            } else {
                console.log(result.projects);
                writeDeferred.resolve();
            }

            return writeDeferred.promise;
        })
        .then(function () {
            var ms = Date.now() - startTime,
                min = Math.floor(ms/1000/60),
                sec = (ms/1000) % 60;

            logger.info('Script finished' + (params.outputFile ? ', wrote to "' + params.outputFile + '".' : '.'));
            logger.info('Exec-time:', min, 'min', sec, 'sec');
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
        .option('-o, --outputFile [string]', 'File to output data to instead of console.')
        .on('--help', function () {
            console.log('Use this script to gather statistics about project sizes etc. Since the script uses ' +
                'the storage API including authorization, the given user must have read access to the projects.');
            console.log();
            console.log('  Examples:');
            console.log();
            console.log('    $ node storage_stats.js');
            console.log('    $ node storage_stats.js --username demo --fullNodeStat --regex ^demo_');
            console.log('    $ node storage_stats.js --regex ^startsWith --excludeMongoStats');
            console.log('    $ node storage_stats.js --outputFile stats.json');
        })
        .parse(process.argv);

    getStats(program)
        .catch(function (err) {
            console.error(err.stack);
        });
}
/*jshint node: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var main;

main = function (argv, callback) {
    var path = require('path'),
        gmeConfig = require(path.join(process.cwd(), 'config')),
        mongodb = require('mongodb'),
        Q = require('q'),
        webgme = require('../../webgme'),
        StorageUtil,
        Command = require('commander').Command,
        logger = webgme.Logger.create('gme:bin:migrateprojects', gmeConfig.bin.log),
        program = new Command(),
        dryRun,

        gmeAuth,
        users,

        error,
        db;

    callback = callback || function () {
        };

    webgme.addToRequireJsPaths(gmeConfig);
    StorageUtil = webgme.requirejs('common/storage/util');

    program.option('-f, --force', 'Migrate all projects.');

    program.parse(argv);

    if (program.force) {
        dryRun = false;
        logger.info('Database will be updated.');
    } else {
        dryRun = true;
        logger.warn('Before you run this script with a database update, it is strongly recommended to do a mongodump.');
        logger.info('Dry run, please add -f as a command line argument if you like to update the database.');
    }


    logger.info('Connecting to database: ' + gmeConfig.mongo.uri);
    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth_) {
            gmeAuth = gmeAuth_;
            return gmeAuth.listUsers();
        })
        .then(function (users_) {
            users = users_;
            return Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options);
        })
        .then(function (db_) {
            db = db_;
            logger.debug('Connected to database: ' + gmeConfig.mongo.uri);

            return getProjects();
        })
        .then(function (upgradeInfo) {
            upgradeInfo.map(function (detail) {
                // print out upgrade details.
                logger.info(detail.collectionName + ' will be owned by ' + detail.owner);
            });
            if (dryRun) {
                return Q.resolve();
            } else {
                return doUpgrade(upgradeInfo);
            }
        })
        .then(function () {
            if (dryRun) {
                logger.warn('Database did not get migrated. This was only a dry run.');
            } else {
                logger.info('Database got migrated.');
            }
        })
        .catch(function (err) {
            error = err;
            logger.error('Script execution failed.', error);
        })
        .finally(function () {
            logger.debug('Closing database: ' + gmeConfig.mongo.uri);
            Q.all([
                gmeAuth.unload(),
                Q.ninvoke(db, 'close')
            ])
                .catch(function (err) {
                    error = error || err;
                    logger.error(err);
                })
                .finally(function () {
                    callback(error);
                });
        });

    function getProjects(cb) {
        logger.info('Fetching old projects and their information ...');

        return Q.ninvoke(db, 'collectionNames')
            .then(function (collections) {
                var upgradeInfo = [],
                    projectDetail;

                // discover old projects
                collections.map(function (collection) {
                    if (collection.name === 'system.indexes' ||
                        collection.name.indexOf('_') === 0 ||
                        collection.name.indexOf('+') > -1) {

                        logger.warn('Project/collection will not be migrated: ' + collection.name);
                    } else {
                        // good old project name
                        projectDetail = {
                            collectionName: collection.name,
                            owner: null
                        };

                        // get existing authorization information for old project
                        users.map(function (user) {
                            // identify possible owner of the project
                            if (user.projects.hasOwnProperty(collection.name) &&
                                user.projects[collection.name].delete) {

                                if (projectDetail.owner) {
                                    // owner is already selected
                                } else {
                                    projectDetail.owner = user._id;
                                }
                            }
                        });

                        if (projectDetail.owner === null) {
                            projectDetail.owner = gmeConfig.authentication.guestAccount;
                            logger.warn(projectDetail.collectionName +
                                        ' Project was owned nobody, assigning it to guest account: ' +
                                        projectDetail.owner);
                        }

                        upgradeInfo.push(projectDetail);
                    }
                });

                return Q.resolve(upgradeInfo);
            })
            .nodeify(cb);
    }

    function doUpgrade(upgradeInfo) {
        var promises = [],
            promise;

        upgradeInfo.map(function (info) {
            var newProjectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(info.owner, info.collectionName);

            promise = Q.ninvoke(db, 'collection', info.collectionName)
                .then(function (collection) {
                    return Q.ninvoke(collection, 'rename', newProjectId);
                })
                .then(function () {
                    return gmeAuth.addProject(info.owner, info.collectionName, {} /*info*/);
                })
                .then(function () {
                    var authorizePromises = [],
                        authorizePromise;

                    users.map(function (user) {
                        if (user.projects.hasOwnProperty(info.collectionName)) {
                            logger.info('Authorizing ' + user._id + ' for ' + newProjectId);

                            authorizePromise = gmeAuth.authorizeByUserId(user._id, newProjectId, 'create', user.projects[info.collectionName])
                                .then(function () {
                                    return gmeAuth.authorizeByUserId(user._id, info.collectionName, 'delete');
                                });

                            authorizePromises.push(authorizePromise);
                        }
                    });

                    return Q.allSettled(authorizePromises);
                });

            promises.push(promise);
        });

        return Q.allSettled(promises);
    }
};


module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv);
}

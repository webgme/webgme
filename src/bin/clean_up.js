/*jshint node: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    path = require('path'),
    Q = require('q');

/**
 * Lists and optionally deletes the projects matching the criteria.
 *
 * @param {object} [options]
 * @param {bool} [options.del=false] - If true will do the deletion.
 * @param {bool} [options.list=false] - If true will list all the projects the owner has rights too.
 * @param {string} [options.username=gmeConfig.authentication.guestAccount] - User.
 * @param {string} [options.daysAgo=10] - Time since last viewed (inclusive).
 * @param {string} [options.commits=1] - Maximum number of commits a deleted project can have..
 * @param {string} [options.branches=1] - Maximum number of branches a deleted project can have.
 * @param {string} [options.regex='.*'] - Project names must match the regex.
 */
function cleanUp(options) {
    var gmeConfig = require(path.join(process.cwd(), 'config')),
        logger,
        gmeAuth,
        params = {},
        err,
        storage;

    webgme.addToRequireJsPaths(gmeConfig);
    logger = new webgme.Logger.create('clean_up', gmeConfig.bin.log, false);

    options = options || {};
    params.username = options.username || gmeConfig.authentication.guestAccount;
    params.daysAgo = typeof options.daysAgo === 'number' ? options.daysAgo : 10;
    params.commits = typeof options.commits === 'number' ? options.commits : 1;
    params.branches = typeof options.branches === 'number' ? options.branches : 1;
    params.del = options.del;
    params.list = options.list;

    if (options.regex) {
        params.regex = new RegExp(options.regex);
    } else {
        params.regex = new RegExp('.*');
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
            var now = new Date();
            logger.info('Will match project name against "' + params.regex.source + '"');
            function getProjectPromise(project) {
                var deferred = Q.defer(),
                    vDate,
                    branchNames = Object.keys(project.branches),
                    daysAgo,
                    result = {
                        projectId: project._id,
                        remove: false
                    };

                //logger.info(JSON.stringify(project, null, 2));
                //logger.info(project.name, regex.toString());
                if (params.list === true) {
                    logger.info('\nprojectId:', project._id, '\nrights   :', project.rights,
                        '\nbranches :', '' + branchNames);
                }

                if (project.rights.delete === true &&
                    params.regex.test(project.name) &&
                    branchNames.length <= params.branches) {

                    if (typeof project.info.viewedAt === 'string') {
                        vDate = new Date(project.info.viewedAt);
                    } else {
                        vDate = new Date().setYear(1990); // Way back.
                    }

                    daysAgo = Math.round((now - vDate) / 1000 / 3600 / 24);
                    if (daysAgo >= params.daysAgo) {
                        storage.getCommits({
                            projectId: project._id,
                            username: params.username,
                            before: now.getTime(),
                            number: params.commits + 1
                        })
                            .then(function (commits) {
                                if (commits.length <= params.commits) {
                                    result.remove = true;
                                }
                                deferred.resolve(result);
                            })
                            .catch(deferred.reject);
                    } else {
                        deferred.resolve(result);
                    }
                } else {
                    deferred.resolve(result);
                }

                return deferred.promise;
            }

            return Q.all(projects.map(getProjectPromise));
        })
        .then(function (results) {
            var deletions = [],
                remove = 0,
                keep = 0;
            results.forEach(function (result) {
                if (result.remove === true) {
                    logger.info('To remove:', result.projectId);
                    remove += 1;
                    if (params.del === true) {
                        deletions.push(storage.deleteProject({
                            projectId: result.projectId,
                            username: params.username
                        })
                            .then(function (removed) {
                                return {
                                    removed: removed,
                                    projectId: result.projectId
                                };
                            })
                            .catch(function (err) {
                                return {
                                    removed: false,
                                    projectId: result.projectId,
                                    err: err
                                };
                            })
                        );
                    }
                } else {
                    keep += 1;
                }
            });

            logger.info('Remove', remove, 'out of', keep + remove);

            return Q.all(deletions);
        })
        .then(function (results) {
            var cnt = 0;
            results.forEach(function (res) {
                if (res.removed === true) {
                    cnt += 1;
                    logger.info('Removed:', res.projectId);
                } else {
                    logger.error('Failed to remove ' + res.projectId, res.err.stack);
                }
            });

            if (params.del === true) {
                logger.info('Removed', cnt, 'project(s).');
            }
        })
        .catch(function (err_) {
            err = err_;
        })
        .finally(function () {
            logger.debug('Closing database connections...');
            return Q.allSettled([storage.closeDatabase(), gmeAuth.unload()])
                .finally(function () {
                    logger.debug('Closed.');
                    if (err) {
                        throw err;
                    }
                });
        });
}

module.exports = cleanUp;

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command();

    program
        .version('1.6.0')
        .option('-d, --del [boolean]', 'If true will do the deletion [false].', false)
        .option('-l, --list [boolean]', 'If true will list all the projects this user has access to [false].', false)
        .option('-t, --daysAgo [number]', 'Minimum age (last viewed) of a project to delete [10].', 10)
        .option('-c, --commits [number]', 'Maximum number of commits of a project to delete [1].', 1)
        .option('-b, --branches [number]', 'Maximum number of branches of a project to delete [1].', 1)
        .option('-r, --regex [string]', 'Project names must match the regexp [.*].', '.*')
        .option('-u, --username [string]', 'The user account being used. [guest account]')
        .on('--help', function () {
            console.log('Use this script to delete projects matching the given criteria. Since the script uses ' +
            'the storage API including authorization, the given user must have delete access to the projects.');
            console.log();
            console.log('  Examples:');
            console.log();
            console.log('    $ node clean_up.js');
            console.log('    $ node clean_up.js --list');
            console.log('    $ node clean_up.js --username demo --commits 5 --regex ^demo_ --del');
            console.log('    $ node clean_up.js --regex ^startsWith');
            console.log('    $ node clean_up.js --daysAgo 3 --regex contains --branches 2');
        })
        .parse(process.argv);

    program.daysAgo = Math.round(parseFloat(program.daysAgo));
    program.commits = Math.round(parseFloat(program.commits));
    program.branches = Math.round(parseFloat(program.branches));
    cleanUp(program)
        .catch(function (err) {
            console.error(err.stack);
        });
}
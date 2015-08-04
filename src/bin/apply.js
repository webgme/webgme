/*jshint node: true*/
/**
 * @module Bin:Apply
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    FS = require('fs'),
    Q = require('q'),
    cliStorage,
    gmeAuth,
    main,
    merger = webgme.requirejs('common/core/users/merge'),
    MongoURI = require('mongo-uri'),
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:apply', gmeConfig.bin.log, false),
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants');

webgme.addToRequireJsPaths(gmeConfig);

main = function (argv) {
    var mainDeferred = Q.defer(),
        Command = require('commander').Command,
        program = new Command(),
        syntaxFailure = false,
        patchJson,
        finishUp = function (error) {
            var ended = function () {
                if (error) {
                    mainDeferred.reject(error);
                    return;
                }
                mainDeferred.resolve();
            };

            if (gmeAuth) {
                gmeAuth.unload();
            }
            if (cliStorage) {
                cliStorage.closeDatabase()
                    .then(ended)
                    .catch(function (err) {
                        logger.error(err);
                        ended();
                    });
            } else {
                ended();
            }
        };

    program
        .version('0.2.0')
        .usage('<patch-file> [options]')
        .option('-m, --mongo-database-uri [url]',
        'URI of the MongoDB [by default we use the one from the configuration file]')
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]')
        .option('-p, --project-name [string]', 'project name [mandatory]')
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-t, --target [branch/commit]', 'the target where we should apply the patch [mandatory]')
        .option('-n, --no-update', 'show if we should not update the branch [by default it is false]')
        .parse(argv);

    if (program.mongoDatabaseUri) {
        // this line throws a TypeError for invalid databaseConnectionString
        MongoURI.parse(program.mongoDatabaseUri);

        gmeConfig.mongo.uri = program.mongoDatabaseUri;
    }

    if (!program.projectName) {
        logger.error('project identifier is a mandatory parameter!');
        syntaxFailure = true;
    }
    if (!program.target) {
        logger.error('target is a mandatory parameter!');
        syntaxFailure = true;
    }

    if (syntaxFailure) {
        program.outputHelp();
        mainDeferred.reject(new SyntaxError('invalid argument'));
        return mainDeferred.promise;
    }

    patchJson = JSON.parse(FS.readFileSync(program.args[0], 'utf-8'));

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var params = {
                projectId: ''
            };

            if (program.owner) {
                params.projectId = program.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            } else if (program.user) {
                params.projectId = program.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            } else {
                params.projectId = gmeConfig.authentication.guestAccount +
                    STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            }

            if (program.user) {
                params.username = program.user;
            }

            return cliStorage.openProject(params);
        })
        .then(function (project) {
            if (program.user) {
                project.setUser(program.user);
            }

            return merger.apply({
                gmeConfig: gmeConfig,
                logger: logger.fork('apply'),
                project: project,
                branchOrCommit: program.target,
                patch: patchJson,
                noUpdate: program.noUpdate || false
            });

        })
        .then(function () {
            logger.info('patch [' +
                program.args[0] + '] applied successfully to project [' + program.projectName + ']');
            finishUp(null);
        })
        .catch(finishUp);

    return mainDeferred.promise;
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv)
        .then(function () {
            console.log('Done');
            process.exit(0);
        })
        .catch(function (err) {
            console.error(err);
            process.exit(1);
        });
}

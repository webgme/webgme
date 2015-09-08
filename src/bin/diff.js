/*jshint node: true*/
/**
 * @module Bin:Diff
 * @author kecso / https://github.com/kecso
 */
'use strict';
var webgme = require('../../webgme'),
    FS = require('fs'),
    Q = require('q'),
    MongoURI = require('mongo-uri'),
    cliStorage = null,
    gmeAuth = null,
    main,
    merger = webgme.requirejs('common/core/users/merge'),
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:diff', gmeConfig.bin.log, false),
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants');


webgme.addToRequireJsPaths(gmeConfig);

main = function (argv) {
    var mainDeferred = Q.defer(),
        Command = require('commander').Command,
        program = new Command(),
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
        },
        badArgument = false;

    program
        .version('0.2.0')
        .option('-m, --mongo-database-uri [url]',
        'URI of the MongoDB [by default we use the one from the configuration file]')
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]')
        .option('-p, --project-name [string]', 'project name [mandatory]')
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-s, --source [branch/commit]', 'the source or base of the diff to be created [mandatory]')
        .option('-t, --target [branch/commit]', 'the target or end of the diff to be created [mandatory]')
        .option('-f, --output-file [path]', 'the output path of the diff [by default it is printed to the console]')
        .parse(argv);

    if (program.mongoDatabaseUri) {
        // this line throws a TypeError for invalid databaseConnectionString
        MongoURI.parse(program.mongoDatabaseUri);

        gmeConfig.mongo.uri = program.mongoDatabaseUri;
    }

    if (!program.projectName) {
        console.warn('project identifier is a mandatory parameter!');
        badArgument = true;
    }
    if (!program.source) {
        console.warn('source is a mandatory parameter!');
        badArgument = true;
    }
    if (!program.target) {
        console.warn('target is a mandatory parameter!');
        badArgument = true;
    }

    if (badArgument) {
        program.outputHelp();
        mainDeferred.reject(new SyntaxError('missing argument'));
        return mainDeferred.promise;
    }


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

            return merger.diff({
                project: project,
                gmeConfig: gmeConfig,
                logger: logger,
                branchOrCommitA: program.source,
                branchOrCommitB: program.target
            });
        })
        .then(function (diff) {
            if (program.outputFile) {
                FS.writeFileSync(program.outputFile, JSON.stringify(diff, null, 2));
            } else {
                console.log('generated diff:');
                console.log(JSON.stringify(diff, null, 2));
            }
            finishUp(null);
        })
        .catch(function (err) {
            logger.error('error during diff generation', err);
            finishUp(err);
        });
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

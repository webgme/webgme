/* jshint node:true */
/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    FS = require('fs'),
    path = require('path'),
    Q = require('q'),
    MongoURI = require('mongo-uri'),
    Project = require('../../src/server/storage/userproject'),
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
    jsonProject,
    gmeConfig = require(path.join(process.cwd(), 'config')),
    gmeAuth,
    logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
    REGEXP = webgme.REGEXP,
    Serialization = webgme.serializer,
    main;

main = function (argv) {
    var mainDeferred = Q.defer(),
        Command = require('commander').Command,
        program = new Command(),
        syntaxFailure = false,
        cliStorage,
        project,
        core,
        root,
        params,
        commitHash,
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
        .version('0.1.0')
        .usage('<project-file> [options]')
        .option('-m, --mongo-database-uri [url]',
        'URI of the MongoDB [by default we use the one from the configuration file]')
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]')
        .option('-p, --project-name [string]', 'project name [mandatory]')
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-b, --branch [branch]',
        'the branch that should be created with the imported data [by default it is the \'master\']')
        .option('-w --overwrite [boolean]', 'if a project exist it will be deleted and created again')
        .parse(argv);

    if (program.mongoDatabaseUri) {
        // this line throws a TypeError for invalid databaseConnectionString
        MongoURI.parse(program.mongoDatabaseUri);

        gmeConfig.mongo.uri = program.mongoDatabaseUri;
    }

    if (!program.projectName) {
        logger.error('project name is a mandatory parameter!');
        syntaxFailure = true;
    }

    if (syntaxFailure) {
        program.outputHelp();
        mainDeferred.reject(new SyntaxError('invalid argument'));
        return mainDeferred.promise;
    }

    program.branch = program.branch || 'master';

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;

            jsonProject = JSON.parse(FS.readFileSync(program.args[0], 'utf-8'));


            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var params = {};

            if (program.user) {
                params.username = program.user;
            }

            return cliStorage.getProjects(params);
        })
        .then(function (projects) {
            var exists = false,
                i,
                deferred = Q.defer();

            params = {
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

            for (i = 0; i < projects.length; i++) {
                if (projects[i]._id === params.projectId) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                params.projectName = program.projectName;
                return cliStorage.createProject(params);
            }

            if (program.overwrite) {
                cliStorage.deleteProject(params)
                    .then(function () {
                        params.projectName = program.projectName;
                        return cliStorage.createProject(params);
                    })
                    .then(deferred.resolve)
                    .catch(deferred.reject);

                return deferred.promise;
            }
            return cliStorage.openProject(params);

        })
        .then(function (dbProject) {
            project = new Project(dbProject, cliStorage, logger.fork('project'), gmeConfig);
            core = new webgme.core(project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });
            root = core.createNode({parent: null, base: null});


            if (program.user) {
                project.setUser(program.user);
            }

            return Q.nfcall(Serialization.import, core, root, jsonProject);
        })
        .then(function () {
            var persisted = core.persist(root);
            return project.makeCommit(null,
                [],
                persisted.rootHash,
                persisted.objects,
                'project imported by import.js CLI');
        })
        .then(function (commitResult) {
            commitHash = commitResult.hash;
            params.branchName = program.branch;
            return cliStorage.deleteBranch(params);
        })
        .then(function () {
            params.hash = commitHash;
            return cliStorage.createBranch(params);
        })
        .then(function(){
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

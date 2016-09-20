/* jshint node:true */
/**
 * @module Bin:Import
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    FS = require('fs'),
    path = require('path'),
    Q = require('q'),
    MongoURI = require('mongo-uri'),
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
    AdmZip = require('adm-zip'),
    FSBlobClient = require('../../src/server/middleware/blob/BlobClientWithFSBackend'),
    storageUtils = webgme.requirejs('common/storage/util'),
    blobUtil = webgme.requirejs('blob/util'),
    main;

function _addPackageArtifacts(blobClient, packageHash) {
    var zip = new AdmZip(),
        artifact = blobClient.createArtifact('files'),
        projectStr,
        deferred = Q.defer();

    Q.ninvoke(blobClient, 'getObject', packageHash)
        .then(function (buffer) {
            if (buffer instanceof Buffer !== true) {
                throw new Error('invalid package received');
            }

            zip = new AdmZip(buffer);
            return Q.all(zip.getEntries().map(function (entry) {
                    var entryName = entry.entryName;
                    if (entryName === 'project.json') {
                        projectStr = zip.readAsText(entry);
                    } else {
                        return Q.ninvoke(artifact, 'addFileAsSoftLink', entryName, zip.readFile(entry));
                    }
                })
            );
        })
        .then(function () {
            if (!projectStr) {
                throw new Error('given package missing project data!');
            }
            var metadata = artifact.descriptor;
            return blobUtil.addAssetsFromExportedProject(logger, blobClient, metadata);
        })
        .then(function () {
            deferred.resolve(JSON.parse(projectStr));
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function _addProjectPackageToBlob(blobClient, packagePath) {
    var deferred = Q.defer();
    blobClient.putFile(path.basename(packagePath),
        FS.readFileSync(packagePath))
        .then(function (hash) {
            return _addPackageArtifacts(blobClient, hash);
        })
        .then(deferred.resolve)
        .catch(deferred.reject);
    return deferred.promise;
}

main = function (argv) {
    var mainDeferred = Q.defer(),
        jsonProject,
        gmeAuth,
        Command = require('commander').Command,
        program = new Command(),
        syntaxFailure = false,
        cliStorage,
        project,
        params,
        commitHash,
        makeCommitParams = {commitMessage: 'loading project from package'},
        blobClient = new FSBlobClient(gmeConfig, logger.fork('BlobClient')),
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
        .version('1.7.2')
        .usage('<project-package-file> [options]')
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

            return _addProjectPackageToBlob(blobClient, program.args[0]);
        })
        .then(function (jsonProject_) {
            jsonProject = jsonProject_;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var params = {branches: true};

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
                params.ownerId = program.owner;
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
                    if (!program.overwrite && projects[i].branches.hasOwnProperty(program.branch)) {
                        makeCommitParams.branch = program.branch;
                        makeCommitParams.parentCommit = [projects[i].branches[program.branch]];
                        makeCommitParams.commitMessage = 'Updating branch\'' +
                            program.branch + '\' from project package.';
                    }
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
        .then(function (project_) {
            project = project_;

            if (program.user) {
                project.setUser(program.user);
            }

            return storageUtils.insertProjectJson(project, jsonProject, makeCommitParams);

        })
        .then(function (commitResult) {
            if (commitResult.status === STORAGE_CONSTANTS.FORKED) {
                throw new Error('File was imported into commit:\'' + commitResult.hash +
                    '\', but the branch was not updated');
            } else if (commitResult.status === null || commitResult.status === undefined) {
                // makeCommit was called without branch, so we need to create it
                params.hash = commitResult.hash;
                params.branchName = program.branch;
                return cliStorage.createBranch(params);
            }
        })
        .then(function () {
            finishUp(null);
        })
        .catch(finishUp);

    return mainDeferred.promise;
};

module.exports = {
    main: main,
    _addProjectPackageToBlob: _addProjectPackageToBlob
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

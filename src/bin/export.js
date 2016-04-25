/*jshint node: true*/
/**
 * @module Bin:Export
 * @author kecso / https://github.com/kecso
 * @author brollb / https://github.com/brollb
 */
'use strict';
var webgme = require('../../webgme'),
    FS = require('fs'),
    Q = require('q'),
    cliStorage,
    gmeAuth,
    blobClient,
    MongoURI = require('mongo-uri'),
    path = require('path'),
    gmeConfig,
    logger,
    Serialization = webgme.serializer,
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
    REGEXP = webgme.requirejs('common/regexp'),
    main,
    mainDeferred,
    runInternal,
    runRaw,
    run,
    getMissingRequiredParam,
    BlobClient = require('../../src/server/middleware/blob/BlobClientWithFSBackend'),
    storageUtils = webgme.requirejs('common/storage/util'),
    blobUtil = webgme.requirejs('common/blob/util');

/**
 * Check for missing required parameters
 *
 * @param {Object} params
 * @return {String|null} missing param
 */
getMissingRequiredParam = function (params) {
    var requiredParams = ['projectName', 'source', 'outFile'];
    for (var i = requiredParams.length; i--;) {
        if (!params[requiredParams[i]]) {
            return requiredParams[i];
        }
    }
    return null;
};

/**
 * Entrypoint for CLI usage
 *
 * @param {Array<String>} argv
 * @return {undefined}
 */
main = function (argv) {
    var Command = require('commander').Command,
        program = new Command(),
        syntaxFailure = false;

    gmeConfig = require(path.join(process.cwd(), 'config'));
    logger = webgme.Logger.create('gme:bin:export', gmeConfig.bin.log, false);
    blobClient = new BlobClient(gmeConfig, logger.fork('BlobClient'));
    webgme.addToRequireJsPaths(gmeConfig);
    mainDeferred = Q.defer();
    program
        .version('0.2.0')
        .option('-m, --mongo-database-uri [url]',
            'URI of the MongoDB [by default we use the one from the configuration file]')
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]')
        .option('-p, --project-name [string]', 'project name [mandatory]')
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-s, --source [branch/commit]', 'the branch or commit that should be exported')
        .option('-f, --out-file [path][mandatory]', 'the path of the output file')
        .option('-n, --no-assets', 'if given, no assets will be bundled into the package')
        .parse(argv);

    if (getMissingRequiredParam(program)) {
        logger.error(getMissingRequiredParam(program) + ' is a mandatory parameter!');
        syntaxFailure = true;
    }

    if (syntaxFailure) {
        program.outputHelp();
        mainDeferred.reject(new SyntaxError('invalid argument'));
        return mainDeferred.promise;
    }
    return runInternal(program);
};

/**
 * Entry point for usage as a module.
 *
 * @param {Dictionary<String,String>} params
 * @return {undefined}
 */
run = function (params) {
    var missingParam = getMissingRequiredParam(params);
    gmeConfig = params.gmeConfig;
    mainDeferred = Q.defer();

    if (missingParam) {
        logger.error(missingParam + ' is a mandatory parameter!');
    }
    logger = webgme.Logger.create('gme:bin:export', gmeConfig.bin.log, false);
    webgme.addToRequireJsPaths(gmeConfig);

    return runInternal(params);
};

runRaw = function (project, rootHash) {
    var deferred = Q.defer(),
        exportedObjects = [],
        taskQueue = [rootHash],
        loadedObjects = [],
        working = false,
        task,
        error = null,
        timerId;

    timerId = setInterval(function () {
        if (!working) {
            task = taskQueue.shift();
            if (task === undefined) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(exportedObjects);
                }
                return;
            }

            if (loadedObjects.indexOf(task) === -1) {
                working = true;
                project.loadObject(task, function (err, object) {
                    loadedObjects.push(task);
                    var keys,
                        i;
                    error = error || err;
                    if (object) {
                        exportedObjects.push(object);
                        //now put every sub-object on top of the queue
                        keys = Object.keys(object);
                        for (i = 0; i < keys.length; i += 1) {
                            if (typeof object[keys[i]] === 'string' &&
                                REGEXP.HASH.test(object[keys[i]]) &&
                                loadedObjects.indexOf(object[keys[i]]) === -1) {
                                taskQueue.push(object[keys[i]]);
                            }
                        }
                    }
                    working = false;
                });
            }

        }
    }, 10);

    return deferred.promise;
};

runInternal = function (params) {
    var finishUp = function (error) {
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

    if (params.mongoDatabaseUri) {
        // this line throws a TypeError for invalid databaseConnectionString
        MongoURI.parse(params.mongoDatabaseUri);

        gmeConfig.mongo.uri = params.mongoDatabaseUri;
    }

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var projectParams = {
                projectId: ''
            };

            if (params.owner) {
                projectParams.projectId = params.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + params.projectName;
            } else if (params.user) {
                projectParams.projectId = params.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + params.projectName;
            } else {
                projectParams.projectId = gmeConfig.authentication.guestAccount +
                    STORAGE_CONSTANTS.PROJECT_ID_SEP + params.projectName;
            }

            if (params.user) {
                projectParams.username = params.user;
            }

            return cliStorage.openProject(projectParams);
        })
        .then(function (project) {
            var projectParams = {};

            if (REGEXP.HASH.test(params.source)) {
                projectParams.commitHash = params.source;
            } else if (REGEXP.BRANCH.test(params.source)) {
                projectParams.branchName = params.source;
            }

            if (params.user) {
                project.setUser(params.user);
            }

            return storageUtils.getProjectJson(project, projectParams);
        })
        .then(function (jsonExport) {
            return Q.ninvoke(blobUtil,'buildProjectPackage',logger, blobClient, jsonExport, params.noAssets !== true);
        })
        .then(function(blobHash){
            return blobClient.getObject(blobHash);
        })
        .then(function (buffer) {
            FS.writeFileSync(params.outFile, buffer);
            finishUp(null);
        })
        .catch(finishUp);

    return mainDeferred.promise;
};

module.exports = {
    main: main,
    run: run
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

/* jshint node:true */
/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    program = require('commander'),
    FS = require('fs'),
    path = require('path'),
    Project = require('../../src/server/storage/userproject'),

    jsonProject,
    gmeConfig = require(path.join(process.cwd(), 'config')),
    gmeAuth,
    project,
    logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
    REGEXP = webgme.REGEXP,
    openContext = webgme.openContext,
    Serialization = webgme.serializer,

    importProject = function (storage, _gmeConfig, projectId, jsonProject, branchName, overwrite, userName, callback) {
        var project,
            core,
            username = userName || _gmeConfig.authentication.guestAccount,
            closeContext = function (error, data) {
                storage.closeDatabase(function () {
                    callback(error, data);
                });
            };


        branchName = branchName || 'master';

        storage.openDatabase()
            .then(function () {
                return storage.getProjectNames({username: username});
            })
            .then(function (names) {
                if (names.indexOf(projectId) !== -1) {
                    if (!overwrite) {
                        closeContext(new Error('project already exists'));
                        return;
                    }
                    return storage.openProject({username: username, projectId: projectId});
                }
                return storage.createProject({username: username, projectId: projectId});
            })
            .then(function (dbProject) {
                project = new Project(dbProject, storage, logger, gmeConfig);
                project.setUser(username);
                return storage.getBranchHash({
                    username: username,
                    projectId: projectId,
                    branchName: branchName
                });
            })
            .then(function (commitHash) {
                //we do not need the commit hash - we start by creating an empty root object,
                // then calling the serializer
                var persisted,
                    root;

                core = new webgme.core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });

                root = core.createNode({parent: null, base: null});
                Serialization.import(core, root, jsonProject, function (err) {
                    if (err) {
                        closeContext(err);
                        return;
                    }
                    persisted = core.persist(root);
                    project.makeCommit(null,
                        [],
                        persisted.rootHash,
                        persisted.objects,
                        'project imported by import.js CLI',
                        function (err, commitResult) {
                            if (err) {
                                logger.error('project.makeCommit failed.');
                                closeContext(err, null);
                                return;
                            }
                            storage.setBranchHash({
                                    username: username,
                                    branchName: branchName,
                                    projectId: projectId,
                                    oldHash: commitHash,
                                    newHash: commitResult.hash
                                }, function (err, updateResult) {
                                    if (err) {
                                        logger.error('setBranchHash failed with error.');
                                        closeContext('project imported to commit: ' + commitHash + ', but branch "' +
                                            branchName + '" could not be updated.', commitHash);
                                        return;
                                    }
                                    logger.info('import was done to branch [' + branchName + ']');
                                    closeContext(null, {commitHash: commitResult.hash, storage: storage});
                                }
                            );
                        }
                    );
                });
            })
            .catch(function (err) {
                closeContext(err, null);
            });

        /*openContext(storage, _gmeConfig, logger, contextParams, function (err, context) {
         if (err) {
         callback(err);
         return;
         }
         project = context.project;
         Serialization.import(context.core, context.rootNode, jsonProject, function (err) {
         if (err) {
         closeContext(err);
         return;
         }
         context.core.persist(context.rootNode, function () {
         project.makeCommit([], context.core.getHash(context.rootNode), 'project imported by import.js CLI',
         function (err, commitHash) {
         project.getBranchHash(branchName, '#hack', function (err, oldBranchHash) {
         if (err) {
         closeContext('project imported to commit: ' + commitHash + ', but branch "' +
         branchName + '" could not be updated.', commitHash);
         return;
         }
         project.setBranchHash(branchName, oldBranchHash, commitHash, function (err) {
         if (err) {
         closeContext('project imported to commit: ' + commitHash + ', but branch "' +
         branchName + '" could not be updated.', commitHash);
         return;
         }
         closeContext(null, {commitHash: commitHash, storage: storage});
         });
         });
         }
         );
         });

         });
         });*/
    };

module.exports.import = importProject;

if (require.main === module) {
    program
        .version('0.1.0')
        .usage('<project-file> [options]')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-u, --user [string]', 'the user of the command')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-b, --branch [branch]', 'the branch that should be created with the imported data')
        .option('-o --overwrite [boolean]', 'if a project exist it will be deleted and created again')
        .parse(process.argv);
//check necessary arguments

    if (!program.projectIdentifier) {
        logger.error('project identifier is a mandatory parameter!');
        program.help();
    }
    if (program.branch && !REGEXP.BRANCH.test(program.branch)) {
        logger.error(program.branch + ' is not a valid branch name!');
        program.help();
    }

    if (!program.branch) {
        logger.warn('branch is not given, master will be used');
    }

    // command line argument has precedence
    gmeConfig.mongo.uri = program.mongoDatabaseUri || gmeConfig.mongo.uri;
    //loading the project file and seeing if it is a valid JSON object
    try {
        jsonProject = JSON.parse(FS.readFileSync(program.args[0], 'utf-8'));
    } catch (err) {
        logger.error('unable to load project file: ', err);
        process.exit(1);
    }

    webgme.addToRequireJsPaths(gmeConfig);


    //calling the import function

    webgme.getGmeAuth(gmeConfig, function (err, gmeAuth) {
        if (err) {
            logger.error('unable to connect authentication service');
            process.exit(1);
        } else {
            var myStorage = webgme.getStorage(logger, gmeConfig, gmeAuth);
            importProject(myStorage, gmeConfig, program.projectIdentifier, jsonProject,
                program.branch, program.overwrite, program.user,
                function (err, data) {
                    if (err) {
                        logger.error('error during project import: ', err);
                        process.exit(0);
                    } else {
                        logger.info('branch "' + program.branch + '" of project "' + program.projectIdentifier +
                            '" have been successfully imported at commitHash: ' + data.commitHash + '.');
                        process.exit(0);
                    }
                }
            );
        }
    });
}
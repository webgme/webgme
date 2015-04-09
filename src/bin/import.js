/*globals requireJS*/
/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    program = require('commander'),
    FS = require('fs'),
    path = require('path'),
    openContext,
    Serialization,
    jsonProject,
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
    REGEXP = webgme.REGEXP,
    openContext = webgme.openContext,
    Serialization = webgme.serializer;


var importProject = function (Storage, _gmeConfig, projectId, jsonProject, branchName, overwrite, callback) {
    var storage,
        project,
        contextParams,
        closeContext = function (error, data) {
            try {
                project.closeProject(function () {
                    storage.closeDatabase(function () {
                        callback(error, data);
                    });
                });
            } catch (err) {
                storage.closeDatabase(function () {
                    callback(error, data);
                });
            }
        };


    storage = new Storage({globConf: _gmeConfig, logger: logger.fork('storage')});
    branchName = branchName || 'master';

    contextParams = {
        projectName: projectId,
        createProject: true,
        overwriteProject: overwrite,
        branchName: branchName
    };

    openContext(storage, _gmeConfig, contextParams, function (err, context) {
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
    });
};

module.exports.import = importProject;

if (require.main === module) {
    program
        .version('0.1.0')
        .usage('<project-file> [options]')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
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

    importProject(webgme.serverUserStorage, gmeConfig, program.projectIdentifier, jsonProject,
        program.branch, program.overwrite,
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
/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var requirejs = require('requirejs'),
    program = require('commander'),
    BRANCH_REGEXP = new RegExp('^[0-9a-zA-Z_]*$'),
    FS = require('fs'),
    openContext,
    Storage,
    Serialization,
    jsonProject,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    webgme = require('../../webgme');

webgme.addToRequireJsPaths(gmeConfig);


openContext = requirejs('common/util/opencontext');
Storage = requirejs('storage/serveruserstorage');
Serialization = requirejs('coreclient/serialization');

var importProject = function (mongoUri, projectId, jsonProject, branchName, callback) {
    'use strict';
    var storage,
        project,
        contextParams,
        silentLog = {
            debug: function () {
            },
            error: function () {
            }
        },
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

    gmeConfig.mongo.uri = mongoUri || gmeConfig.mongo.uri;
    storage = new Storage({globConf: gmeConfig, log: silentLog});
    branchName = branchName || 'master';

    contextParams = {
        projectName: projectId,
        overwriteProject: true
    };

    openContext(storage, gmeConfig, contextParams, function (err, context) {
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
                                closeContext(null, commitHash);
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
        .parse(process.argv);
//check necessary arguments
    if (program.args.length !== 1) {
        console.warn('wrong parameters');
        program.help();
    }

    //if (!program.mongoDatabaseUri) {
    //    console.warn('mongoDB URL is a mandatory parameter!');
    //    process.exit(1);
    //}
    if (!program.projectIdentifier) {
        console.warn('project identifier is a mandatory parameter!');
        process.exit(1);
    }
    if (program.branch && !BRANCH_REGEXP.test(program.branch)) {
        console.warn(program.branch + ' is not a valid branch name!');
        process.exit(1);
    }

    if (!program.branch) {
        console.log('branch is not given, master will be used');
    }

    //loading the project file and seeing if it is a valid JSON object
    try {
        jsonProject = JSON.parse(FS.readFileSync(program.args[0], 'utf-8'));
    } catch (err) {
        console.warn('unable to load project file: ', err);
        process.exit(0);
    }
    //calling the import function
    importProject(program.mongoDatabaseUri, program.projectIdentifier, jsonProject, program.branch,
        function (err, commitHash) {
            'use strict';
            if (err) {
                console.warn('error during project import: ', err);
            } else {
                console.warn('branch "' + program.branch + '" of project "' + program.projectIdentifier +
                    '" have been successfully imported at commitHash: ' + commitHash + '.');
            }
            process.exit(0);
        }
    );
}
/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var webgme = require('../../webgme'),
    program = require('commander'),
    FS = require('fs'),
    Storage,
    patchJson,
    openContext,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:apply', gmeConfig.bin.log, false);

webgme.addToRequireJsPaths(gmeConfig);

Storage = webgme.serverUserStorage;
openContext = webgme.openContext;

var applyPatch = function (mongoUri, projectId, branchOrCommit, patch, noUpdate, callback) {
    'use strict';
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

    gmeConfig.mongo.uri = mongoUri || gmeConfig.mongo.uri;

    storage = new Storage({globConf: gmeConfig, logger: logger.fork('storage')});

    contextParams = {
        projectName: projectId,
        branchOrCommit: branchOrCommit
    };

    openContext(storage, gmeConfig, contextParams, function (err, context) {
        if (err) {
            callback(err);
            return;
        }
        project = context.project;
        context.core.applyTreeDiff(context.rootNode, patch, function (err) {
            if (err) {
                closeContext(err);
                return;
            }
            context.core.persist(context.rootNode, function (err) {
                if (err) {
                    closeContext(err);
                    return;
                }
                project.makeCommit([context.commitHash], context.core.getHash(context.rootNode), 'CLI patch applied',
                    function (err, newCommitHash) {
                        if (err) {
                            closeContext(err);
                            return;
                        }
                        if (noUpdate || contextParams.commitHash) {
                            closeContext(null, newCommitHash);
                            return;
                        }

                        project.setBranchHash(context.branchName, context.commitHash, newCommitHash,
                            function (err) {
                                closeContext(err, newCommitHash);
                                return;
                            }
                        );
                    }
                );
            });
        });
    });
};

module.exports.applyPatch = applyPatch;

if (require.main === module) {

    program
        .version('0.1.0')
        .usage('<patch-file> [options]')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-t, --target [branch/commit]', 'the target where we should apply the patch')
        .option('-n, --no-update', 'show if we should not update the branch')
        .parse(process.argv);
//check necessary arguments

    if (!program.projectIdentifier) {
        logger.error('project identifier is a mandatory parameter!');
        program.help();
    }
    if (!program.target) {
        logger.error('target is a mandatory parameter!');
        program.help();
    }

    //load path file
    try {
        patchJson = JSON.parse(FS.readFileSync(program.args[0], 'utf-8'));
    } catch (err) {
        logger.error('unable to load patch file: ', err);
        process.exit(1);
    }

    applyPatch(program.mongoDatabaseUri, program.projectIdentifier, program.target, patchJson, program.noUpdate,
        function (err) {
            'use strict';
            if (err) {
                logger.error('there was an error during the application of the patch: ', err);
            } else {
                logger.info('patch applied successfully to project \'' + program.projectIdentifier + '\'');
            }
            process.exit(0);
        }
    );
}
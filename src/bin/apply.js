/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    program = require('commander'),
    FS = require('fs'),
    cliStorage,
    gmeAuth,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:apply', gmeConfig.bin.log, false),
    openContext = webgme.openContext,
    patchJson;

webgme.addToRequireJsPaths(gmeConfig);

var applyPatch = function (storage, projectId, branchOrCommit, patch, noUpdate, userName, callback) {
    var project,
        contextParams,
        closeContext = function (error, data) {
            storage.closeDatabase(function () {
                callback(error, data);
            });
        };


    contextParams = {
        projectName: projectId,
        branchOrCommit: branchOrCommit
    };

    if (userName) {
        contextParams.userName = userName;
    }

    openContext(storage, gmeConfig, logger, contextParams, function (err, context) {
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
            var persisted = context.core.persist(context.rootNode);

            if (!persisted.objects) {
                logger.warn('empty patch was inserted - not making commit');
                closeContext(null, context.commitHash);
                return;
            }

            context.project.makeCommit(null,
                [context.commitHash],
                context.core.getHash(context.rootNode),
                persisted.objects,
                'CLI patch applied',
                function (err, commitResult) {
                    var setParams = {
                        branchName: context.branchName,
                        projectName: projectId,
                        oldHash: context.commitHash
                    };
                    if (err) {
                        logger.error('project.makeCommit failed.');
                        closeContext(err);
                        return;
                    }

                    if (noUpdate || !contextParams.branchName) {
                        closeContext(null, commitResult.hash);
                        return;
                    }
                    setParams.newHash = commitResult.hash;

                    if (userName) {
                        setParams.username = userName;
                    }
                    storage.setBranchHash(setParams, function (err, updateResult) {
                            closeContext(err, commitResult.hash);
                            return;
                        }
                    );
                }
            );

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
        .option('-u, --user [string]', 'the user of the command')
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

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            applyPatch(program.mongoDatabaseUri,
                program.projectIdentifier, program.target, patchJson, program.noUpdate, program.user,
                function (err) {
                    if (err) {
                        logger.error('there was an error during the application of the patch: ', err);
                    } else {
                        logger.info('patch applied successfully to project \'' + program.projectIdentifier + '\'');
                    }
                    process.exit(0);
                }
            );
        })
        .catch(function (err) {
            logger.error(err);
            process.exit(1);
        });
}
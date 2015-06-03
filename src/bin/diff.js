/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var webgme = require('../../webgme'),
    program = require('commander'),
    FS = require('fs'),
    cliStorage,
    gmeAuth,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:diff', gmeConfig.bin.log, false),
    REGEXP = webgme.REGEXP,
    openContext = webgme.openContext;


webgme.addToRequireJsPaths(gmeConfig);


var generateDiff = function (storage, projectId, sourceBranchOrCommit, targetBranchOrCommit, userName, callback) {
    'use strict';
    var project,
        core,
        contextParams,
        closeContext = function (error, data) {
            /*try {
             project.closeProject(function () {
             storage.closeDatabase(function () {
             callback(error, data);
             });
             });
             } catch (err) {
             storage.closeDatabase(function () {
             callback(error, data);
             });
             }*/
            storage.closeDatabase(function () {
                callback(error, data);
            });
        },
        getRoot = function (branchOrCommit, next) {
            var getFromCommitHash = function (cHash) {
                project.loadObject(cHash, function (err, cObj) {
                    if (err) {
                        next(err);
                        return;
                    }
                    core.loadRoot(cObj.root, next);
                });
            };
            if (REGEXP.HASH.test(branchOrCommit)) {
                getFromCommitHash(branchOrCommit);
            } else if (REGEXP.BRANCH.test(branchOrCommit)) {
                project.getBranchHash(branchOrCommit, function (err, commitHash) {
                    if (err) {
                        next(err);
                        return;
                    }
                    getFromCommitHash(commitHash);
                });
            } else {
                next(new Error('nor commit nor branch input'));
            }
        };

    contextParams = {
        projectName: projectId,
        branchOrCommit: sourceBranchOrCommit
    };

    if (userName) {
        contextParams.username = userName;
    }

    openContext(storage, gmeConfig, logger, contextParams, function (err, context) {
        var srcRoot,
            targetRoot;
        if (err) {
            callback(err);
            return;
        }
        project = context.project;
        core = context.core;
        srcRoot = context.rootNode;

        getRoot(targetBranchOrCommit, function (err, root) {
            if (err) {
                closeContext(err);
                return;
            }
            targetRoot = root;
            core.generateTreeDiff(srcRoot, targetRoot, closeContext);
        });
    });
};

module.exports.generateDiff = generateDiff;

if (require.main === module) {
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-u, --user [string]', 'the user of the command')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-s, --source [branch/commit]', 'the source or base of the diff to be created')
        .option('-t, --target [branch/commit]', 'the target or end of the diff to be created')
        .option('-o, --out [path]', 'the output path of the diff [by default it is printed to the console]')
        .parse(process.argv);

    if (!program.projectIdentifier) {
        console.warn('project identifier is a mandatory parameter!');
        program.help();
    }
    if (!program.source) {
        console.warn('source is a mandatory parameter!');
        program.help();
    }
    if (!program.target) {
        console.warn('target is a mandatory parameter!');
        program.help();
    }

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            generateDiff(cliStorage, program.projectIdentifier, program.source, program.target, program.user,
                function (err, diff) {
                    'use strict';
                    if (err) {
                        console.warn('diff generation finished with error: ', err);
                        process.exit(0);
                    }
                    if (program.out) {
                        try {
                            FS.writeFileSync(program.out, JSON.stringify(diff, null, 2));
                        } catch (err) {
                            console.warn('unable to create output file:', err);
                        }
                    } else {
                        console.log('generated diff:');
                        console.log(JSON.stringify(diff, null, 2));
                    }
                    process.exit(0);
                }
            );
        })
        .catch(function (err) {
            logger.error('error during diff generation', err);
            if (cliStorage) {
                cliStorage.closeDatabase()
                    .then(function () {
                        process.exit(1);
                    });
            } else {
                process.exit(1);
            }
        });
}

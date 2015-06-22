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
    logger = webgme.Logger.create('gme:bin:export', gmeConfig.bin.log, false),
    REGEXP = webgme.REGEXP,
    openContext = webgme.openContext,
    Serialization = webgme.serializer;


webgme.addToRequireJsPaths(gmeConfig);

var exportProject = function (storage, projectId, branchOrCommit, userName, callback) {
    var project,
        contextParams,
        closeContext = function (error, data) {
            storage.closeDatabase(function () {
                callback(error, data);
            });
        };


    contextParams = {
        projectId: projectId,
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
        Serialization.export(context.core, context.rootNode, closeContext);
    });
};

module.exports.export = exportProject;

if (require.main === module) {
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-u, --user [string]', 'the user of the command')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-s, --source [branch/commit]', 'the branch or commit that should be exported')
        .option('-o, --out [path]', 'the path of the output file')
        .parse(process.argv);
//check necessary arguments

    if (!program.projectIdentifier) {
        console.warn('project identifier is a mandatory parameter!');
        program.help();
    }

    if (!program.source) {
        console.warn('source is a mandatory parameter!');
        program.help();
    }
    if (!REGEXP.BRANCH.test(program.source) && !REGEXP.HASH.test(program.source)) {
        console.warn('source format is invalid!');
        program.help();
    }

    // command line argument has precedence
    gmeConfig.mongo.uri = program.mongoDatabaseUri || gmeConfig.mongo.uri;

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            //calling the export function
            exportProject(cliStorage, program.projectIdentifier, program.source, program.user,
                function (err, jsonProject) {
                    if (err) {
                        console.error('error during project export: ', err);
                        process.exit(1);
                    } else {
                        if (program.out) {
                            try {
                                FS.writeFileSync(program.out, JSON.stringify(jsonProject, null, 2));
                                console.log('project \'' + program.projectIdentifier +
                                    '\' hase been successfully written to \'' + program.out + '\'');
                                process.exit(0);
                            } catch (err) {
                                console.error('failed to create output file: ' + err);
                                process.exit(1);
                            }
                        } else {
                            console.log('project \'' + program.projectIdentifier + '\':');
                            console.log(JSON.stringify(jsonProject, null, 2));
                            process.exit(0);
                        }
                    }

                }
            );
        })
        .catch(function (err) {
            console.error('error during project export: ', err);
            process.exit(1);
        });
}
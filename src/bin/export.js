/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var webgme = require('../../webgme'),
    program = require('commander'),
    BRANCH_REGEXP = new RegExp('^[0-9a-zA-Z_]*$'),
    HASH_REGEXP = new RegExp('^#[0-9a-zA-Z_]*$'),
    FS = require('fs'),
    openContext,
    Storage,
    Serialization,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:apply', gmeConfig.bin.log, false);


webgme.addToRequireJsPaths(gmeConfig);

openContext = webgme.openContext;
Storage = webgme.serverUserStorage;
Serialization = webgme.serializer;

var exportProject = function (mongoUri, projectId, branchOrCommit, callback) {
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
    storage = new Storage({globConf: gmeConfig, log: logger.fork('storage')});

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
        Serialization.export(context.core, context.rootNode, closeContext);
    });
};

module.exports.export = exportProject;

if (require.main === module) {
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
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
    if (!BRANCH_REGEXP.test(program.source) && !HASH_REGEXP.test(program.source)) {
        console.warn('source format is invalid!');
        program.help();
    }

    //calling the export function
    exportProject(program.mongoDatabaseUri, program.projectIdentifier, program.source,
        function (err, jsonProject) {
            'use strict';
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
}
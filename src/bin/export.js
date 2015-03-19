/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var requirejs = require('requirejs'),
    program = require('commander'),
    BRANCH_REGEXP = new RegExp('^[0-9a-zA-Z_]*$'),
    HASH_REGEXP = new RegExp('^#[0-9a-zA-Z_]*$'),
    FS = require('fs'),
    openContext,
    Storage,
    Serialization,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    webgme = require('../../webgme');

webgme.addToRequireJsPaths(gmeConfig);

openContext = requirejs('common/util/opencontext');
Storage = requirejs('storage/serveruserstorage');
Serialization = requirejs('coreclient/serialization');

var exportProject = function (mongoUri, projectId, branchOrCommit, callback) {
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

    if (!program.mongoDatabaseUri) {
        console.warn('mongoDB URL is a mandatory parameter!');
        process.exit(0);
    }
    if (!program.projectIdentifier) {
        console.warn('project identifier is a mandatory parameter!');
        process.exit(0);
    }

    if (!program.source) {
        console.warn('source is a mandatory parameter!');
        process.exit(0);
    }
    if (!BRANCH_REGEXP.test(program.source) && !HASH_REGEXP.test(program.source)) {
        console.warn('source format is invalid!');
        process.exit(0);
    }

    //calling the export function
    exportProject(program.mongoDatabaseUri, program.projectIdentifier, program.source, function (err, jsonProject) {
        if (err) {
            console.warn('error during project export: ', err);
        } else {
            if (program.out) {
                try {
                    FS.writeFileSync(program.out, JSON.stringify(jsonProject, null, 2));
                    console.warn('project \'' + program.projectIdentifier + '\' hase been successfully written to \'' + program.out + '\'');
                } catch (err) {
                    console.warn('failed to create output file: ' + err);
                }
            } else {
                console.warn('project \'' + program.projectIdentifier + '\':');
                console.warn(JSON.stringify(jsonProject, null, 2));
            }
        }
        process.exit(0);
    });
}
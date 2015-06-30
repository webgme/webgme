/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */
'use strict';
var webgme = require('../../webgme'),
    FS = require('fs'),
    Q = require('q'),
    cliStorage,
    Project = require('../../src/server/storage/userproject'),
    gmeAuth,
    getRoot = webgme.requirejs('common/core/users/getroot'),
    MongoURI = require('mongo-uri'),
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:export', gmeConfig.bin.log, false),
    Serialization = webgme.serializer,
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
    main;


webgme.addToRequireJsPaths(gmeConfig);

main = function (argv) {
    var mainDeferred = Q.defer(),
        Command = require('commander').Command,
        program = new Command(),
        syntaxFailure = false,
        project,
        core,
        finishUp = function (error) {
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

    program
        .version('0.2.0')
        .option('-m, --mongo-database-uri [url]',
        'URI of the MongoDB [by default we use the one from the configuration file]')
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]')
        .option('-p, --project-name [string]', 'project name [mandatory]')
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-s, --source [branch/commit]', 'the branch or commit that should be exported')
        .option('-f, --out-file [path]', 'the path of the output file')
        .parse(argv);

    if (program.mongoDatabaseUri) {
        // this line throws a TypeError for invalid databaseConnectionString
        MongoURI.parse(program.mongoDatabaseUri);

        gmeConfig.mongo.uri = program.mongoDatabaseUri;
    }

    if (!program.projectName) {
        logger.error('project name is a mandatory parameter!');
        syntaxFailure = true;
    }
    if (!program.source) {
        logger.error('source is a mandatory parameter!');
        syntaxFailure = true;
    }

    if (syntaxFailure) {
        program.outputHelp();
        mainDeferred.reject(new SyntaxError('invalid argument'));
        return mainDeferred.promise;
    }

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var params = {
                projectId: ''
            };

            if (program.owner) {
                params.projectId = program.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            } else if (program.user) {
                params.projectId = program.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            } else {
                params.projectId = gmeConfig.authentication.guestAccount +
                    STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            }

            if (program.user) {
                params.username = program.user;
            }

            return cliStorage.openProject(params);
        })
        .then(function (dbProject) {
            project = new Project(dbProject, cliStorage, logger.fork('project'), gmeConfig);
            core = new webgme.core(project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });

            if (program.user) {
                project.setUser(program.user);
            }

            return getRoot({project: project, core: core, id: program.source});
        })
        .then(function (result) {
            return Q.nfcall(Serialization.export, core, result.root);
        })
        .then(function (jsonExport) {
            if (program.outFile) {
                FS.writeFileSync(program.outFile, JSON.stringify(jsonExport, null, 2));
            } else {
                console.log('project \'' + program.projectName + '\':');
                console.log(JSON.stringify(jsonExport, null, 2));
            }
            finishUp(null);
        })
        .catch(finishUp);


    return mainDeferred.promise;
};

module.exports = {
    main: main
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
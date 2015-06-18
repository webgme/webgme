/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var Q = require('q'),
    webgme = require('../../webgme'),
    FS = require('fs'),
    path = require('path'),
    MongoURI = require('mongo-uri'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    Project = require('../../src/server/storage/userproject'),
    merger = webgme.requirejs('common/core/users/merge'),
    cliStorage,
    gmeAuth,
    logger = webgme.Logger.create('gme:bin:merge', gmeConfig.bin.log);


var main = function (argv) {
    'use strict';
    var Command = require('commander').Command,
        program = new Command(),
        mainDeferred = Q.defer(),
        syntaxFailure = false;

    logger.debug(argv);
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [uri]', 'URI to connect to mongoDB where the project is stored')
        .option('-u, --user [string]', 'the user of the command')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-M, --mine [branch/commit]', 'my version of the project')
        .option('-T, --theirs [branch/commit]', 'their version of the project')
        .option('-P, --path-prefix [value]', 'path prefix for the output diff files')
        .option('-a, --auto-merge', 'if given then we try to automatically merge into their branch/commit')
        .parse(argv);

    //check necessary arguments
    if (program.mongoDatabaseUri) {
        // this line throws a TypeError for invalid databaseConnectionString
        MongoURI.parse(program.mongoDatabaseUri);

        gmeConfig.mongo.uri = program.mongoDatabaseUri;
    }

    if (program.hasOwnProperty('projectIdentifier') === false) {
        logger.error('project identifier is a mandatory parameter!');
        syntaxFailure = true;
    }

    if (program.hasOwnProperty('mine') === false) {
        logger.error('my branch/commit parameter is mandatory!');
        syntaxFailure = true;
    }

    if (program.hasOwnProperty('theirs') === false) {
        logger.error('their branch/commit parameter is mandatory!');
        syntaxFailure = true;
    }

    if (syntaxFailure) {
        program.outputHelp();
        mainDeferred.reject(new SyntaxError('invalid parameter'));
        return mainDeferred.promise;
    }

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var openProjectData = {
                projectName: program.projectIdentifier
            };
            if (program.user) {
                openProjectData.username = program.user;
            }
            return cliStorage.openProject(openProjectData);
        })
        .then(function (dbProject) {
            var project = new Project(dbProject, cliStorage, logger.fork('project'), gmeConfig);
            if (program.user) {
                project.setUser(program.user);
            }

            return merger.merge({
                project: project,
                gmeConfig: gmeConfig,
                logger: logger,
                myBranchOrCommit: program.mine,
                theirBranchOrCommit: program.theirs,
                auto: program.autoMerge
            });
        })
        .then(function (mergeResult) {
            if (program.pathPrefix) {
                if (mergeResult.diff) {
                    FS.writeFileSync(
                        program.pathPrefix + '.mine.json', JSON.stringify(mergeResult.diff.mine || {}, null, 2));
                    FS.writeFileSync(
                        program.pathPrefix + '.theirs.json', JSON.stringify(mergeResult.diff.theirs || {}, null, 2));
                }
                if (mergeResult.conflict) {
                    FS.writeFileSync(
                        program.pathPrefix + '.conflict.json', JSON.stringify(mergeResult.conflict, null, 2));
                }
            } else {
                console.log('merge result:');
                console.log(JSON.stringify(mergeResult, null, 2));
            }
            mainDeferred.resolve();
        })
        .catch(mainDeferred.reject);
    return mainDeferred.promise;
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv)
        .then(function () {
            'use strict';
            logger.info('Done');
            process.exit(0);
        })
        .catch(function (err) {
            'use strict';
            logger.error('ERROR : ' + err);
            process.exit(1);
        });
}

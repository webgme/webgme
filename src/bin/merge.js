/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var Q = require('q'),
    webgme = require('../../webgme'),
    FS = require('fs'),
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    Project = require('../../src/server/storage/userproject'),

    merger = webgme.requirejs('common/core/users/merge'),

    Core = webgme.core,
    cliStorage,
    gmeAuth,
    logger = webgme.Logger.create('gme:bin:merge', gmeConfig.bin.log),
    REGEXP = webgme.REGEXP;


var main = function (argv) {
        'use strict';
        var Command = require('commander').Command,
            program = new Command(),
            mainDeferred = Q.defer();

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
        if (!program.mongoDatabaseUri && !gmeConfig.mongo.uri) {
            logger.error('there is no preconfigured mongoDb commection so the mongo-database-uri' +
                'parameter is mandatory');
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('invalid mongo database connection parameter'));
            return mainDeferred.promise;
        }
        if (!program.projectIdentifier) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('project identifier is a mandatory parameter!'));
            return mainDeferred.promise;
        }
        if (!program.mine) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('my branch/commit parameter is mandatory!'));
            return mainDeferred.promise;
        } else if (!(REGEXP.HASH.test(program.mine) || REGEXP.BRANCH.test(program.mine))) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('invalid \'mine\' parameter!'));
            return mainDeferred.promise;
        }
        if (!program.theirs) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('their branch/commit parameter is mandatory!'));
            return mainDeferred.promise;
        } else if (!(REGEXP.HASH.test(program.theirs) || REGEXP.BRANCH.test(program.theirs))) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('invalid \'theirs\' parameter!'));
            return mainDeferred.promise;
        }

        /*webgme.getGmeAuth(gmeConfig)
         .then(function (gmeAuth__) {
         gmeAuth = gmeAuth__;
         cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
         return cliStorage.openDatabase();
         })
         .then(function () {
         merge(cliStorage,
         program.projectIdentifier, program.mine, program.theirs, program.autoMerge, program.user,
         function (err, result) {
         if (err) {
         logger.warn('merging failed: ', err);
         }
         //it is possible that we have enough stuff to still print some results to the screen or to some file
         if (result.updatedBranch) {
         logger.info('branch [' + result.updatedBranch +
         '] was successfully updated with the merged result');
         } else if (result.finalCommitHash) {
         logger.info('merge was successfully saved to commit [' +
         result.finalCommitHash + ']');
         } else if (result.baseCommitHash && result.diff.mine && result.diff.theirs) {
         logger.info('to finish merge you have to apply your changes to commit[' +
         result.baseCommitHash + ']');
         }

         if (program.pathPrefix) {
         if (result.diff.mine && result.diff.theirs) {
         FS.writeFileSync(program.pathPrefix + '.mine',
         JSON.stringify(result.diff.mine, null, 2));
         FS.writeFileSync(program.pathPrefix + '.theirs',
         JSON.stringify(result.diff.theirs, null, 2));
         if (result.conflict) {
         FS.writeFileSync(program.pathPrefix + '.conflict',
         JSON.stringify(result.conflict, null, 2));
         }
         }
         } else if (!result.updatedBranch && !result.finalCommitHash) {
         // If there were no prefix given we put anything to console only if the merge failed
         // at some point or was not even tried.
         if (result.diff.mine && result.diff.theirs) {
         logger.debug('diff base->mine:');
         logger.debug(JSON.stringify(result.diff.mine, null, 2));
         logger.debug('diff base->theirs:');
         logger.debug(JSON.stringify(result.diff.theirs, null, 2));
         if (result.conflict) {
         logger.warn('conflict object:');
         logger.warn(JSON.stringify(result.conflict, null, 2));
         }
         }
         }
         mainDeferred.resolve();
         }
         );
         })
         .catch(function (err) {
         mainDeferred.reject(err);
         return mainDeferred.promise;
         });*/
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
            .then(function(mergeResult){
                console.log('result',mergeResult);
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

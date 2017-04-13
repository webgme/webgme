/*globals console*/
/*jshint node: true*/

/**
 * Script for listing, adding and removing webhooks in projects.
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    path = require('path'),
    fs = require('fs'),
    Q = require('q'),
    MongoURI = require('mongo-uri'),
    GMEAuth = require('../server/middleware/auth/gmeauth'),
    CONSTANTS = webgme.requirejs('common/Constants'),
    gmeConfig = require(path.join(process.cwd(), 'config'));

function main(argv) {
    var Command = require('commander').Command,
        deferred = Q.defer(),
        program = new Command(),
        gmeAuth,
        args = Array.prototype.slice.call(argv);

    if (args.length === 2) {
        args.push('--help');
    }

    function getMetadataStorageAndProjectId(mongoUri, projectName, ownerId) {
        var authDeferred = Q.defer();

        if (mongoUri) {
            // this line throws a TypeError for invalid databaseConnectionString
            try {
                MongoURI.parse(mongoUri);
            } catch (e) {
                authDeferred.reject(e);
                return authDeferred.promise;
            }

            gmeConfig.mongo.uri = mongoUri;
        }

        ownerId = ownerId || gmeConfig.authentication.guestAccount;

        gmeAuth = new GMEAuth(null, gmeConfig);
        gmeAuth.connect()
            .then(function () {
                if (!projectName) {
                    throw new Error('projectName not provided!');
                }

                return {
                    store: gmeAuth.metadataStorage,
                    projectId: ownerId + CONSTANTS.STORAGE.PROJECT_ID_SEP + projectName
                };
            })
            .catch(authDeferred.reject);

        return authDeferred.promise;
    }

    function list(val) {
        if (val) {
            return val === 'all' ? val : val.split(',');
        } else {
            return [];
        }
    }

    program
        .version('2.12.0')
        .option('-o, --owner [string]', 'owner of the project [by default, the guest account is the owner]')
        .option('-m, --mongo-database-uri [string]', 'URI of the MongoDB [by default the one in gmeConfig]')
        .on('--help', function () {
            console.log('Use this script to list, add, update or remove webhooks registered for a given project.');
            console.log();
            console.log('  Examples:');
            console.log();
            console.log('    $ node webhookmanager.js');
            deferred.resolve();
        });

    program
        .command('list <projectName> <webhookId>')
        .description('lists a specific webhook')
        .action(function (projectName, webhookId, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.getProjectHook(d.projectId, webhookId);
                })
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node webhookmanager.js');
        });

    program
        .command('listAll <projectName>')
        .description('list all webhooks registered for project')
        .option('-v, --verbose', 'list all details', false)
        .action(function (projectName, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.getProjectHooks(d.projectId);
                })
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node webhookmanager.js');
        });

    program
        .command('remove <projectName> <webhookId>')
        .description('removes given webhook')
        .action(function (projectName, webhookId, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.removeProjectHook(d.projectId, webhookId);
            })
            .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node webhookmanager.js');
        });

    program
        .command('add <projectName> <webhookId> <url>')
        .description('adds a new webhook')
        .option('-e, --events [string]',
            'events it should be triggered by (comma separated with no spaces) default ["all"].', list)
        .option('-d, --description [string]', 'description', 'No description given')
        .action(function (projectName, webhookId, url, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.addProjectHook(d.projectId, webhookId, {
                        url: url,
                        events: options.events,
                        description: options.description
                    });
                })
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node webhookmanager.js');
        });

    program.parse(args);

    return deferred.promise;
}

module.exports = {
    main: main
};

if (require.main === module) {

    main(process.argv)
        .then(function () {
            'use strict';
            console.log('Done');
        })
        .catch(function (err) {
            'use strict';
            console.error('ERROR : ' + err);
        });
}
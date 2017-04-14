/*globals console*/
/*jshint node: true*/

/**
 * Script for listing, adding and removing webhooks in projects.
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    path = require('path'),
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

    if (args.length === 2 || args.length === 3) {
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

                authDeferred.resolve({
                    store: gmeAuth.metadataStorage,
                    projectId: ownerId + CONSTANTS.STORAGE.PROJECT_ID_SEP + projectName
                });
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
            console.log('    $ node manage_webhooks.js --help');
            console.log('    $ node manage_webhooks.js listAll MyProject --owner guest');
            console.log('    $ node manage_webhooks.js add MyProject MyHook http://localhost:8080 -e all');
            console.log('    $ node manage_webhooks.js update --help');
            deferred.resolve();
        });

    program
        .command('listAll <projectName>')
        .description('list all webhooks registered for given project')
        .action(function (projectName, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.getProjectHooks(d.projectId);
                })
                .then(deferred.resolve)
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node manage_webhooks.js listAll MyProject --owner guest');

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
                .then(deferred.resolve)
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node manage_webhooks.js list MyProject MyHook --owner me');

            deferred.resolve();
        });

    program
        .command('add <projectName> <webhookId> <url>')
        .description('adds a new webhook')
        .option('-e, --events [string]',
            'events it should be triggered by (comma separated with no spaces) default [].', list)
        .option('-d, --descriptor [string]', 'description of the hook', 'No description given')
        .action(function (projectName, webhookId, url, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.addProjectHook(d.projectId, webhookId, {
                        url: url,
                        events: options.events,
                        description: options.descriptor
                    });
                })
                .then(deferred.resolve)
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node manage_webhooks.js');
            console.log('    $ node manage_webhooks.js add MyProject MyHook http://localhost:8080 -e all');
            console.log('    $ node manage_webhooks.js add MyProject MyHook2 http://localhost:8081 -e COMMIT,TAG_CREATED');

            deferred.resolve();
        });

    program
        .command('update <projectName> <webhookId>')
        .description('adds a new webhook')
        .option('-u, --url [string]', 'url of webhook handler')
        .option('-e, --events [string]',
            'events it should be triggered by (comma separated with no spaces).', list)
        .option('-d, --descriptor [string]', 'description of the hook')
        .option('-a, --deactivate [boolean]', 'deactivate the webhook')
        .action(function (projectName, webhookId, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    var updateData = {
                        url: options.url,
                        events: options.events === true ? [] : options.events,
                        description: options.descriptor
                    };

                    if (options.deactivate) {
                        updateData.active = false;
                    }

                    return d.store.updateProjectHook(d.projectId, webhookId, updateData);
                })
                .then(deferred.resolve)
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node manage_webhooks.js update MyProject MyHook --url http://localhost:8080 -e COMMIT');
            console.log('    $ node manage_webhooks.js update MyProject MyHook -d Hook Description');
            console.log('    $ node manage_webhooks.js update MyProject MyHook --deactivate');

            deferred.resolve();
        });

    program
        .command('remove <projectName> <webhookId>')
        .description('removes given webhook')
        .action(function (projectName, webhookId, options) {
            getMetadataStorageAndProjectId(options.parent.mongoDatabaseUri, projectName, options.parent.owner)
                .then(function (d) {
                    return d.store.removeProjectHook(d.projectId, webhookId);
                })
                .then(deferred.resolve)
                .catch(deferred.reject)
                .finally(gmeAuth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node manage_webhooks.js remove MyProject MyHook');

            deferred.resolve();
        });

    program.parse(args);

    return deferred.promise;
}

module.exports = {
    main: main
};

if (require.main === module) {

    main(process.argv)
        .then(function (res) {
            console.log(JSON.stringify(res, null, 2));
        })
        .catch(function (err) {
            console.error(err.message);
        });
}
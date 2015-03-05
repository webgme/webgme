/**
 * @author kecso / https://github.com/kecso
 */
/*jshint node:true */

var requireJs = require('requirejs'),
    exportUserData,
    fs = require('fs'),
    MongoURI = require('mongo-uri'),
    program = require('commander'),
    Core,
    Storage;

requireJs.config({
    paths: {
        'core': './../../src/common/core',
        'storage': './../../src/common/storage',
        'util': './../../src/common/util'
    }
});
Core = requireJs('core/core');
Storage = requireJs('storage/serveruserstorage');

exportUserData = function (mongoUri, collectionName, callback) {
    'use strict';
    var database,
        usersData = [],
        core, i, uri;

    uri = MongoURI.parse(mongoUri);
    database = new Storage({
        host: uri.hosts[0],
        port: uri.ports[0] || 27017,
        database: uri.database || 'multi',
        log: {
            debug: function () {
            }, error: function () {
            }
        }
    });

    database.openDatabase(function (err) {
        if (err) {
            callback(err);
            return;
        }
        database.openProject('users', function (err, project) {
            if (err) {
                callback(err);
                return;
            }
            project.getBranchNames(function (err, names) {
                if (err) {
                    callback(err);
                    return;
                }
                project.loadObject(names.master, function (err, commit) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    core = new Core(project);
                    core.loadRoot(commit.root, function (err, root) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        core.loadChildren(root, function (err, users) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            for (i = 0; i < users.length; i++) {
                                usersData.push({
                                    login: core.getAttribute(users[i], 'name'),
                                    password: core.getRegistry(users[i], 'pass'),
                                    email: core.getRegistry(users[i], 'email'),
                                    canCreate: core.getRegistry(users[i], 'create') === true,
                                    projects: core.getRegistry(users[i], 'projects')
                                });

                            }
                            callback(null, usersData);
                        });
                    });
                });
            });
        });
    });
};


if (require.main === module) {
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-o, --out [path]', 'the output path of the diff [by default it is printed to the console]')
        .parse(process.argv);


    exportUserData(program.mongoDatabaseUri, program.projectIdentifier, function (err, result) {
        if (err) {
            console.error(err);
            process.exit(0);
        }

        if (program.out) {
            fs.writeFileSync(program.out, JSON.stringify(result, null, 2));
        } else {
            console.log(JSON.stringify(result, null, 2));
        }
        process.exit(0);
    });
}
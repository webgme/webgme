/*jshint node: true*/
/**
 * NOTE: Expected to be run only under nodejs.
 *
 * @author kecso / https://github.com/kecso
 * @author ksmyth / https://github.com/ksmyth
 * @author lattmann / https://github.com/lattmann
 */

var webgme = require('../../webgme'),
    Q = require('q'),
    MongoURI = require('mongo-uri'),

    GMEAuth = require('../server/middleware/auth/gmeauth'),

    main,

    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    webgme = require('../../webgme');

webgme.addToRequireJsPaths(gmeConfig);

main = function (argv) {
    'use strict';
    var Command = require('commander').Command,
        program = new Command(), // we need a new program (Command) instance every time when main is called.
        auth,
        mainDeferred = Q.defer(),
        setupGMEAuth = function (databaseConnectionString) {
            if (databaseConnectionString) {
                // this line throws a TypeError for invalid databaseConnectionString
                MongoURI.parse(databaseConnectionString);

                gmeConfig.mongo.uri = databaseConnectionString;
            }

            auth = new GMEAuth(null, gmeConfig);

            console.log(gmeConfig.mongo.uri);
        },
        args = Array.prototype.slice.call(argv);

    if (args.length === 2) {
        args.push('--help');
    }

    program
        .version('0.1.0')
        .option('--db <database>', 'database connection string')
        .on('--help', function () {
            mainDeferred.resolve();
        });

    program
        .command('useradd <username> <email> <password>')
        .description('adds a new user')
        .option('-c, --canCreate', 'user can create a new project', false)
        .action(function (username, email, password, options) {
            setupGMEAuth(options.parent.db);

            // TODO: we may need to use a module like 'prompt' to get user password
            if (username && email && password) {
                auth.addUser(username, email, password, options.canCreate, {overwrite: true})
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('username, email, and password parameters are required'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js useradd brubble brubble@example.com Password.123');
            console.log('    $ node usermanager.js useradd --canCreate brubble brubble@example.com Password.123');
            console.log();
        });

    program
        .command('userlist [username]')
        .description('lists all users or the specified user')
        .action(function (username, options) {
            setupGMEAuth(options.parent.db);

            if (username) {
                auth.getAllUserAuthInfo(username)
                    .then(function (userObject) {
                        // TODO: pretty print users
                        console.log(userObject);
                        mainDeferred.resolve();
                    })
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('username parameter is required'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js userlist');
            console.log('    $ node usermanager.js userlist user23');
            console.log();
        });

    program
        .command('passwd <username> <password>')
        .description('updates the user')
        .action(function (username, password, options) {
            setupGMEAuth(options.parent.db);

            // TODO: we may need to use a module like 'prompt' to get user password
            if (username && password) {
                auth.getAllUserAuthInfo(username)
                    .then(function (userObject) {
                        return auth.addUser(username, userObject.email, password, userObject.canCreate, {overwrite: true});
                    })
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('username and password parameters are required'));
            }

        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js passwd brubble NewPass.123');
            console.log();
        });

    program
        .command('userdel <username>')
        .description('deletes a user')
        .action(function (username, options) {
            setupGMEAuth(options.parent.db);

            if (username) {
                auth.removeUserByUserId(username)
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('username parameter is missing'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js userdel brubble');
            console.log();
        });

    program
        .command('organizationadd <organizationname>')
        .description('adds a new organization')
        .action(function (organizationname, options) {
            setupGMEAuth(options.parent.db);

            if (organizationname) {
                auth.addOrganization(organizationname)
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('organizationname parameter is missing'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js organizationadd neworg');
            console.log();
        });

    program
        .command('organizationdel <organizationname>')
        .description('deletes an existing organization')
        .action(function (organizationname, options) {
            setupGMEAuth(options.parent.db);

            if (organizationname) {
                auth.removeOrganizationByOrgId(organizationname)
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('organizationname parameter is missing'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js organizationdel sample_organization');
            console.log();
        });

    var authUserOrGroup = function (id, projectname, options, fn) {
        var rights = {
            read: options.authorize.indexOf('r') !== -1,
            write: options.authorize.indexOf('w') !== -1,
            delete: options.authorize.indexOf('d') !== -1
        };

        setupGMEAuth(options.parent.db);

        if (options.deauthorize) {
            // deauthorize
            rights = {};
        }

        // authorize
        return auth[fn].call(this, id, projectname, 'create', rights)
            .then(mainDeferred.resolve)
            .catch(mainDeferred.reject)
            .finally(auth.unload);
    };

    program
        .command('usermod_auth <username> <projectname>')
        .description('authorizes a user for a project')
        .option('-a, --authorize <mode>', 'mode is rwd, read, write, delete', 'rwd')
        .option('-d, --deauthorize', 'deauthorizes user', false)
        .action(function (username, projectname, options) {
            if (username && projectname) {
                authUserOrGroup(username, projectname, options, 'authorizeByUserId');
            } else {
                mainDeferred.reject(new SyntaxError('username and projectname parameter are missing'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js usermod_auth user23 project42');
            console.log('    $ node usermanager.js usermod_auth --authorize r user23 project42');
            console.log('    $ node usermanager.js usermod_auth --authorize rw user23 project42');
            console.log('    $ node usermanager.js usermod_auth -a rw user23 project42');
            console.log('    $ node usermanager.js usermod_auth --deauthorize user23 project42');
            console.log('    $ node usermanager.js usermod_auth -d user23 project42');
            console.log();
        });

    program
        .command('orgmod_auth <orgname> <projectname>')
        .description('authorizes an organization for a project')
        .option('-a, --authorize <mode>', 'mode is rwd, read, write, delete', 'rwd')
        .option('-d, --deauthorize', 'deauthorizes user', false)
        .action(function (orgname, projectname, options) {
            if (orgname && projectname) {
                authUserOrGroup(orgname, projectname, options, 'authorizeOrganization');
            } else {
                mainDeferred.reject(new SyntaxError('orgname and projectname parameter are missing'));
            }
        })
        .on('--help', function () {
            console.log('    Organizations are authorized like users are authorized. See also: usermod_auth');
        });

    program
        .command('usermod_organization_add <username> <organizationname>')
        .description('adds a user to an existing organization')
        .action(function (username, organizationname, options) {
            setupGMEAuth(options.parent.db);

            if (username && organizationname) {
                auth.addUserToOrganization(username, organizationname)
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('username and organizationname parameter are missing'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js usermod_organization_add user23 organization123');
            console.log();
        });

    program
        .command('usermod_organization_del <username> <organizationname>')
        .description('removes a user from an existing organization')
        .action(function (username, organizationname, options) {
            setupGMEAuth(options.parent.db);

            if (username && organizationname) {
                auth.removeUserFromOrganization(username, organizationname)
                    .then(mainDeferred.resolve)
                    .catch(mainDeferred.reject)
                    .finally(auth.unload);
            } else {
                mainDeferred.reject(new SyntaxError('username and organizationname parameter are missing'));
            }
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js usermod_organization_del user23 organization123');
            console.log();
        });


    program.parse(args);

    return mainDeferred.promise;
};

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

    //commands
    //function infoPrint(userName) {
    //    return gmeauth.getAllUserAuthInfo(userName)
    //        .then(function printUser(userObject) {
    //            var outstring = '',
    //                userProjects = userObject.projects,
    //                i,
    //                mode,
    //                end;
    //
    //            outstring += 'userName: ' + padString(userObject._id) + ' | ';
    //            outstring += 'canCreate: ' + userObject.canCreate + ' | ';
    //            outstring += 'projects: ';
    //
    //            for (i in userProjects) {
    //                mode = '';
    //                if (userProjects[i].read) {
    //                    mode += 'r';
    //                } else {
    //                    mode += '_';
    //                }
    //                if (userProjects[i].write) {
    //                    mode += 'w';
    //                } else {
    //                    mode += '_';
    //                }
    //                if (userProjects[i].delete) {
    //                    mode += 'd';
    //                } else {
    //                    mode += '_';
    //                }
    //                outstring += padString(i + '(' + mode + ')', 20) + ' ; ';
    //            }
    //
    //            end = outstring.lastIndexOf(';');
    //            if (end !== -1) {
    //                outstring = outstring.substring(0, end - 1);
    //            }
    //            return outstring;
    //        });
    //}
    //
    //function generateToken() {
    //    return gmeauth.generateTokenForUserId(userId)
    //        .then(console.log);
    //}
}
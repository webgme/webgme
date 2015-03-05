/*globals require, process, __dirname, console, module*/
/**
 * NOTE: Expected to be run only under nodejs.
 *
 * @author kecso / https://github.com/kecso
 * @author ksmyth / https://github.com/ksmyth
 * @author lattmann / https://github.com/lattmann
 */

var requirejs = require('requirejs'),
    Q = require('q'),
    MongoURI = require('mongo-uri'),

    GMEAuth,
    config,

    main;

requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + '/..',
    paths: {
        'util': 'common/util',
        'auth': 'server/auth',
        'bin': 'bin'
    }
});

GMEAuth = requirejs('auth/gmeauth');
config = requirejs('bin/getconfig');

main = function (argv) {
    'use strict';
    var program = require('commander'),
        auth,
        mainDeferred = Q.defer(),
        setupGMEAuth = function (databaseConnectionString) {
            var mongoConnectionInfo,

            // this line throws a TypeError for invalid databaseConnectionString
                uri = MongoURI.parse(databaseConnectionString);

            mongoConnectionInfo = {
                host: uri.hosts[0],
                port: uri.ports[0] || 27017,
                database: uri.database || 'multi'
            };

            auth = new GMEAuth(mongoConnectionInfo);

            console.log(uri);

            return uri;
        },
        args = Array.prototype.slice.call(argv);

    if (args.length === 2) {
        args.push('--help');
    }

    program
        .version('0.1.0')
        .option('--db <database>', 'database connection string', 'mongodb://127.0.0.1:27017/multi')
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
            auth.addUser(username, email, password, options.canCreate, {overwrite: true})
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js useradd brubble brubble@example.com Password.123');
            console.log('    $ node usermanager.js useradd --canCreate brubble brubble@example.com Password.123');
            console.log();
            // FIXME: resolve promise
        });

    program
        .command('userlist [username]')
        .description('lists all users or the specified user')
        .action(function (username, options) {
            setupGMEAuth(options.parent.db);

            return auth.getAllUserAuthInfo(username)
                .then(function (userObject) {
                    // TODO: pretty print users
                    console.log(userObject);
                    mainDeferred.resolve();
                })
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js userlist');
            console.log('    $ node usermanager.js userlist user23');
            console.log();
            // FIXME: resolve promise
        });

    program
        .command('passwd <username> <password>')
        .description('updates the user')
        .action(function (username, password, options) {
            setupGMEAuth(options.parent.db);

            // TODO: we may need to use a module like 'prompt' to get user password
            return auth.getAllUserAuthInfo(username)
                .then(function (userObject) {
                    return auth.addUser(username, userObject.email, password, userObject.canCreate, {overwrite: true});
                })
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);

        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js passwd brubble NewPass.123');
            console.log();
            // FIXME: resolve promise
        });

    program
        .command('userdel <username>')
        .description('deletes a user')
        .action(function (username, options) {
            setupGMEAuth(options.parent.db);

            return auth.removeUserByUserId(username)
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js userdel brubble');
            console.log();
            // FIXME: resolve promise
        });

    program
        .command('organizationadd <orgname>')
        .description('adds a new organization')
        .action(function (orgname, options) {
            setupGMEAuth(options.parent.db);

            return auth.addOrganization(orgname)
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js organizationadd neworg');
            console.log();
            // FIXME: resolve promise
        });

    program
        .command('organizationdel <organizationname>')
        .description('deletes an existing organization')
        .action(function (organizationname, options) {
            setupGMEAuth(options.parent.db);

            return auth.removeOrganizationByOrgId(organizationname)
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js organizationdel sample_organization');
            console.log();
            // FIXME: resolve promise
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
            return authUserOrGroup(username, projectname, options, 'authorizeByUserId');
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
            // FIXME: resolve promise

        });

    program
        .command('orgmod_auth <orgname> <projectname>')
        .description('authorizes an organization for a project')
        .option('-a, --authorize <mode>', 'mode is rwd, read, write, delete', 'rwd')
        .option('-d, --deauthorize', 'deauthorizes user', false)
        .action(function (orgname, projectname, options) {
            return authUserOrGroup(orgname, projectname, options, 'authorizeOrganization');
        })
        .on('--help', function () {
            console.log('    Organizations are authorized like users are authorized. See also: usermod_auth');
            // FIXME: resolve promise

        });

    program
        .command('usermod_organization_add <username> <organizationname>')
        .description('adds a user to an existing organization')
        .action(function (username, organizationname, options) {
            setupGMEAuth(options.parent.db);

            return auth.addUserToOrganization(username, organizationname)
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js usermod_organization_add user23 organization123');
            console.log();
            // FIXME: resolve promise

        });

    program
        .command('usermod_organization_del <username> <organizationname>')
        .description('removes a user from an existing organization')
        .action(function (username, organizationname, options) {
            setupGMEAuth(options.parent.db);

            return auth.removeUserFromOrganization(username, organizationname)
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js usermod_organization_del user23 organization123');
            console.log();
            // FIXME: resolve promise

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
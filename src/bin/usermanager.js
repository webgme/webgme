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

main = function () {
    'use strict';

    var program = require('commander'),
        auth,
        mainDeferred = Q.defer(),
        setupGMEAuth = function (databaseConnectionString) {
            var mongoConnectionInfo,
                uri;
            if (databaseConnectionString) {
                // this line throws a TypeError for invalid databaseConnectionString
                uri = MongoURI.parse(databaseConnectionString);

                mongoConnectionInfo = {
                    host: uri.hosts[0],
                    port: uri.ports[0] || 27017,
                    database: uri.database || 'multi'
                };
            } else {
                mongoConnectionInfo = {
                    host: config.mongoip,
                    port: config.mongoport,
                    database: config.mongodatabase
                };
            }

            console.log(mongoConnectionInfo);

            auth = new GMEAuth(mongoConnectionInfo);
        };

    program
        .version('0.1.0')
        .option('--db <database>', 'database connection string', 'mongodb://127.0.0.1:27017/multi');

    program
        .command('useradd <username> <email> <password>')
        .description('adds a new user')
        .option('-c, --canCreate', 'user can create a new project', false)
        .action(function (username, email, password, options) {
            setupGMEAuth(options.parent.db);

            // TODO: we may need to use a module like 'prompt' to get user password
            auth.addUser(username, email, password, options.canCreate, { overwrite: true})
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
        });

    program
        .command('passwd <username> <password>')
        .description('updates the user')
        .action(function (username, password, options) {
            setupGMEAuth(options.parent.db);

            // TODO: we may need to use a module like 'prompt' to get user password
            return auth.getAllUserAuthInfo(username)
                .then(function (userObject) {
                    return auth.addUser(username, userObject.email, password, userObject.canCreate, { overwrite: true});
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
        });

    program
        .command('groupadd <groupname>')
        .description('adds a new group')
        .action(function (groupname, options) {
            setupGMEAuth(options.parent.db);

            console.log('TODO: add a new group ' + groupname);
            mainDeferred.reject('not implemented yet.');
            auth.unload();

            //return auth.addGroup(groupname)
            //    .then(mainDeferred.resolve)
            //    .catch(mainDeferred.reject)
            //    .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js groupadd newgroup');
            console.log();
        });

    program
        .command('groupdel <groupname>')
        .description('deletes an existing group')
        .action(function (groupname, options) {
            setupGMEAuth(options.parent.db);

            console.log('TODO: delete an existing group ' + groupname);
            mainDeferred.reject('not implemented yet.');
            auth.unload();

            //return auth.delGroup(groupname)
            //    .then(mainDeferred.resolve)
            //    .catch(mainDeferred.reject)
            //    .finally(auth.unload);
        })
        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node usermanager.js groupdel sample_group');
            console.log();
        });

    program
        .command('usermod_auth <username> <projectname>')
        .description('deletes an existing group')
        .option('-a, --authorize <mode>', 'mode is rwd, read, write, delete', 'rwd')
        .option('-d, --deauthorize', 'deauthorizes user', false)
        .action(function (username, projectname, options) {
            var rights = {
                read:   options.authorize.indexOf('r') !== -1,
                write:  options.authorize.indexOf('w') !== -1,
                delete: options.authorize.indexOf('d') !== -1
            };

            setupGMEAuth(options.parent.db);

            if (options.deauthorize) {
                // deauthorize
                rights = {};
            }

            // authorize
            return auth.authorizeByUserId(username, projectname, 'create', rights)
                .then(mainDeferred.resolve)
                .catch(mainDeferred.reject)
                .finally(auth.unload);
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


    // TODO: usermod_group
    //node usermanager.js usermod_group --addgroup newgroup brubble
    //node usermanager.js usermod_group --delgroup newgroup brubble

    program.parse(process.argv);

    return mainDeferred.promise;
};

if (require.main === module) {
    
    main()
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
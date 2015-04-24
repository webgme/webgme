/*jshint node: true */
/**
 * @author lattmann / https://github.com/lattmann
 */
'use strict';

var MongoURI = require('mongo-uri'),
    main;

main = function (argv) {
    var program = require('commander'),
        //userManager = require('./usermanager'),
        args = Array.prototype.slice.call(argv),
        uri,
        users,
        user,
        projectName,
        rights,
        fs = require('fs'),

        i;

    if (args.length === 2) {
        args.push('--help');
    }

    program
        .version('0.1.0')
        .option('--db <database>', 'database connection string e.g. mongodb://127.0.0.1:27017/multi')
        .option('-i, --input <filename>', 'json file containing users exported by export_user.js script');

    program.parse(args);

    // verify mongo uri
    if (!program.db) {
        console.error('db is mandatory');
        program.help();
    }
    uri = MongoURI.parse(program.db);

    if (!program.input) {
        console.error('input filename is mandatory');
        program.help();
    }
    users = JSON.parse(fs.readFileSync(program.input));

    console.log('#!/bin/bash');

    for (i = 0; i < users.length; i += 1) {
        user = users[i];

        console.log('echo adding user', user.login, user.email);
        if (!user.email) {
            console.log('#  WARN: email does not exist for this user the command will fail');
        }
        if (!user.password) {
            console.log('#  WARN: password does not exist for this user the command will fail');
        }

        console.log('node usermanager.js --db ' + program.db + ' useradd ' + (user.canCreate ? '--canCreate ' : '') +
        user.login + ' ' + user.email + ' ' + user.password);


        for (projectName in user.projects) {
            if (user.projects.hasOwnProperty(projectName)) {
                rights = '';
                if (user.projects[projectName].read) {
                    rights += 'r';
                }
                if (user.projects[projectName].write) {
                    rights += 'w';
                }
                if (user.projects[projectName].delete) {
                    rights += 'd';
                }

                console.log('# authorizing user', user.login, 'for project:', projectName);
                console.log('node usermanager.js --db ' + program.db + ' usermod_auth --authorize ' + rights +
                ' ' + user.login + ' ' + projectName);

            }
        }
    }

    if (users.length === 0) {
        console.log('echo WARN: No user to import');
    } else {
        console.log('echo INFO: To check imported users use:');
        console.log('echo node usermanager.js --db ' + program.db + ' userlist ' + users[0].login);
        console.log('node usermanager.js --db ' + program.db + ' userlist ' + users[0].login);

    }

};


if (require.main === module) {

    main(process.argv);
}

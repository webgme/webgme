/*jshint node:true, mocha:true*/
/**
 * @author ksmyth / https://github.com/ksmyth
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('User manager command line interface (CLI)', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        should = testFixture.should,
        spawn = testFixture.childProcess.spawn,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,
        userManager = require('../../src/bin/usermanager'),
        filename = require('path').normalize('src/bin/usermanager.js'),
        mongoUri = gmeConfig.mongo.uri,
        uri = require('mongo-uri').parse(mongoUri);

    // N.B: child process does NOT generate coverage result and it is also somewhat slower.
    //      we have to make sure at least the help works this way and unknown options
    //      test only cases this way, when process.exit() is called by the used library
    describe('as a child process', function () {
        // TEST only a single command
        it('should print help for useradd subcommand', function (done) {
            var nodeUserManager = spawn('node', [filename, 'useradd', '--help']),
                stdoutData,
                err;

            nodeUserManager.stdout.on('data', function (data) {
                stdoutData = stdoutData || '';
                stdoutData += data.toString();
                //console.log(data.toString());
            });

            nodeUserManager.stderr.on('data', function (data) {
                err = err || '';
                err += data.toString();
                //console.log(data.toString());
            });

            nodeUserManager.on('close', function (code) {
                stdoutData.should.contain('Usage:');
                stdoutData.should.contain('--help');
                should.not.exist(err);
                should.equal(code, 0);
                done();
            });
        });
    });

    describe('as a library', function () {

        var oldProcessExit = process.exit,
            oldConsoleLog = console.log,
            oldConsoleError = console.error,
            oldProcessStdoutWrite = process.stdout.write,
            dbConn,
            db,

            i,
            helpForCommands = [
                'useradd',
                'userlist',
                'passwd',
                'userdel',
                'organizationadd',
                'organizationdel',
                'usermod_auth',
                'orgmod_auth',
                'usermod_organization_add',
                'usermod_organization_del'
            ],
            addTest,

            suppressLogAndExit = function () {
                process.exit = function (code) {
                    // TODO: would be nice to send notifications for test
                    console.log(code);
                };
                console.log = function () {
                    //console.info(arguments);
                };
                console.error = function () {
                    //console.info(arguments);
                };
                process.stdout.write = function () {
                };
            },
            restoreLogAndExit = function () {
                console.log = oldConsoleLog;
                console.error = oldConsoleError;
                process.stdout.write = oldProcessStdoutWrite;
                process.exit = oldProcessExit;
            };

        before(function (done) {

            dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', mongoUri, gmeConfig.mongo.options)
                .then(function (db_) {
                    db = db_;
                    return Q.all([
                        Q.ninvoke(db, 'collection', '_users')
                            .then(function (collection_) {
                                var collection = collection_;
                                return Q.ninvoke(collection, 'remove');
                            }),
                        Q.ninvoke(db, 'collection', '_organizations')
                            .then(function (orgs_) {
                                return Q.ninvoke(orgs_, 'remove');
                            }),
                        Q.ninvoke(db, 'collection', 'ClientCreateProject')
                            .then(function (createdProject) {
                                return Q.ninvoke(createdProject, 'remove');
                            }),
                        Q.ninvoke(db, 'collection', 'project')
                            .then(function (project) {
                                return Q.ninvoke(project, 'remove')
                                    .then(function () {
                                        return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                                    });
                            }),
                        Q.ninvoke(db, 'collection', 'unauthorized_project')
                            .then(function (project) {
                                return Q.ninvoke(project, 'remove')
                                    .then(function () {
                                        return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                                    });
                            })
                    ]);
                });

            dbConn.nodeify(done);
        });

        after(function (done) {
            // just to be safe
            restoreLogAndExit();
            db.close(true, function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });

        it('should have a main', function () {
            userManager.should.have.property('main');
        });

        // Test if help is printed for all commands.
        // If a new command is introduced add it to the helpForCommands list
        addTest = function (helpForCommand) {
            it('should print help for ' + helpForCommand, function (done) {
                suppressLogAndExit();

                userManager.main(['node', filename, helpForCommand, '--help'])
                    .then(function () {
                        restoreLogAndExit();
                        done();
                    })
                    .catch(function (err) {
                        restoreLogAndExit();
                        if (err instanceof SyntaxError) {
                            done();
                        } else {
                            done(err);
                        }
                    });
            });
        };

        for (i = 0; i < helpForCommands.length; i += 1) {
            addTest(helpForCommands[i]);
        }

        // individual tests
        it('should print help', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename])
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should print help with -h', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '-h'])
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should add user if db is defined', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });


        it('should add user if db is not defined', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });


        it('should add user if db port and name are not defined', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', 'mongodb://' + uri.hosts[0], 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should list user', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'userlist', 'user']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should change user password', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'passwd', 'user', 'plaintext2']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should delete user', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user_to_delete', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'userdel', 'user_to_delete']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('adds organization', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org1'])
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });


        it('deletes an existing organization', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org2'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org2']);

                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });


        it('should authorize user userauth_mod', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'usermod_auth', 'user', 'project1']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should authorize user userauth_mod rw', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'usermod_auth', 'user', 'project1', '-a', 'rw']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should authorize then deauthorize user userauth_mod', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'usermod_auth', 'user', 'project1', '-d']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });


        it('should authorize organization orgauth_mod', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org11'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'orgmod_auth', 'org11', 'project11']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org11']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should authorize organization orgauth_mod rw', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org11'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'orgmod_auth', 'org11', 'project11', '-a', 'rw']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org11']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should authorize then deauthorize organization orgauth_mod', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org11'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'orgmod_auth', 'org11', 'project11', '-d']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org11']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should add user to organization usermod_organization_add', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org11'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'usermod_organization_add', 'user', 'org11']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org11']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });

        it('should add user to organization and remove it usermod_organization_del', function (done) {
            suppressLogAndExit();

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org11'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'usermod_organization_add', 'user', 'org11']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'usermod_organization_del', 'user', 'org11']);
                })
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org11']);
                })
                .then(function () {
                    restoreLogAndExit();
                    done();
                })
                .catch(function (err) {
                    restoreLogAndExit();
                    done(err);
                });
        });
    });
});
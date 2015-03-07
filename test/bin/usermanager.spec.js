/*globals require*/
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
        requirejs = testFixture.requirejs,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,
        userManager = requirejs('../bin/usermanager'),
        filename = require('path').normalize('src/bin/usermanager.js'),
        mongoUri = 'mongodb://127.0.0.1:27017/webgme_tests',
        uri = require('mongo-uri').parse(mongoUri);

    // N.B: child process does NOT generate coverage result and it is also somewhat slower.
    //      we have to make sure at least the help works this way and unknown options
    //      test only cases this way, when process.exit() is called by the used library
    describe('as a child process', function () {
        it('should print help with no arguments', function (done) {
            var nodeUserManager = spawn('node', [filename]),
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

        it('should print help with --help', function (done) {
            var nodeUserManager = spawn('node', [filename, '--help']),
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

        it('should print help with -h', function (done) {
            var nodeUserManager = spawn('node', [filename, '-h']),
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

        it('should fail with unknown argument --unknown', function (done) {
            var nodeUserManager = spawn('node', [filename, '--unknown']),
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
                should.not.exist(stdoutData);
                //err.should.contain('error:');
                should.equal(code, 1);
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
            db;

        before(function (done) {

            dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', mongoUri, {
                'w': 1,
                'native-parser': true,
                'auto_reconnect': true,
                'poolSize': 20,
                socketOptions: {keepAlive: 1}
            })
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
            process.exit = oldProcessExit;
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

        it('should print help', function (done) {
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


            userManager.main(['node', filename])
                .then(function () {
                    console.log = oldConsoleLog;
                    console.error = oldConsoleError;
                    process.stdout.write = oldProcessStdoutWrite;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    console.error = oldConsoleError;
                    process.stdout.write = oldProcessStdoutWrite;
                    done(err);
                });
        });

        it.skip('should print help with -h', function (done) {
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '-h'])
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it.skip('should print help with --unknown', function (done) {
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--unknown'])
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should add user if db is defined', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });


        it('should add user if db is not defined', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });


        it('should add user if db port and name are not defined', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', 'mongodb://' + uri.hosts[0], 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });

        it.skip('should have help useradd', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, 'help', 'useradd'])
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });

        it('should list user', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'userlist', 'user']);
                })
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });

        it('should change user password', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'passwd', 'user', 'plaintext2']);
                })
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });

        it('should delete user', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', mongoUri, 'useradd', 'user_to_delete', 'user@example.com', 'plaintext'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'userdel', 'user_to_delete']);
                })
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });


        it.skip('should add organization', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org1'])
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });

        it.skip('should add organization', function (done) {

            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                console.log(code);
            };
            console.log = function () {
                //console.info(arguments);
            };

            userManager.main(['node', filename, '--db', mongoUri, 'organizationadd', 'org1'])
                .then(function () {
                    return userManager.main(['node', filename, '--db', mongoUri, 'organizationdel', 'org1']);
                })
                .then(function () {
                    console.log = oldConsoleLog;
                    done();
                })
                .catch(function (err) {
                    console.log = oldConsoleLog;
                    done(err);
                });
        });
    });
});
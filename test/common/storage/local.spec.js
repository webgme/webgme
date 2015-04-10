/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */
//These tests intend to check the functionality of the local implementation of the storage
//we use the globally available Storage as that is identical with the local.js

var testFixture = require('../../_globals.js');

describe('local', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        storage = new testFixture.Storage({globConf: gmeConfig}),
        storageWithCache = new testFixture.StorageWithCache({globConf: gmeConfig});

    describe('Database', function () {
        it('should be empty initially', function (done) {
            storage.getProjectNames(function (err, names) {
                if (err) {
                    done(err);
                    return;
                }
                names.should.be.empty;
                done();
            });
        });

        it('should be possible to call meaningless (in local) functions', function (done) {
            storage.openDatabase(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                storage.closeDatabase(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.fsyncDatabase(function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        done();
                    });
                });
            });
        });

        it('opening/creating a project is not creates until a real data is saved', function (done) {
            storage.openProject('test', function (err/*, p*/) {
                if (err) {
                    done(err);
                    return;
                }
                storage.getProjectNames(function (err, names) {
                    if (err) {
                        done(err);
                        return;
                    }
                    names.should.be.empty;
                    done();
                });
            });
        });
    });

    describe('operations open and close', function () {
        var project;
        before(function (done) {
            storageWithCache.openDatabase(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });

        it('should open and close', function (done) {
            storageWithCache.openProject('localTestProject', function (err, project) {
                if (err) {
                    done(err);
                    return;
                }
                expect(project).to.be.defined;
                project.closeProject(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    done();
                });
            });
        });

        it('should open and close and close', function (done) {
            storageWithCache.openProject('localTestProject', function (err, project) {
                if (err) {
                    done(err);
                    return;
                }
                expect(project).to.be.defined;
                project.closeProject(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    project.closeProject(function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        done();
                    });
                });
            });
        });

        it.skip('should open and abort', function (done) {
            storageWithCache.openProject('localTestProject', function (err, project) {
                if (err) {
                    done(err);
                    return;
                }
                expect(project).to.be.defined;
                project.abortProject(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    done();
                });
            });
        });
    });

    describe('Project', function () {
        describe('operations on localTestProject', function () {
            var project;
            before(function (done) {
                storage.openDatabase(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.openProject('localTestProject', function (err, p) {
                        if (err) {
                            done(err);
                            return;
                        }
                        project = p;
                        done();
                    });
                });
            });
            /*
             fsyncDatabase: fsyncDatabase,
             getDatabaseStatus: getDatabaseStatus,
             closeProject: closeProject,
             loadObject: loadObject,
             insertObject: insertObject,
             getInfo: getInfo,
             setInfo: setInfo,
             findHash: findHash,
             dumpObjects: dumpObjects,
             getBranchNames: getBranchNames,
             getBranchHash: getBranchHash,
             setBranchHash: setBranchHash,
             getCommits: getCommits,
             ID_NAME: "_id"
             */
            it('the ID field inside the database should be \'_id\'', function () {
                project.ID_NAME.should.be.equal('_id');
            });

            it('should be possible to insert valid objects then read them out', function (done) {
                var object = {},
                    id;

                object[project.ID_NAME] = '';
                object.value = 'my value';
                id = '#' + testFixture.generateKey(object, gmeConfig);
                object[project.ID_NAME] = id;
                project.insertObject(object, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    project.loadObject(id, function (err, obj) {
                        if (err) {
                            done(err);
                            return;
                        }
                        obj.value.should.be.equal('my value');
                        done();
                    });
                });
            });
        });
    });
});
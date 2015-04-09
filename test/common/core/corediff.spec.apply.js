/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('corediff apply', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'coreDiffApply',
        project,
        core,
        root,
        commit,
        getJsonProject = testFixture.loadJsonFile,
        jsonProject;

    var database = new testFixture.WebGME.serverUserStorage({
        globConf: gmeConfig,
        logger: testFixture.logger.fork('corediff apply:storage')
    });

    before(function (done) {
        jsonProject = getJsonProject('./test/common/core/corediff/base001.json');
        database.openDatabase(function (err) {
            if (err) {
                done(err);
            }
            database.openProject(projectName, function (err, p) {
                if (err) {
                    done(err);
                    return;
                }
                project = p;
                core = new testFixture.WebGME.core(project, {
                    globConf: gmeConfig,
                    logger: testFixture.logger.fork('corediff apply:core')
                });
                root = core.createNode();
                testFixture.WebGME.serializer.import(core, root, jsonProject, function (err, log) {
                    if (err) {
                        done(err);
                        return;
                    }
                    core.persist(root, function (err) {
                        if (err) {
                            return done(err);
                        }
                        commit = project.makeCommit([], core.getHash(root), 'initial insert', function (err) {
                            if (err) {
                                return done(err);
                            }
                            project.setBranchHash('base', '', commit, function (err) {
                                if (err) {
                                    return done(err);
                                }
                                project.closeProject(function (err) {
                                    if (err) {
                                        return done(err);
                                    }
                                    database.closeDatabase(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    after(function (done) {
        database.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }

            database.deleteProject(projectName, function (err) {
                if (err) {
                    done(err);
                    return;
                }
                database.closeDatabase(done);
            });
        });
    });
    describe('apply', function () {
        before(function (done) {
            database.openDatabase(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                database.openProject(projectName, function (err, p) {
                    if (err) {
                        done(err);
                        return;
                    }
                    project = p;
                    core = new testFixture.WebGME.core(project, {
                        globConf: gmeConfig,
                        logger: testFixture.logger.fork('corediff apply:core')
                    });
                    project.getBranchNames(function (err, names) {
                        if (err) {
                            done(err);
                            return;
                        }
                        if (!names.base) {
                            done(new Error('missing branch'));
                            return;
                        }
                        project.loadObject(names.base, function (err, c) {
                            if (err) {
                                done(err);
                                return;
                            }
                            core.loadRoot(c.root, function (err, r) {
                                if (err) {
                                    return done(err);
                                }
                                root = r;
                                done();
                            });
                        });
                    });
                });
            });
        });
        after(function (done) {
            try {
                database.closeDatabase(done);
            } catch (e) {
                done();
            }
        });
        it('modifies several attributes', function (done) {
            core.applyTreeDiff(root, {attr: {name: 'ROOTy'}, 1: {attr: {name: 'FCOy'}}}, function (err) {
                if (err) {
                    return done(err);
                }
                core.persist(root, function (err) {
                    if (err) {
                        return done(err);
                    }
                    var oldCommit = commit;
                    commit = project.makeCommit([oldCommit], core.getHash(root), 'initial insert', function (err) {
                        if (err) {
                            return done(err);
                        }
                        project.setBranchHash('base', oldCommit, commit, function (err) {
                            if (err) {
                                return done(err);
                            }
                            //checking
                            project.loadObject(commit, function (err, c) {
                                if (err) {
                                    return done(err);
                                }
                                core.loadRoot(c.root, function (err, r) {
                                    if (err) {
                                        return done(err);
                                    }
                                    core.getAttribute(r, 'name').should.be.eql('ROOTy');
                                    core.loadByPath(r, '/1', function (err, fco) {
                                        if (err) {
                                            return done(err);
                                        }
                                        core.getAttribute(fco, 'name').should.be.eql('FCOy');
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

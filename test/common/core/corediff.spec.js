/* jshint node:true, mocha: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('core diff', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'coreDiff',
        projectId = testFixture.projectName2Id(projectName),
        project,
        core,
        rootNode,
        originalRootNode,
        originalRootHash,
        commit,
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('coreDiff.spec'),
        storage,

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.all([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    describe('diff', function () {

        beforeEach(function (done) {
            storage.deleteProject({projectId: projectId})
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/ActivePanels.json',
                        projectName: projectName,
                        branchName: 'base',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    project = result.project;
                    core = result.core;
                    rootNode = result.rootNode;
                    originalRootHash = result.rootHash;
                    commit = result.commitHash;
                    return Q.nfcall(core.loadRoot, originalRootHash);
                })
                .then(function (originalRootNode_) {
                    originalRootNode = originalRootNode_;
                })
                .nodeify(done);
        });

        // FIXME: there is an issue if we try to delete non-existent project, it complains about auth issues.
        //afterEach(function (done) {
        //    storage.deleteProject({projectId: projectId})
        //        .nodeify(done);
        //});


        it('should generate diff if an object is deleted', function (done) {
            var patch = {
                "175547009": {
                    "471466181": {
                        "guid": "be36b1a1-8d82-8aba-9eda-03d655a8bf3e",
                        "oGuids": {
                            "be36b1a1-8d82-8aba-9eda-03d655a8bf3e": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "871430202": {
                        "guid": "18eb3c1d-c951-b757-c8c4-0ea8736c2470",
                        "oGuids": {
                            "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1104061497": {
                        "guid": "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb",
                        "oGuids": {
                            "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1817665259": {
                        "guid": "5f73946c-68aa-9de1-7979-736d884171af",
                        "oGuids": {
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                    "oGuids": {
                        "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "1303043463": {"guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42", "removed": true},
                "childrenListChanged": true,
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                core.generateTreeDiff(originalRootNode, rootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    // TODO: check if changes happened as expected.
                    done();
                });
            });
        });


        it('should generate diff if an object is created', function (done) {
            var patch = {
                "175547009": {
                    "471466181": {
                        "guid": "be36b1a1-8d82-8aba-9eda-03d655a8bf3e",
                        "oGuids": {
                            "be36b1a1-8d82-8aba-9eda-03d655a8bf3e": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "871430202": {
                        "guid": "18eb3c1d-c951-b757-c8c4-0ea8736c2470",
                        "oGuids": {
                            "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1104061497": {
                        "guid": "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb",
                        "oGuids": {
                            "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1817665259": {
                        "guid": "5f73946c-68aa-9de1-7979-736d884171af",
                        "oGuids": {
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                    "oGuids": {
                        "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "1303043463": {"guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42", "removed": true},
                "childrenListChanged": true,
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                // N.B: same test as before diff is applied in the different order
                core.generateTreeDiff(rootNode, originalRootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    // TODO: check if changes happened as expected.
                    done();
                });
            });
        });

        it('should generate light tree diff', function (done) {
            core.generateLightTreeDiff(originalRootNode, originalRootNode, function (err, diff) {
                if (err) {
                    return done(err);
                }
                expect(diff).to.deep.equal({});
                done();
            });
        });

        it('should add a new object with patch', function (done) {
            var patch = {
                "175547009": {
                    "471466181": {
                        "guid": "be36b1a1-8d82-8aba-9eda-03d655a8bf3e",
                        "oGuids": {
                            "be36b1a1-8d82-8aba-9eda-03d655a8bf3e": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "871430202": {
                        "guid": "18eb3c1d-c951-b757-c8c4-0ea8736c2470",
                        "oGuids": {
                            "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1104061497": {
                        "guid": "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb",
                        "oGuids": {
                            "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1817665259": {
                        "guid": "5f73946c-68aa-9de1-7979-736d884171af",
                        "oGuids": {
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                    "oGuids": {
                        "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "1303043463": {"guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42", "removed": true},
                "childrenListChanged": true,
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                // N.B: load project, delete object, generate diff in reverse, then apply
                core.generateTreeDiff(rootNode, originalRootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    core.applyTreeDiff(rootNode, diff, function (err) {
                        if (err) {
                            return done(err);
                        }
                        // TODO: check if changes happened as expected.
                        done();
                    });
                });
            });
        });


    });
});

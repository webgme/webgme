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

        it('should create a new META attribute', function (done) {
            var patch = {
                "1": {
                    "attr": {"newAttr": ""},
                    "meta": {"attributes": {"newAttr": {"type": "string", "default": "", "enum": ["a", "b", "c"]}}},
                    "guid": "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045",
                    "oGuids": {
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true
                    }
                },
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

        it('should create a new META attribute', function (done) {
            var patch = {
                "1": {
                    "attr": {"newAttr": ""},
                    "meta": {"attributes": {"newAttr": {"type": "string", "default": "", "enum": ["a", "b", "c"]}}},
                    "guid": "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045",
                    "oGuids": {
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true
                    }
                },
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


        it('should tryToConcatChanges empty diff and meta change', function () {
            var result,
                diff1 = {},
                diff2 = {
                    "1": {
                        "attr": {"newAttr": ""},
                        "meta": {"attributes": {"newAttr": {"type": "string", "default": "", "enum": ["a", "b", "c"]}}},
                        "guid": "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045",
                        "oGuids": {
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };

            result = core.tryToConcatChanges(diff1, diff2);
            // TODO: check if changes happened as expected.
        });

        it('should tryToConcatChanges change an element, and delete the same element', function () {
            var result,
                diff1 = {
                    "1303043463": {
                        "reg": {"position": {"x": 38, "y": 407}},
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
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

            result = core.tryToConcatChanges(diff1, diff2);
            // TODO: check if changes happened as expected.
        });

        it('should tryToConcatChanges delete an element, and change the same element', function () {
            var result,
                diff1 = {
                    "1303043463": {
                        "reg": {"position": {"x": 38, "y": 407}},
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
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

            // same as before other way around
            result = core.tryToConcatChanges(diff2, diff1);
            // TODO: check if changes happened as expected.
        });


        it('should tryToConcatChanges change a set element, and delete the same element from the set', function () {
            var result,
                diff1 = {
                    "1303043463": {
                        "2119137141": {
                            "set": {
                                "setPtr": {
                                    "/1303043463/1448030591": {
                                        "reg": {
                                            "position": {
                                                "x": 352,
                                                "y": 156
                                            }
                                        }
                                    }
                                }
                            },
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
                    "1303043463": {
                        "2119137141": {
                            "set": {"setPtr": {"/1303043463/1448030591": "*to*delete*"}},
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };


            result = core.tryToConcatChanges(diff1, diff2);
            // TODO: check if changes happened as expected.
        });

        it('should tryToConcatChanges delete a set element, and change the same element in the set', function () {
            var result,
                diff1 = {
                    "1303043463": {
                        "2119137141": {
                            "set": {
                                "setPtr": {
                                    "/1303043463/1448030591": {
                                        "reg": {
                                            "position": {
                                                "x": 352,
                                                "y": 156
                                            }
                                        }
                                    }
                                }
                            },
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
                    "1303043463": {
                        "2119137141": {
                            "set": {"setPtr": {"/1303043463/1448030591": "*to*delete*"}},
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };

            // same as before other way around
            result = core.tryToConcatChanges(diff2, diff1);
            // TODO: check if changes happened as expected.
        });


        it('should tryToConcatChanges change a set element, and delete the set pointer', function () {
            var result,
                diff1 = {
                    "1303043463": {
                        "2119137141": {
                            "set": {
                                "setPtr": {
                                    "/1303043463/1448030591": {
                                        "reg": {
                                            "position": {
                                                "x": 352,
                                                "y": 156
                                            }
                                        }
                                    }
                                }
                            },
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
                    "1303043463": {
                        "2119137141": {
                            "set": {"setPtr": "*to*delete*"}, // WARNING: this cannot be generated by the UI.
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };


            result = core.tryToConcatChanges(diff1, diff2);
            // TODO: check if changes happened as expected.
        });

        //it('should tryToConcatChanges does nothing, and delete the set pointer', function () {
        //    var result,
        //        diff1 = {},
        //        diff2 = {
        //            "1303043463": {
        //                "2119137141": {
        //                    "set": {"setPtr": "*to*delete*"}, // WARNING: this cannot be generated by the UI.
        //                    "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
        //                    "oGuids": {
        //                        "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
        //                        "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
        //                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
        //                        "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
        //                        "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
        //                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
        //                    }
        //                },
        //                "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
        //                "oGuids": {
        //                    "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
        //                    "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
        //                    "5f73946c-68aa-9de1-7979-736d884171af": true,
        //                    "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
        //                    "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
        //                }
        //            },
        //            "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
        //            "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
        //        };
        //
        //
        //    result = core.tryToConcatChanges(diff1, diff2);
        //    // TODO: check if changes happened as expected.
        //});


        it('should tryToConcatChanges delete a meta rule, and add a new attribute to meta', function () {
            var result,
                diff1 = {
                    "175547009": {
                        "attr": {"newAttribute": "a"},
                        "meta": {"children": "*to*delete*"},
                        "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                        "oGuids": {
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "set": {
                        "MetaAspectSet": {"/175547009": "*to*delete*"},
                        "MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866": {"/175547009": "*to*delete*"}
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
                    "175547009": {
                        "attr": {"newAttribute": "a"},
                        "meta": {
                            "attributes": {
                                "newAttribute": {
                                    "type": "string",
                                    "default": "a",
                                    "enum": ["a", "b", "c", "d"]
                                }
                            }
                        },
                        "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                        "oGuids": {
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };


            result = core.tryToConcatChanges(diff1, diff2);
            // TODO: check if changes happened as expected.
        });


        it('should tryToConcatChanges delete an element from meta sheet, and add a new attribute to meta', function () {
            var result,
                diff1 = {
                    "175547009": {
                        "attr": {"newAttribute": "a"},
                        "meta": "*to*delete*", // FIXME: diff is generated incorrectly
                        "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                        "oGuids": {
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "set": {
                        "MetaAspectSet": {"/175547009": "*to*delete*"},
                        "MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866": {"/175547009": "*to*delete*"}
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
                    "175547009": {
                        "attr": {"newAttribute": "a"},
                        "meta": {
                            "attributes": {
                                "newAttribute": {
                                    "type": "string",
                                    "default": "a",
                                    "enum": ["a", "b", "c", "d"]
                                }
                            }
                        },
                        "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                        "oGuids": {
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };


            result = core.tryToConcatChanges(diff1, diff2);
            // TODO: check if changes happened as expected.
        });


        it('should tryToConcatChanges and resolve: rename and move + rename', function () {
            var resultPatch,
                resultConflict,
                diff1 = {
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
                    "1303043463": {
                        "902088723": {
                            "guid": "d8f6c058-f180-f9ea-a0fc-5909e42811ae",
                            "oGuids": {
                                "d8f6c058-f180-f9ea-a0fc-5909e42811ae": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "5f73946c-68aa-9de1-7979-736d884171af": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1044885565": {
                            "guid": "138e7076-9c15-edf6-aea4-23effabebb86",
                            "oGuids": {
                                "138e7076-9c15-edf6-aea4-23effabebb86": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1448030591": {
                            "guid": "be71f6dc-6eec-7552-f3c0-5cc64423f290",
                            "oGuids": {
                                "be71f6dc-6eec-7552-f3c0-5cc64423f290": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1763546084": {
                            "249902827": {
                                "guid": "bbaf81cd-07b8-c4c6-b333-280cae75ff4a",
                                "oGuids": {
                                    "bbaf81cd-07b8-c4c6-b333-280cae75ff4a": true,
                                    "cbfe379c-c527-700e-3041-a0c22ca2a5d6": true,
                                    "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                    "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                    "5f73946c-68aa-9de1-7979-736d884171af": true,
                                    "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                    "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                                }
                            },
                            "childrenListChanged": true,
                            "guid": "cbfe379c-c527-700e-3041-a0c22ca2a5d6",
                            "oGuids": {
                                "cbfe379c-c527-700e-3041-a0c22ca2a5d6": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "be36b1a1-8d82-8aba-9eda-03d655a8bf3e": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "2119137141": {
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1823288916": {
                        "attr": {"name": "ModelEditor3"},
                        "guid": "56213d7f-3e44-6a23-3e2b-95adaf702b4d",
                        "oGuids": {
                            "56213d7f-3e44-6a23-3e2b-95adaf702b4d": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/1303043463/1763546084/1823288916",
                        "ooGuids": {
                            "56213d7f-3e44-6a23-3e2b-95adaf702b4d": true,
                            "cbfe379c-c527-700e-3041-a0c22ca2a5d6": true,
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "childrenListChanged": true,
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
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
                    "1303043463": {
                        "902088723": {
                            "guid": "d8f6c058-f180-f9ea-a0fc-5909e42811ae",
                            "oGuids": {
                                "d8f6c058-f180-f9ea-a0fc-5909e42811ae": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "5f73946c-68aa-9de1-7979-736d884171af": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1044885565": {
                            "guid": "138e7076-9c15-edf6-aea4-23effabebb86",
                            "oGuids": {
                                "138e7076-9c15-edf6-aea4-23effabebb86": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1448030591": {
                            "guid": "be71f6dc-6eec-7552-f3c0-5cc64423f290",
                            "oGuids": {
                                "be71f6dc-6eec-7552-f3c0-5cc64423f290": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "18eb3c1d-c951-b757-c8c4-0ea8736c2470": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1763546084": {
                            "249902827": {
                                "guid": "bbaf81cd-07b8-c4c6-b333-280cae75ff4a",
                                "oGuids": {
                                    "bbaf81cd-07b8-c4c6-b333-280cae75ff4a": true,
                                    "cbfe379c-c527-700e-3041-a0c22ca2a5d6": true,
                                    "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                    "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                    "5f73946c-68aa-9de1-7979-736d884171af": true,
                                    "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                    "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                                }
                            },
                            "childrenListChanged": true,
                            "guid": "cbfe379c-c527-700e-3041-a0c22ca2a5d6",
                            "oGuids": {
                                "cbfe379c-c527-700e-3041-a0c22ca2a5d6": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "be36b1a1-8d82-8aba-9eda-03d655a8bf3e": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "1823288916": {
                            "guid": "56213d7f-3e44-6a23-3e2b-95adaf702b4d",
                            "oGuids": {
                                "56213d7f-3e44-6a23-3e2b-95adaf702b4d": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "5f73946c-68aa-9de1-7979-736d884171af": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            },
                            "movedFrom": "/1303043463/1763546084/1823288916",
                            "ooGuids": {
                                "56213d7f-3e44-6a23-3e2b-95adaf702b4d": true,
                                "cbfe379c-c527-700e-3041-a0c22ca2a5d6": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "5f73946c-68aa-9de1-7979-736d884171af": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "2119137141": {
                            "guid": "45657d4d-f82d-13ce-1acb-0aadebb5c8b5",
                            "oGuids": {
                                "45657d4d-f82d-13ce-1acb-0aadebb5c8b5": true,
                                "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                                "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                                "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                                "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                                "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                            }
                        },
                        "childrenListChanged": true,
                        "guid": "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42",
                        "oGuids": {
                            "ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "5f73946c-68aa-9de1-7979-736d884171af": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };


            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultConflict.items[0].selected = 'theirs';
            resultPatch = core.applyResolution(resultConflict);
            // TODO: check if changes happened as expected.
        });


        it.skip('should applyTreeDiff: pointer spec change in meta', function () {
            var resultPatch,
                resultConflict,
                diff1 = {
                    "175547009": {
                        "pointer": {"src": null},
                        "meta": {
                            "pointers": {
                                "src": {
                                    "items": ["/175547009/471466181"],
                                    "min": 1,
                                    "max": 1,
                                    "minItems": [-1],
                                    "maxItems": [1]
                                }
                            }
                        },
                        "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                        "oGuids": {
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                },
                diff2 = {
                    "175547009": {
                        "pointer": {"src": null},
                        "meta": {
                            "pointers": {
                                "src": {
                                    "items": ["/175547009/1817665259"],
                                    "min": 1,
                                    "max": 1,
                                    "minItems": [-1],
                                    "maxItems": [1]
                                }
                            }
                        },
                        "guid": "d926b4e8-676d-709b-e10e-a6fe730e71f5",
                        "oGuids": {
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };


            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);
            console.log(JSON.stringify(resultPatch, null, 4));
            core.applyTreeDiff(rootNode, resultPatch); // FIXME: what if it results in an error?

            // TODO: check if changes happened as expected.
        });
    });
});

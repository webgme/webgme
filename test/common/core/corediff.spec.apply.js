/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('corediff apply', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'coreDiffApply',
        projectId = testFixture.projectName2Id(projectName),
        project,
        core,
        rootNode,
        commit,
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('corediff.spec.apply'),
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

    describe('apply', function () {

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
                    commit = result.commitHash;
                })
                .nodeify(done);
        });

        // FIXME: there is an issue if we try to delete non-existent project, it complains about auth issues.
        //afterEach(function (done) {
        //    storage.deleteProject({projectId: projectId})
        //        .nodeify(done);
        //});


        it('should modify several attributes', function (done) {
            var diff = {attr: {name: 'ROOTy'}, 1: {attr: {name: 'FCOy'}}};

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                expect(core.getAttribute(rootNode, 'name')).to.equal('ROOTy');
                core.loadByPath(rootNode, '/1', function (err, fco) {
                    if (err) {
                        return done(err);
                    }
                    expect(core.getAttribute(fco, 'name')).to.equal('FCOy');
                    done();
                });
            });
        });

        it('modifies registry of an object', function (done) {
            var diff = {
                1: {
                    reg: {DisplayFormat: '$name - 1', position: {x: 214, y: 94}},
                    guid: 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',
                    oGuids: {
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true
                    }
                },
                guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
            };

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });

        it.skip('should create a new object', function (done) {
            var diff = {
                "175547009": {
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
                "1455710678": {
                    "guid": "e0bc295f-fea6-dab5-bdd4-c5434903678f",
                    "removed": false,
                    "hash": "#34c8292e8b5a9ada71a53d91e52133b41989c2fc",
                    "pointer": {"base": "/1"}
                },
                "childrenListChanged": true,
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });

        it('should delete an object', function (done) {
            var diff = {
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

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });


        it('should remove a META sheet', function (done) {
            var diff = {
                "reg": {
                    "MetaSheets": [{
                        "SetID": "MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866",
                        "order": 0,
                        "title": "Renamed_META"
                    }]
                },
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });

        it('should add a new META sheet', function (done) {
            var diff = {
                "reg": {
                    "MetaSheets": [{
                        "SetID": "MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866",
                        "order": 0,
                        "title": "META"
                    }, {
                        "SetID": "MetaAspectSet_cd17a5a7-102e-b557-b9d5-4969743efad6",
                        "order": 1,
                        "title": "New META sheet"
                    }]
                },
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });

        it('should add a new META sheet with elements', function (done) {
            var diff = {
                "reg": {
                    "MetaSheets": [{
                        "SetID": "MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866",
                        "order": 0,
                        "title": "META"
                    }, {
                        "SetID": "MetaAspectSet_8c441f46-baab-0014-b3f3-c46ff333a7f4",
                        "order": 1,
                        "title": "New sheet"
                    }]
                },
                "set": {
                    "MetaAspectSet_8c441f46-baab-0014-b3f3-c46ff333a7f4": {
                        "/175547009/1104061497": {
                            "reg": {
                                "position": {
                                    "x": 527,
                                    "y": 286
                                }
                            }
                        },
                        "/1": {"reg": {"position": {"x": 481, "y": 93}}},
                        "/175547009/871430202": {"reg": {"position": {"x": 639, "y": 190}}},
                        "/175547009/471466181": {"reg": {"position": {"x": 271, "y": 185}}},
                        "/175547009/1817665259": {"reg": {"position": {"x": 893, "y": 196}}}
                    }
                },
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });


        it.skip('should add new META rules containment, pointers, sets', function (done) {
            var diff = {
                "1": {
                    "meta": {
                        "children": {
                            "minItems": {"0": -1},
                            "maxItems": {"0": -1},
                            "items": {"0": "/175547009/1104061497"}
                        }
                    },
                    "guid": "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045",
                    "oGuids": {
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
                        "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true
                    }
                },
                "175547009": {
                    "1104061497": {
                        "pointer": {"src": null, "dst": null},
                        "meta": {
                            "pointers": {
                                "setPtr": {
                                    "items": {
                                        "0": "/175547009/1817665259",
                                        "1": "/175547009/871430202"
                                    }, "minItems": {"1": -1}, "maxItems": {"1": -1}
                                },
                                "src": {"items": ["/175547009"], "min": 1, "max": 1, "minItems": [-1], "maxItems": [1]},
                                "dst": {
                                    "items": ["/175547009/471466181"],
                                    "min": 1,
                                    "max": 1,
                                    "minItems": [-1],
                                    "maxItems": [1]
                                }
                            }
                        },
                        "guid": "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb",
                        "oGuids": {
                            "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
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
                "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
            };

            core.applyTreeDiff(rootNode, diff, function (err) {
                if (err) {
                    return done(err);
                }
                // TODO: check if changes happened as expected.
                done();
            });
        });

        it('should delete META rules', function (done) {
            var diff = {
                "175547009": {
                    "471466181": {
                        "meta": {"children": "*to*delete*"},
                        "guid": "be36b1a1-8d82-8aba-9eda-03d655a8bf3e",
                        "oGuids": {
                            "be36b1a1-8d82-8aba-9eda-03d655a8bf3e": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1104061497": {
                        "meta": {"pointers": "*to*delete*"},
                        "guid": "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb",
                        "oGuids": {
                            "f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb": true,
                            "d926b4e8-676d-709b-e10e-a6fe730e71f5": true,
                            "86236510-f1c7-694f-1c76-9bad3a2aa4e0": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "meta": {"children": "*to*delete*"},
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

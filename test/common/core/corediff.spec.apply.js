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
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    describe('basic', function () {

        beforeEach(function (done) {
            storage.deleteProject({projectId: projectId})
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/ActivePanels.webgmex',
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

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/1');
                })
                .then(function (node) {
                    expect(node).not.to.equal(null);
                    expect(core.getRegistry(node, 'position')).to.deep.equal({x: 214, y: 94});
                    done();
                })
                .catch(done);
        });

        it('should create a new object', function (done) {
            var newNodeData = {
                    "_id": "#84970fc5e23cb4d48f4d11ecf084fa762a3c236c",
                    "atr": {
                        "_relguid": "ba62fc78ab8c04e73b715680b838acce"
                    },
                    "reg": {
                        "position": {
                            "x": 497,
                            "y": 429
                        }
                    }
                },
                diff = {
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
                    "499575639": {
                        "guid": "2187723f-5a4b-6da8-2707-cd2d8212082e",
                        "removed": false,
                        "hash": "#84970fc5e23cb4d48f4d11ecf084fa762a3c236c",
                        "pointer": {"base": "/175547009/471466181"}
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
                    "childrenListChanged": true,
                    "guid": "86236510-f1c7-694f-1c76-9bad3a2aa4e0",
                    "oGuids": {"86236510-f1c7-694f-1c76-9bad3a2aa4e0": true}
                };

            project._dbProject.insertObject(newNodeData)
                .then(function () {
                    return Q.nfcall(core.applyTreeDiff, rootNode, diff);
                })
                .then(function () {
                    expect(core.getChildrenRelids(rootNode)).to.include.members(['499575639']);
                    done();
                })
                .catch(done);
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

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    expect(core.getChildrenRelids(rootNode)).not.to.include.members(['1303043463']);
                    done();
                })
                .catch(done);
        });

        it('should rename a META sheet', function (done) {
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

            //pre-check to see if the name of the sheet is really 'META'
            expect(core.getRegistry(rootNode, 'MetaSheets')).to.have.length(1);
            expect(core.getRegistry(rootNode, 'MetaSheets')[0].title).to.equal('META');

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    expect(core.getRegistry(rootNode, 'MetaSheets')).to.have.length(1);
                    expect(core.getRegistry(rootNode, 'MetaSheets')[0].title).to.equal('Renamed_META');
                    done();
                })
                .catch(done);
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

            //pre-check to see if there is more than one sheet
            expect(core.getRegistry(rootNode, 'MetaSheets')).to.have.length(1);

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    expect(core.getRegistry(rootNode, 'MetaSheets')).to.have.length(2);
                    done();
                })
                .catch(done);
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

            //pre-check to see if there is more than one sheet
            expect(core.getRegistry(rootNode, 'MetaSheets')).to.have.length(1);

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    expect(core.getRegistry(rootNode, 'MetaSheets')).to.have.length(2);

                    //now check the elements of the new set
                    expect(core.getMemberPaths(rootNode, 'MetaAspectSet_8c441f46-baab-0014-b3f3-c46ff333a7f4'))
                        .to.have.members(['/175547009/1104061497',
                        '/175547009/1817665259',
                        '/1',
                        '/175547009/471466181',
                        '/175547009/871430202']);
                    done();
                })
                .catch(done);
        });

        it('should add new META rules containment, pointers, sets', function (done) {
            var diff = {
                "1": {
                    "meta": {
                        "children": {
                            "/175547009/1104061497": {
                                min: -1,
                                max: -1
                            }
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
                                    "/175547009/1817665259": {
                                        min: -1,
                                        max: -1
                                    },
                                    "/175547009/871430202": {
                                        min: -1,
                                        max: -1
                                    }
                                },
                                "src": {"/175547009": {min: -1, max: -1}, "min": 1, "max": 1},
                                "dst": {
                                    "/175547009/471466181": {min: -1, max: -1},
                                    "min": 1,
                                    "max": 1
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

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/1');
                })
                .then(function (node) {
                    //check the rules of /1
                    var jsonMeta = core.getJsonMeta(node);

                    expect(jsonMeta).not.to.eql({});
                    expect(jsonMeta.children.items).to.eql(['/175547009/1104061497']);

                    return Q.nfcall(core.loadByPath, rootNode, '/175547009/1104061497');
                })
                .then(function (node) {
                    //check the rules of /175547009/1104061497
                    var jsonMeta = core.getJsonMeta(node);

                    expect(jsonMeta).not.to.eql({});
                    expect(jsonMeta.pointers).to.have.keys('setPtr', 'src', 'dst');
                    expect(jsonMeta.pointers['setPtr'].items)
                        .to.have.members(['/175547009/1817665259', '/175547009/871430202']);
                    expect(jsonMeta.pointers['src'].items)
                        .to.have.members(['/175547009']);
                    expect(jsonMeta.pointers['dst'].items)
                        .to.have.members(['/175547009/471466181']);

                    done();
                })
                .catch(done);
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

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009/471466181');
                })
                .then(function (node) {
                    var jsonMeta = core.getJsonMeta(node);

                    expect(jsonMeta.attributes).to.include.keys('name');
                    expect(core.getValidChildrenPaths(node)).to.deep.equal([]);

                    return Q.nfcall(core.loadByPath, rootNode, '/175547009/1104061497');
                })
                .then(function (node) {
                    var jsonMeta = core.getJsonMeta(node);

                    expect(jsonMeta.attributes).to.include.keys('name');
                    expect(jsonMeta.pointers).to.deep.equal({});

                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    var jsonMeta = core.getJsonMeta(node);

                    expect(jsonMeta.attributes).to.include.keys('name');
                    expect(core.getValidChildrenPaths(node)).to.deep.equal([]);

                    done();
                })
                .catch(done);
        });

        it('should create a new subtree', function (done) {
            var diff = {
                E: {
                    902088723: {
                        pointer: {base: '/175547009/1817665259'},
                        guid: 'cc9d0d48-9d38-89ea-a0fc-5909e42811ae',
                        'oGuids': {
                            'cc9d0d48-9d38-89ea-a0fc-5909e42811ae': true,
                            'ba70829e-5e52-826f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1044885565: {
                        pointer: {base: '/175547009/871430202'},
                        guid: '07e5bd66-f0ad-9df6-aea4-23effabebb86'
                    },
                    1448030591: {
                        pointer: {
                            base: '/175547009/871430202'
                        },
                        guid: 'aa1a3bcc-0254-0552-f3c0-5cc64423f290',
                        oGuids: {
                            'aa1a3bcc-0254-0552-f3c0-5cc64423f290': true,
                            'ba70829e-5e52-826f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1763546084: {
                        249902827: {
                            pointer: {
                                base: '/175547009/1817665259'
                            }
                        },
                        1823288916: {
                            251993862: {
                                1219173128: {
                                    pointer: {
                                        base: '/175547009/471466181'
                                    }
                                },
                                pointer: {
                                    base: '/175547009/1817665259'
                                }
                            },
                            pointer: {
                                base: '/175547009/1817665259'
                            }
                        },
                        pointer: {
                            base: '/175547009/471466181'
                        },
                        guid: 'df95fa8c-a99f-000e-3041-a0c22ca2a5d6'
                    },
                    2119137141: {
                        pointer: {
                            base: '/175547009/1104061497'
                        },
                        guid: '510eb05d-9495-63ce-1acb-0aadebb5c8b5',
                        oGuids: {
                            '510eb05d-9495-63ce-1acb-0aadebb5c8b5': true,
                            'ba70829e-5e52-826f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: 'ba70829e-5e52-826f-93b3-ab9c8daa8a42',
                    removed: false,
                    hash: '#e54a4dcce022c601a808424bb76608b962dc435c',
                    pointer: {
                        base: '/175547009/1817665259'
                    },
                    oGuids: {
                        'ba70829e-5e52-826f-93b3-ab9c8daa8a42': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                        '5f73946c-68aa-9de1-7979-736d884171af': true,
                        'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                    }
                },
                guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                oGuids: {
                    '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true
                }
            };

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    expect(core.getChildrenRelids(rootNode)).to.include.members(['E']);
                    return Q.nfcall(core.loadByPath, rootNode, '/E/1763546084/1823288916/251993862/1219173128');
                })
                .then(function (node) {
                    expect(node).not.to.eql(null);
                    expect(core.getAttribute(node, 'name')).to.equal('GraphVizModel');
                    expect(core.getPointerPath(node, 'base')).to.equal('/175547009/471466181');
                })
                .nodeify(done);
        });

        it('should create new objects that has base relation among them', function (done) {
            var nOne = {
                    '_id': '#0000001111112222223333334444445555550001',
                    'atr': {
                        'name': 'N1',
                        '_relguid': 'ba62fc78ab8c04e73b715680b838acce'
                    },
                    "t1": '#0000001111112222223333334444445555550002'
                },
                tOne = {
                    '_id': '#0000001111112222223333334444445555550002',
                    'atr': {
                        'name': 'T1',
                        '_relguid': 'ba62fc78ab8c04e73b715680b838acce'
                    },
                    "c1": '#0000001111112222223333334444445555550003'
                },
                cOne = {
                    '_id': '#0000001111112222223333334444445555550003',
                    'atr': {
                        'name': 'C1',
                        '_relguid': 'ba62fc78ab8c04e73b715680b838acce'
                    }
                },
                nTwo = {
                    '_id': '#0000001111112222223333334444445555550004',
                    'atr': {
                        'name': 'N2',
                        '_relguid': 'ba62fc78ab8c04e73b715680b838acce'
                    },
                    "n3": '#0000001111112222223333334444445555550005'
                },
                nThree = {
                    '_id': '#0000001111112222223333334444445555550005',
                    'atr': {
                        'name': 'N3',
                        '_relguid': 'ba62fc78ab8c04e73b715680b838acce'
                    },
                    "t1p": '#0000001111112222223333334444445555550006'
                },
                tOnePrime = {
                    '_id': '#0000001111112222223333334444445555550006',
                    'atr': {
                        'name': 'T1P'
                    }
                },
                diff = {
                    n1: {
                        guid:'f51037c9-cf37-4324-ac1e-9c5cb7d5d777',
                        removed:false,
                        hash:'#0000001111112222223333334444445555550001',
                        pointer:{
                            base:'/175547009/1817665259'
                        },
                        t1:{
                            guid:'5ce367f7-cf58-4d18-8d8d-a3ee983ac18d',
                            pointer:{
                                base:'/175547009/1817665259'
                            },
                            c1:{
                                guid:'89f2afe9-cbcd-4a85-9f23-9e2c298d01eb',
                                pointer:{
                                    base:'/1'
                                }
                            }
                        }
                    },
                    n2:{
                        guid:'48e3e880-1eba-4159-9212-82bbbe0cfebe',
                        removed:false,
                        hash:'#0000001111112222223333334444445555550004',
                        pointer:{
                            base:'/175547009/1817665259'
                        },
                        n3:{
                            guid:'ec4973bc-edd3-4be7-a85b-bc944940b7e4',
                            pointer:{
                                base:'/175547009/1817665259'
                            },
                            t1p:{
                                pointer:{
                                    base:'/n1/t1'
                                }
                            }
                        }
                    },
                    childrenListChanged: true,
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            project._dbProject.insertObject(nOne)
                .then(function(){
                    return project._dbProject.insertObject(tOne);
                })
                .then(function(){
                    return project._dbProject.insertObject(cOne);
                })
                .then(function(){
                    return project._dbProject.insertObject(nTwo);
                })
                .then(function(){
                    return project._dbProject.insertObject(nThree);
                })
                .then(function(){
                    return project._dbProject.insertObject(tOnePrime);
                })
                .then(function () {
                    return Q.nfcall(core.applyTreeDiff, rootNode, diff);
                })
                .then(function () {
                    expect(core.getChildrenRelids(rootNode)).to.include.members(['n1','n2']);
                    return core.loadByPath(rootNode,'/n1/t1/c1');
                })
                .then(function(node){
                    expect(node).not.to.eql(null);
                    expect(core.getPath(core.getBase(node))).to.equal('/1');
                    expect(core.getAttribute(node,'name')).to.equal('C1');

                    return core.loadByPath(rootNode,'/n2/n3/t1p');
                })
                .then(function(node){
                    expect(node).not.to.eql(null);
                    expect(core.getPath(core.getBase(node))).to.equal('/n1/t1');
                    expect(core.getAttribute(node,'name')).to.equal('T1P');
                    expect(core.getChildrenPaths(node)).to.eql(['/n2/n3/t1p/c1']);

                    return core.loadByPath(rootNode,'/n2/n3/t1p/c1');
                })
                .then(function(node){
                    expect(node).not.to.eql(null);
                    expect(core.getPath(core.getBase(node))).to.equal('/n1/t1/c1');
                    expect(core.getAttribute(node,'name')).to.equal('C1');


                })
                .nodeify(done);
        });

        it('should ignore conflicting patch content', function (done) {
            var newRoot,
                diff = {
                    175547009: {
                        1817665259: {
                            guid: '5f73946c-68aa-9de1-7979-736d884171af',
                            removed: true
                        }
                    },
                    1303043463: {
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        attr: {
                            name: 'MyModel'
                        },
                        oGuids: {
                            '5f73946c-68aa-9de1-7979-736d884171af': true
                        }
                    },
                    b: {
                        hash: '#e54a4dcce022c601a808424bb76608b962dc435c',
                        removed: false,
                        oGuids: {
                            '5f73946c-68aa-9de1-7979-736d884171af': true
                        }
                    },
                    childrenListChanged: true,
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            Q.nfcall(core.applyTreeDiff, rootNode, diff)
                .then(function () {
                    //TODO check why we cannot have these type of changes without complete reload
                    core.persist(rootNode);
                    return core.loadRoot(core.getHash(rootNode));
                })
                .then(function (root) {
                    newRoot = root;
                    return core.loadByPath(newRoot, '/175547009');
                })
                .then(function (node) {
                    expect(core.getChildrenRelids(node)).not.to.include.members(['1817665259']);
                    return core.loadByPath(newRoot, '/1303043463');
                })
                .then(function (node) {
                    expect(node).to.equal(null);
                    return core.loadByPath(newRoot, '/b');
                })
                .then(function (node) {
                    expect(node).to.equal(null);
                })
                .nodeify(done);
        });
    });

    describe('pointer changes', function () {
        var pointerProjectName = 'applyPointerChangesTst',
            pointerProjectId = testFixture.projectName2Id(pointerProjectName),
            pointerGmeConfig = testFixture.getGmeConfig(),
            pointerLogger = logger.fork('pointer changes'),
            pointerProject,
            pointerCore,
            pointerRootNode,
            pointerBaseCommitHash;

        beforeEach(function (done) {
            storage.getProjects({})
                .then(function (projects) {
                    var remove = false,
                        i;
                    for (i = 0; i < projects.length; i += 1) {
                        if (projects[i]._id === pointerProjectId) {
                            remove = true;
                        }
                    }

                    if (remove) {
                        return storage.deleteProject({projectId: pointerProjectId});
                    } else {
                        return;
                    }
                })
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'test/common/core/corediff/base002.webgmex',
                        projectName: pointerProjectName,
                        branchName: 'base',
                        gmeConfig: pointerGmeConfig,
                        logger: pointerLogger
                    });
                })
                .then(function (result) {
                    pointerProject = result.project;
                    pointerCore = result.core;
                    pointerRootNode = result.rootNode;
                    pointerBaseCommitHash = result.commitHash;
                })
                .nodeify(done);
        });

        //FIXME: This started to fail with webgmex as seed.
        it('should set a pointer target that was also moved', function (done) {
            // move /579542227/1532094116 under root
            // set dst of /579542227/275896267 to the moved node
            var patch = {
                "579542227": {
                    "275896267": {
                        "guid": "ef8775b4-c7fd-12ae-8db1-cc46f807249b",
                        "oGuids": {
                            "ef8775b4-c7fd-12ae-8db1-cc46f807249b": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "6856a087-613e-3740-ca5d-87a41990c562": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "pointer": {
                            "dst": "/1532094116"
                        }
                    },
                    "651215756": {
                        "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
                        "oGuids": {
                            "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "684921282": {
                        "guid": "cd8757f7-0ee5-404c-74f3-c700879b9637",
                        "oGuids": {
                            "cd8757f7-0ee5-404c-74f3-c700879b9637": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "6856a087-613e-3740-ca5d-87a41990c562": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "2088994530": {
                        "guid": "32e4adfc-deac-43ae-2504-3563b9d58b97",
                        "oGuids": {
                            "32e4adfc-deac-43ae-2504-3563b9d58b97": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "childrenListChanged": true,
                    "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
                    "oGuids": {
                        "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                        "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                        "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                        "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "960660211": {
                    "1365653822": {
                        "guid": "ef6d34f0-e1b2-f134-0fa1-d642815d0afa",
                        "oGuids": {
                            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "2141283821": {
                        "guid": "6856a087-613e-3740-ca5d-87a41990c562",
                        "oGuids": {
                            "6856a087-613e-3740-ca5d-87a41990c562": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "8f6f4417-55b5-bf91-e4d6-447f6ced13e6",
                    "oGuids": {
                        "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                        "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "1532094116": {
                    "reg": {
                        "position": {
                            "x": 484,
                            "y": 176
                        }
                    },
                    "guid": "99fab26a-2b18-2dd7-0b7b-836340b62398",
                    "oGuids": {
                        "99fab26a-2b18-2dd7-0b7b-836340b62398": true,
                        "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                        "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                        "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    },
                    "movedFrom": "/579542227/1532094116",
                    "ooGuids": {
                        "99fab26a-2b18-2dd7-0b7b-836340b62398": true,
                        "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                        "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                        "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                        "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "1786679144": {
                    "guid": "8b636e17-3e94-e0c6-2678-1a24ee5e6ae7",
                    "oGuids": {
                        "8b636e17-3e94-e0c6-2678-1a24ee5e6ae7": true,
                        "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                        "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                        "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "childrenListChanged": true,
                "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
                "oGuids": {
                    "e687d284-a04a-7cbc-93ed-ea941752d57a": true
                }
            };
            Q.nfcall(pointerCore.applyTreeDiff, pointerRootNode, patch)
                .then(function () {
                    return Q.allDone([
                        pointerCore.loadByPath(pointerRootNode, '/579542227/275896267'),
                        pointerCore.loadByPath(pointerRootNode, '/1532094116')
                    ]);
                })
                .then(function (nodes) {
                    expect(nodes).to.have.length(2);
                    expect(pointerCore.getPointerPath(nodes[0], 'dst')).to.equal(pointerCore.getPath(nodes[1]));
                })
                .nodeify(done);
        });

        it('should set a pointer target while changig the name of the target as well', function (done) {
            // change /579542227/1532094116 name to 3_1
            // set dst of /579542227/275896267 to the changed node
            var patch = {
                "579542227": {
                    "275896267": {
                        "pointer": {
                            "dst": "/579542227/1532094116"
                        },
                        "guid": "ef8775b4-c7fd-12ae-8db1-cc46f807249b",
                        "oGuids": {
                            "ef8775b4-c7fd-12ae-8db1-cc46f807249b": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "6856a087-613e-3740-ca5d-87a41990c562": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "684921282": {
                        "guid": "cd8757f7-0ee5-404c-74f3-c700879b9637",
                        "oGuids": {
                            "cd8757f7-0ee5-404c-74f3-c700879b9637": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "6856a087-613e-3740-ca5d-87a41990c562": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "1532094116": {
                        "attr": {
                            "name": "3_1"
                        },
                        "guid": "99fab26a-2b18-2dd7-0b7b-836340b62398",
                        "oGuids": {
                            "99fab26a-2b18-2dd7-0b7b-836340b62398": true,
                            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
                    "oGuids": {
                        "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
                        "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
                        "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
                        "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
                "oGuids": {
                    "e687d284-a04a-7cbc-93ed-ea941752d57a": true
                }
            };

            Q.nfcall(pointerCore.applyTreeDiff, pointerRootNode, patch)
                .then(function () {
                    return Q.allDone([
                        pointerCore.loadByPath(pointerRootNode, '/579542227/275896267'),
                        pointerCore.loadByPath(pointerRootNode, '/579542227/1532094116')
                    ]);
                })
                .then(function (nodes) {
                    expect(nodes).to.have.length(2);
                    expect(pointerCore.getPointerPath(nodes[0], 'dst')).to.equal(pointerCore.getPath(nodes[1]));
                })
                .nodeify(done);
        });
    });
});

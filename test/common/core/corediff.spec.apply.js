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
        Mongo = require('../../../src/server/storage/mongo'),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('corediff.spec.apply'),
        storage,

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                //because we push data objects directly into the database we needed it to be mongo
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allSettled([
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
            var pushNodeDataIntoStorage = function (data, callback) {
                    var deferred = Q.defer(),
                        mongo = new Mongo(logger.fork('directMongoAccess'), gmeConfig);

                    Q.nfcall(mongo.openDatabase)
                        .then(function () {
                            return Q.nfcall(mongo.openProject, projectId);
                        })
                        .then(function (project) {
                            return project.insertObject(data);
                        })
                        .then(function () {
                            deferred.resolve();
                        })
                        .catch(deferred.reject);

                    return deferred.promise.nodeify(callback);
                },
                newNodeData = {
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

            pushNodeDataIntoStorage(newNodeData)
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
    });
});

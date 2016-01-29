/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('jsonPatcher', function () {
    'use strict';
    var patcher = testFixture.requirejs('common/util/jsonPatcher'),
        expect = testFixture.expect;

    describe('create', function () {
        it('should create a valid patch with add operation', function () {
            expect(patcher.create({one: 1}, {one: 1, two: 2})).to.eql([{op: 'add', path: '/two', value: 2}]);
        });

        it('should create a valid patch with replace operation', function () {
            expect(patcher.create({one: 1}, {one: 2})).to.eql([{op: 'replace', path: '/one', value: 2}]);
        });

        it('should create a valid patch with remove operation', function () {
            expect(patcher.create({one: 1, two: 2}, {one: 1})).to.eql([{op: 'remove', path: '/two'}]);
        });
    });

    describe('apply', function () {
        it('should add a new field', function () {
            var result = patcher.apply({one: 1}, [{op: 'add', path: '/two', value: 2}]);

            expect(result.status).to.equal('success');
            expect(result.faults).to.have.length(0);
            expect(result.result).to.eql({one: 1, two: 2});
        });

        it('should replace a field', function () {
            var result = patcher.apply({one: 1}, [{op: 'replace', path: '/one', value: 2}]);

            expect(result.status).to.equal('success');
            expect(result.faults).to.have.length(0);
            expect(result.result).to.eql({one: 2});
        });

        it('should remove a field', function () {
            var result = patcher.apply({one: 1}, [{op: 'remove', path: '/one'}]);

            expect(result.status).to.equal('success');
            expect(result.faults).to.have.length(0);
            expect(result.result).to.eql({});
        });

        it('should remove an inner field', function () {
            var result = patcher.apply({one:{two:3}}, [{op: 'remove', path: '/one/two'}]);

            expect(result.status).to.equal('success');
            expect(result.faults).to.have.length(0);
            expect(result.result).to.eql({one:{}});
        });

        it('should fail to patch if operation path is not a string', function () {
            var result = patcher.apply({}, [{op: 'add', path: 2, value: 3}]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(1);
            expect(result.result).to.eql({});

            result = patcher.apply({}, [{op: 'remove', path: 2}]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(1);
            expect(result.result).to.eql({});

            result = patcher.apply({}, [{op: 'replace', path: 2, value: 3}]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(1);
            expect(result.result).to.eql({});
        });

        it('should fail to patch unknown operation', function () {
            var result = patcher.apply({}, [{op: 'move', path: '2'}]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(1);
            expect(result.result).to.eql({});

        });

        it('should fail to patch if value is missing', function () {
            var result = patcher.apply({}, [{op: 'add', path: '2'}]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(1);
            expect(result.result).to.eql({});

            result = patcher.apply({}, [{op: 'replace', path: '2'}]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(1);
            expect(result.result).to.eql({});
        });

        it('should patch normal operations and ignore faulty ones', function () {
            var result = patcher.apply({}, [
                {op: 'replace', path: '/2/3', value: 2},
                {op: 'remove', path: '/2/3'},
                {op: 'add', path: '/2/3', value: 4}
            ]);

            expect(result.status).to.equal('fail');
            expect(result.faults).to.have.length(2);
            expect(result.result).to.eql({2: {3: 4}});
        });
    });

    describe('real root patch', function () {
        //real root tests
        it('should handle object move on META sheet', function () {
            var sRootData = {
                    "_id": "#a9f2b83f1705b138a869264b41f121c17cd67e06",
                    "1": "#7f9626a859234e2a6948b3dd925fcd48ebc0a46e",
                    "_nullptr": {"atr": {"name": "_null_pointer"}},
                    "ovr": {
                        "": {"base": "/_nullptr"},
                        "/_nullptr": {"base-inv": [""]},
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/1": {"member-inv": ["/_sets/MetaAspectSet/356203123", "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383", "/_meta/children/_sets/items/1110461788"]},
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"}
                    },
                    "atr": {"_relguid": "03d360729e097866cb4ed0a36ff825f6", "name": "ROOT"},
                    "reg": {
                        "MetaSheets": [{
                            "SetID": "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d",
                            "order": 0,
                            "title": "META"
                        }],
                        "ProjectRegistry": {"FCO_ID": "/1"},
                        "usedAddOns": "",
                        "validPlugins": "",
                        "validDecorators": "ModelDecorator CircleDecorator MetaDecorator SVGDecorator UMLStateMachineDecorator DefaultDecorator",
                        "validVisualizers": "ModelEditor METAAspect",
                        "_sets_": 8
                    },
                    "_sets": {
                        "MetaAspectSet": {
                            "356203123": {"reg": {"_": "_", "position": {"x": 100, "y": 100}}},
                            "reg": {"_": "_"}
                        },
                        "_nullptr": {"atr": {"name": "_null_pointer"}},
                        "ovr": {
                            "": {
                                "MetaAspectSet": "/_nullptr",
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": "/_nullptr"
                            },
                            "/_nullptr": {
                                "MetaAspectSet-inv": [""],
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv": [""]
                            }
                        },
                        "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": {
                            "1115143383": {
                                "reg": {
                                    "_": "_",
                                    "position": {"x": 100, "y": 100}
                                }
                            }, "reg": {"_": "_"}
                        }
                    },
                    "_meta": {
                        "atr": {"name": {"type": "string"}},
                        "children": {
                            "_sets": {
                                "items": {
                                    "1110461788": {"reg": {"_": "_"}, "atr": {"min": -1, "max": -1}},
                                    "reg": {"_": "_"}
                                },
                                "_nullptr": {"atr": {"name": "_null_pointer"}},
                                "ovr": {"": {"items": "/_nullptr"}, "/_nullptr": {"items-inv": [""]}}
                            }, "reg": {"_sets_": 4}
                        }
                    }
                },
                tRootData = {
                    "_id": "#89475012bbb2364f60e257a0cfbe65aff2afc13c",
                    "1": "#7f9626a859234e2a6948b3dd925fcd48ebc0a46e",
                    "_nullptr": {"atr": {"name": "_null_pointer"}},
                    "ovr": {
                        "": {"base": "/_nullptr"},
                        "/_nullptr": {"base-inv": [""]},
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/1": {"member-inv": ["/_sets/MetaAspectSet/356203123", "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383", "/_meta/children/_sets/items/1110461788"]},
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"}
                    },
                    "atr": {"_relguid": "03d360729e097866cb4ed0a36ff825f6", "name": "ROOT"},
                    "reg": {
                        "MetaSheets": [{
                            "SetID": "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d",
                            "order": 0,
                            "title": "META"
                        }],
                        "ProjectRegistry": {"FCO_ID": "/1"},
                        "usedAddOns": "",
                        "validPlugins": "",
                        "validDecorators": "ModelDecorator CircleDecorator MetaDecorator SVGDecorator UMLStateMachineDecorator DefaultDecorator",
                        "validVisualizers": "ModelEditor METAAspect",
                        "_sets_": 9
                    },
                    "_sets": {
                        "MetaAspectSet": {
                            "356203123": {"reg": {"_": "_", "position": {"x": 100, "y": 100}}},
                            "reg": {"_": "_"}
                        },
                        "_nullptr": {"atr": {"name": "_null_pointer"}},
                        "ovr": {
                            "": {
                                "MetaAspectSet": "/_nullptr",
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": "/_nullptr"
                            },
                            "/_nullptr": {
                                "MetaAspectSet-inv": [""],
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv": [""]
                            }
                        },
                        "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": {
                            "1115143383": {
                                "reg": {
                                    "_": "_",
                                    "position": {"x": 409, "y": 267}
                                }
                            }, "reg": {"_": "_"}
                        }
                    },
                    "_meta": {
                        "atr": {"name": {"type": "string"}},
                        "children": {
                            "_sets": {
                                "items": {
                                    "1110461788": {
                                        "reg": {"_": "_"},
                                        "atr": {"min": -1, "max": -1}
                                    }, "reg": {"_": "_"}
                                },
                                "_nullptr": {"atr": {"name": "_null_pointer"}},
                                "ovr": {"": {"items": "/_nullptr"}, "/_nullptr": {"items-inv": [""]}}
                            }, "reg": {"_sets_": 4}
                        }
                    }
                },
                patch = patcher.create(sRootData, tRootData),
                patchRoot = patcher.apply(sRootData, patch);

            expect(patch).to.have.length(2);
            expect(patch).to.eql([
                {op: 'replace', path: '/reg/_sets_', value: 9},
                {
                    op: 'replace',
                    path: '/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383',
                    value: {reg: {'_': '_', position: {x: 409, y: 267}}}
                }
            ]);

            //the _id field is ignored during patch so we have to set that manually
            patchRoot.result._id = tRootData._id;
            expect(patchRoot.result).to.eql(tRootData);
        });

        it('should handle new item creation on meta sheet', function () {
            var sRootData = {
                    "_id": "#89475012bbb2364f60e257a0cfbe65aff2afc13c",
                    "1": "#7f9626a859234e2a6948b3dd925fcd48ebc0a46e",
                    "_nullptr": {"atr": {"name": "_null_pointer"}},
                    "ovr": {
                        "": {"base": "/_nullptr"},
                        "/_nullptr": {"base-inv": [""]},
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/1": {"member-inv": ["/_sets/MetaAspectSet/356203123", "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383", "/_meta/children/_sets/items/1110461788"]},
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"}
                    },
                    "atr": {"_relguid": "03d360729e097866cb4ed0a36ff825f6", "name": "ROOT"},
                    "reg": {
                        "MetaSheets": [{
                            "SetID": "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d",
                            "order": 0,
                            "title": "META"
                        }],
                        "ProjectRegistry": {"FCO_ID": "/1"},
                        "usedAddOns": "",
                        "validPlugins": "",
                        "validDecorators": "ModelDecorator CircleDecorator MetaDecorator SVGDecorator UMLStateMachineDecorator DefaultDecorator",
                        "validVisualizers": "ModelEditor METAAspect",
                        "_sets_": 9
                    },
                    "_sets": {
                        "MetaAspectSet": {
                            "356203123": {"reg": {"_": "_", "position": {"x": 100, "y": 100}}},
                            "reg": {"_": "_"}
                        },
                        "_nullptr": {"atr": {"name": "_null_pointer"}},
                        "ovr": {
                            "": {
                                "MetaAspectSet": "/_nullptr",
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": "/_nullptr"
                            },
                            "/_nullptr": {
                                "MetaAspectSet-inv": [""],
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv": [""]
                            }
                        },
                        "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": {
                            "1115143383": {
                                "reg": {
                                    "_": "_",
                                    "position": {"x": 409, "y": 267}
                                }
                            }, "reg": {"_": "_"}
                        }
                    },
                    "_meta": {
                        "atr": {"name": {"type": "string"}},
                        "children": {
                            "_sets": {
                                "items": {
                                    "1110461788": {
                                        "reg": {"_": "_"},
                                        "atr": {"min": -1, "max": -1}
                                    }, "reg": {"_": "_"}
                                },
                                "_nullptr": {"atr": {"name": "_null_pointer"}},
                                "ovr": {"": {"items": "/_nullptr"}, "/_nullptr": {"items-inv": [""]}}
                            }, "reg": {"_sets_": 4}
                        }
                    }
                },
                tRootData = {
                    "_id": "#88ce6d69905c37c27c3b49f9a6d852a924675e3b",
                    "1": "#7f9626a859234e2a6948b3dd925fcd48ebc0a46e",
                    "1424125309": "#4c345d86adc930de09bd2de0f807b9af4e21d164",
                    "_nullptr": {"atr": {"name": "_null_pointer"}},
                    "ovr": {
                        "": {"base": "/_nullptr"},
                        "/_nullptr": {"base-inv": [""]},
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/1": {
                            "member-inv": ["/_sets/MetaAspectSet/356203123", "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383", "/_meta/children/_sets/items/1110461788"],
                            "base-inv": ["/1424125309"]
                        },
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"},
                        "/1424125309": {
                            "base": "/1",
                            "member-inv": ["/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470", "/_sets/MetaAspectSet/575169369"]
                        },
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470": {"member": "/1424125309"},
                        "/_sets/MetaAspectSet/575169369": {"member": "/1424125309"}
                    },
                    "atr": {"_relguid": "03d360729e097866cb4ed0a36ff825f6", "name": "ROOT"},
                    "reg": {
                        "MetaSheets": [{
                            "SetID": "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d",
                            "order": 0,
                            "title": "META"
                        }],
                        "ProjectRegistry": {"FCO_ID": "/1"},
                        "usedAddOns": "",
                        "validPlugins": "",
                        "validDecorators": "ModelDecorator CircleDecorator MetaDecorator SVGDecorator UMLStateMachineDecorator DefaultDecorator",
                        "validVisualizers": "ModelEditor METAAspect",
                        "_sets_": 15
                    },
                    "_sets": {
                        "MetaAspectSet": {
                            "356203123": {"reg": {"_": "_", "position": {"x": 100, "y": 100}}},
                            "575169369": {"reg": {"_": "_", "position": {"x": 106, "y": 56}}},
                            "reg": {"_": "_"}
                        },
                        "_nullptr": {"atr": {"name": "_null_pointer"}},
                        "ovr": {
                            "": {
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": "/_nullptr",
                                "MetaAspectSet": "/_nullptr"
                            },
                            "/_nullptr": {
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv": [""],
                                "MetaAspectSet-inv": [""]
                            }
                        },
                        "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": {
                            "1115143383": {
                                "reg": {
                                    "_": "_",
                                    "position": {"x": 409, "y": 267}
                                }
                            }, "1338066470": {"reg": {"_": "_", "position": {"x": 106, "y": 56}}}, "reg": {"_": "_"}
                        }
                    },
                    "_meta": {
                        "atr": {"name": {"type": "string"}},
                        "children": {
                            "_sets": {
                                "items": {
                                    "1110461788": {
                                        "reg": {"_": "_"},
                                        "atr": {"min": -1, "max": -1}
                                    }, "reg": {"_": "_"}
                                },
                                "_nullptr": {"atr": {"name": "_null_pointer"}},
                                "ovr": {"": {"items": "/_nullptr"}, "/_nullptr": {"items-inv": [""]}}
                            }, "reg": {"_sets_": 4}
                        }
                    }
                },
                patch = patcher.create(sRootData, tRootData),
                patchRoot = patcher.apply(sRootData, patch);

            expect(patch).to.eql([
                {
                    op: 'add',
                    path: '/1424125309',
                    value: '#4c345d86adc930de09bd2de0f807b9af4e21d164'
                },
                {
                    op: 'replace',
                    path: '/reg/_sets_',
                    value: 15
                },
                {
                    op: 'add',
                    path: '/ovr/%2f1424125309',
                    value: {
                        base: '/1', 'member-inv': [
                            "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470",
                            "/_sets/MetaAspectSet/575169369"
                        ]
                    }
                },
                {
                    op: 'add',
                    path: '/ovr/%2f_sets%2fMetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d%2f1338066470',
                    value: {member: '/1424125309'}
                },
                {
                    op: 'add',
                    path: '/ovr/%2f_sets%2fMetaAspectSet%2f575169369',
                    value: {member: '/1424125309'}
                },
                {
                    op: 'add',
                    path: '/ovr/%2f1/base-inv',
                    value: ['/1424125309']
                },
                {
                    op: 'add',
                    path: '/_sets/MetaAspectSet/575169369',
                    value: {reg: {'_': '_', position: {x: 106, y: 56}}}
                },
                {
                    op: 'add',
                    path: '/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470',
                    value: {reg: {'_': '_', position: {x: 106, y: 56}}}
                }]);

            //the _id field is ignored during patch so we have to set that manually
            patchRoot.result._id = tRootData._id;
            expect(patchRoot.result).to.eql(tRootData);
        });

        it('should handle the creation of a new Meta sheet', function () {
            var sRootData = {
                    "_id": "#88ce6d69905c37c27c3b49f9a6d852a924675e3b",
                    "1": "#7f9626a859234e2a6948b3dd925fcd48ebc0a46e",
                    "1424125309": "#4c345d86adc930de09bd2de0f807b9af4e21d164",
                    "_nullptr": {"atr": {"name": "_null_pointer"}},
                    "ovr": {
                        "": {"base": "/_nullptr"},
                        "/_nullptr": {"base-inv": [""]},
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/1": {
                            "member-inv": ["/_sets/MetaAspectSet/356203123", "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383", "/_meta/children/_sets/items/1110461788"],
                            "base-inv": ["/1424125309"]
                        },
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"},
                        "/1424125309": {
                            "base": "/1",
                            "member-inv": ["/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470", "/_sets/MetaAspectSet/575169369"]
                        },
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470": {"member": "/1424125309"},
                        "/_sets/MetaAspectSet/575169369": {"member": "/1424125309"}
                    },
                    "atr": {"_relguid": "03d360729e097866cb4ed0a36ff825f6", "name": "ROOT"},
                    "reg": {
                        "MetaSheets": [{
                            "SetID": "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d",
                            "order": 0,
                            "title": "META"
                        }],
                        "ProjectRegistry": {"FCO_ID": "/1"},
                        "usedAddOns": "",
                        "validPlugins": "",
                        "validDecorators": "ModelDecorator CircleDecorator MetaDecorator SVGDecorator UMLStateMachineDecorator DefaultDecorator",
                        "validVisualizers": "ModelEditor METAAspect",
                        "_sets_": 15
                    },
                    "_sets": {
                        "MetaAspectSet": {
                            "356203123": {"reg": {"_": "_", "position": {"x": 100, "y": 100}}},
                            "575169369": {"reg": {"_": "_", "position": {"x": 106, "y": 56}}},
                            "reg": {"_": "_"}
                        },
                        "_nullptr": {"atr": {"name": "_null_pointer"}},
                        "ovr": {
                            "": {
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": "/_nullptr",
                                "MetaAspectSet": "/_nullptr"
                            },
                            "/_nullptr": {
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv": [""],
                                "MetaAspectSet-inv": [""]
                            }
                        },
                        "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": {
                            "1115143383": {
                                "reg": {
                                    "_": "_",
                                    "position": {"x": 409, "y": 267}
                                }
                            }, "1338066470": {"reg": {"_": "_", "position": {"x": 106, "y": 56}}}, "reg": {"_": "_"}
                        }
                    },
                    "_meta": {
                        "atr": {"name": {"type": "string"}},
                        "children": {
                            "_sets": {
                                "items": {
                                    "1110461788": {
                                        "reg": {"_": "_"},
                                        "atr": {"min": -1, "max": -1}
                                    }, "reg": {"_": "_"}
                                },
                                "_nullptr": {"atr": {"name": "_null_pointer"}},
                                "ovr": {"": {"items": "/_nullptr"}, "/_nullptr": {"items-inv": [""]}}
                            }, "reg": {"_sets_": 4}
                        }
                    }
                },
                tRootData = {
                    "_id": "#f953061420de15df8710958ae206c426753a4aec",
                    "1": "#7f9626a859234e2a6948b3dd925fcd48ebc0a46e",
                    "1424125309": "#4c345d86adc930de09bd2de0f807b9af4e21d164",
                    "_nullptr": {"atr": {"name": "_null_pointer"}},
                    "ovr": {
                        "": {"base": "/_nullptr"},
                        "/_nullptr": {"base-inv": [""]},
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/1": {
                            "member-inv": ["/_sets/MetaAspectSet/356203123", "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383", "/_meta/children/_sets/items/1110461788"],
                            "base-inv": ["/1424125309"]
                        },
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"},
                        "/1424125309": {
                            "base": "/1",
                            "member-inv": ["/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470", "/_sets/MetaAspectSet/575169369"]
                        },
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1338066470": {"member": "/1424125309"},
                        "/_sets/MetaAspectSet/575169369": {"member": "/1424125309"}
                    },
                    "atr": {"_relguid": "03d360729e097866cb4ed0a36ff825f6", "name": "ROOT"},
                    "reg": {
                        "MetaSheets": [{
                            "SetID": "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d",
                            "order": 0,
                            "title": "META"
                        }, {
                            "SetID": "MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8",
                            "order": 1,
                            "title": "MyNewSheet"
                        }],
                        "ProjectRegistry": {"FCO_ID": "/1"},
                        "usedAddOns": "",
                        "validPlugins": "",
                        "validDecorators": "ModelDecorator CircleDecorator MetaDecorator SVGDecorator UMLStateMachineDecorator DefaultDecorator",
                        "validVisualizers": "ModelEditor METAAspect",
                        "_sets_": 16
                    },
                    "_sets": {
                        "MetaAspectSet": {
                            "356203123": {"reg": {"_": "_", "position": {"x": 100, "y": 100}}},
                            "575169369": {"reg": {"_": "_", "position": {"x": 106, "y": 56}}},
                            "reg": {"_": "_"}
                        },
                        "_nullptr": {"atr": {"name": "_null_pointer"}},
                        "ovr": {
                            "": {
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": "/_nullptr",
                                "MetaAspectSet": "/_nullptr",
                                "MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8": "/_nullptr"
                            },
                            "/_nullptr": {
                                "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv": [""],
                                "MetaAspectSet-inv": [""],
                                "MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8-inv": [""]
                            }
                        },
                        "MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d": {
                            "1115143383": {
                                "reg": {
                                    "_": "_",
                                    "position": {"x": 409, "y": 267}
                                }
                            }, "1338066470": {"reg": {"_": "_", "position": {"x": 106, "y": 56}}}, "reg": {"_": "_"}
                        },
                        "MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8": {"reg": {"_": "_"}}
                    },
                    "_meta": {
                        "atr": {"name": {"type": "string"}},
                        "children": {
                            "_sets": {
                                "items": {
                                    "1110461788": {
                                        "reg": {"_": "_"},
                                        "atr": {"min": -1, "max": -1}
                                    }, "reg": {"_": "_"}
                                },
                                "_nullptr": {"atr": {"name": "_null_pointer"}},
                                "ovr": {"": {"items": "/_nullptr"}, "/_nullptr": {"items-inv": [""]}}
                            }, "reg": {"_sets_": 4}
                        }
                    }
                },
                patch = patcher.create(sRootData, tRootData),
                patchRoot = patcher.apply(sRootData, patch);

            expect(patch).to.eql([
                {
                    op: 'replace',
                    path: '/reg/MetaSheets',
                    value: [
                        {
                            SetID: 'MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d',
                            order: 0,
                            title: 'META'
                        },
                        {
                            SetID: 'MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8',
                            order: 1,
                            title: 'MyNewSheet'
                        }
                    ]
                },
                {op: 'replace', path: '/reg/_sets_', value: 16},
                {
                    op: 'add',
                    path: '/_sets/MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8',
                    value: {reg: {'_': '_'}}
                },
                {
                    op: 'replace',
                    path: '/_sets/ovr/',
                    value: {
                        'MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d': '/_nullptr',
                        MetaAspectSet: '/_nullptr',
                        'MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8': '/_nullptr'
                    }
                },
                {
                    op: 'replace',
                    path: '/_sets/ovr/%2f_nullptr',
                    value: {
                        'MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d-inv': [''],
                        'MetaAspectSet-inv': [''],
                        'MetaAspectSet_4f4febdd-dcc7-8865-7623-7a902a6096f8-inv': ['']
                    }
                }]);

            //the _id field is ignored during patch so we have to set that manually
            patchRoot.result._id = tRootData._id;
            expect(patchRoot.result).to.eql(tRootData);
        });
    });
});

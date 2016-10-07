// jscs:disable
/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
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
            var result = patcher.apply({one: {two: 3}}, [{op: 'remove', path: '/one/two'}]);

            expect(result.status).to.equal('success');
            expect(result.faults).to.have.length(0);
            expect(result.result).to.eql({one: {}});
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
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
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
                                "ovr": {"": {"items": "/_nullptr"}}
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
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
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
                                "ovr": {"": {"items": "/_nullptr"}}
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
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
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
                                "ovr": {"": {"items": "/_nullptr"}}
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
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"},
                        "/1424125309": {"base": "/1"},
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
                                "ovr": {"": {"items": "/_nullptr"}}
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
                        base: '/1'
                    },
                    partials:['/1']
                },
                {
                    op: 'add',
                    path: '/ovr/%2f_sets%2fMetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d%2f1338066470',
                    value: {member: '/1424125309'},
                    partials:['/1424125309']
                },
                {
                    op: 'add',
                    path: '/ovr/%2f_sets%2fMetaAspectSet%2f575169369',
                    value: {member: '/1424125309'},
                    partials:['/1424125309']
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
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"},
                        "/1424125309": {"base": "/1"},
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
                                "ovr": {"": {"items": "/_nullptr"}}
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
                        "/_sets/MetaAspectSet/356203123": {"member": "/1"},
                        "/_sets/MetaAspectSet_68f8146d-b1b7-6c40-3464-f8c070e97e8d/1115143383": {"member": "/1"},
                        "/_meta/children/_sets/items/1110461788": {"member": "/1"},
                        "/1424125309": {"base": "/1"},
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
                                "ovr": {"": {"items": "/_nullptr"}}
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
                }]);

            //the _id field is ignored during patch so we have to set that manually
            patchRoot.result._id = tRootData._id;
            expect(patchRoot.result).to.eql(tRootData);
        });
    });

    describe('getChangedNodes', function () {

        describe('atomic UI changes', function () {
            it('should trigger node update on rename', function () {
                var patch = {
                        "#fb0486e86f0ad0898912e0b4e255122e0350aeb4": {
                            "type": "patch",
                            "base": "#8fecce4f3794188b854414a80fd9638fc1d07e68",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/atr/name",
                                    "value": "newName"
                                }
                            ],
                            "_id": "#fb0486e86f0ad0898912e0b4e255122e0350aeb4"
                        },
                        "#16092f7ac5d8f1e24f0de9d98b7a81d06aa5b338": {
                            "type": "patch",
                            "base": "#a6293984b74258e3545fc97f2b1fc2755fcdd305",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/0",
                                    "value": "#fb0486e86f0ad0898912e0b4e255122e0350aeb4"
                                }
                            ],
                            "_id": "#16092f7ac5d8f1e24f0de9d98b7a81d06aa5b338"
                        }
                    },
                    rootHash = "#16092f7ac5d8f1e24f0de9d98b7a81d06aa5b338",
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {},
                    "unload": {},
                    "update": {
                        "/0": true
                    }
                });
            });

            it('should trigger root and src update, and partial for target when assigning ptr', function () {
                var patch = {
                        "#133828453a145c33dbf15e575a78fc643769e261": {
                            "type": "patch",
                            "base": "#16092f7ac5d8f1e24f0de9d98b7a81d06aa5b338",
                            "patch": [
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fV%2ft/pointer",
                                    "value": "/0",
                                    "partials":["/0"]
                                }
                            ],
                            "_id": "#133828453a145c33dbf15e575a78fc643769e261"
                        }
                    },
                    rootHash = '#133828453a145c33dbf15e575a78fc643769e261',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/0": true
                    },
                    "unload": {},
                    "update": {
                        "/V/t": true
                    }
                });
            });

            it('should trigger partial for base and load for new node', function () {
                var patch = {
                        "#d19c1afb79df6d2f1f4fd8f36ac246758bbdd03d": {
                            "_id": "#d19c1afb79df6d2f1f4fd8f36ac246758bbdd03d",
                            "atr": {
                                "_relguid": "6192aa8225261b0f1bded6a1cf46ab5d"
                            },
                            "reg": {
                                "position": {
                                    "x": 323,
                                    "y": 462
                                }
                            }
                        },
                        "#b5531098ab865da6929de708187f4bf069b6bdf1": {
                            "type": "patch",
                            "base": "#133828453a145c33dbf15e575a78fc643769e261",
                            "patch": [
                                {
                                    "op": "add",
                                    "path": "/z",
                                    "value": "#d19c1afb79df6d2f1f4fd8f36ac246758bbdd03d"
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fz",
                                    "value": {
                                        "base": "/X"
                                    },
                                    "partials":["/X"]
                                }
                            ],
                            "_id": "#b5531098ab865da6929de708187f4bf069b6bdf1"
                        }
                    },
                    rootHash = '#b5531098ab865da6929de708187f4bf069b6bdf1',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {
                        "/z": true
                    },
                    "partialUpdate": {
                        "/X": true
                    },
                    "unload": {},
                    "update": {}
                });
            });

            it('should trigger partial for base and load for new node (w/o new node data)', function () {
                var patch = {
                        "#b5531098ab865da6929de708187f4bf069b6bdf1": {
                            "type": "patch",
                            "base": "#133828453a145c33dbf15e575a78fc643769e261",
                            "patch": [
                                {
                                    "op": "add",
                                    "path": "/z",
                                    "value": "#d19c1afb79df6d2f1f4fd8f36ac246758bbdd03d"
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fz",
                                    "value": {
                                        "base": "/X"
                                    },
                                    "partials":["/X"]
                                }
                            ],
                            "_id": "#b5531098ab865da6929de708187f4bf069b6bdf1"
                        }
                    },
                    rootHash = '#b5531098ab865da6929de708187f4bf069b6bdf1',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {
                        "/z": true
                    },
                    "partialUpdate": {
                        "/X": true
                    },
                    "unload": {},
                    "update": {}
                });
            });

            it('should partial for base and load for new child node', function () {
                var patch = {
                        "#a8c328811b2be4f51bbb47f99a0a11b4cd3d29f5": {
                            "_id": "#a8c328811b2be4f51bbb47f99a0a11b4cd3d29f5",
                            "atr": {
                                "_relguid": "4da61ec306c8adbb310ca8f48e95fbce"
                            },
                            "reg": {
                                "position": {
                                    "x": 349,
                                    "y": 397
                                }
                            }
                        },
                        "#4cc8d5613f6f0ebacab8ef26d36e5cad5b5411ca": {
                            "type": "patch",
                            "base": "#0f663cc6808d813ccb35b518e02244766c141e99",
                            "patch": [
                                {
                                    "op": "add",
                                    "path": "/0",
                                    "value": "#a8c328811b2be4f51bbb47f99a0a11b4cd3d29f5"
                                }
                            ],
                            "_id": "#4cc8d5613f6f0ebacab8ef26d36e5cad5b5411ca"
                        },
                        "#086ab52b1eda9e280f7ecad2860d328ef635df04": {
                            "type": "patch",
                            "base": "#133828453a145c33dbf15e575a78fc643769e261",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/V",
                                    "value": "#4cc8d5613f6f0ebacab8ef26d36e5cad5b5411ca"
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fV%2f0",
                                    "value": {
                                        "base": "/X"
                                    },
                                    "partials":["/X"]
                                }
                            ],
                            "_id": "#086ab52b1eda9e280f7ecad2860d328ef635df04"
                        }
                    },
                    rootHash = '#086ab52b1eda9e280f7ecad2860d328ef635df04',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {
                        "/V/0": true
                    },
                    "partialUpdate": {
                        "/X": true
                    },
                    "unload": {},
                    "update": {}
                });
            });

            it('should trigger node update, partial for new- and old-target when setting pointer of child', function () {
                var patch = {
                        "#560c2be25f858cc2b9847bcf69fff47273bb2a3b": {
                            "type": "patch",
                            "base": "#78e88668266c4e6832109975278f1174fb01a814",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/ovr/%2fV%2f0%2f8/pointer",
                                    "value": "/H",
                                    "partials":["/J","/H"]
                                }
                            ],
                            "_id": "#560c2be25f858cc2b9847bcf69fff47273bb2a3b"
                        }
                    },
                    rootHash = '#560c2be25f858cc2b9847bcf69fff47273bb2a3b',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/H": true,
                        "/J": true
                    },
                    "unload": {},
                    "update": {
                        "/V/0/8": true
                    }
                });
            });

            it('should trigger node update and partial for new member when adding first to set', function () {
                var patch = {
                        "#1e6a11ebcb0422c5fa27779e17768764e309f9be": {
                            "type": "patch",
                            "base": "#c3d75c6ef45a4e29b4bfaec3e3d772decbb95a30",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/reg/_sets_",
                                    "value": 12
                                },
                                {
                                    "op": "add",
                                    "path": "/_sets/MYSET/1596560450",
                                    "value": {
                                        "reg": {
                                            "_": "_",
                                            "position": {
                                                "x": 899,
                                                "y": 156
                                            }
                                        }
                                    }
                                }
                            ],
                            "_id": "#1e6a11ebcb0422c5fa27779e17768764e309f9be"
                        },
                        "#a07ec3f1ae81107e65a31b344306b8856c82f92b": {
                            "type": "patch",
                            "base": "#3fddf3b7385ee43bf5a81a33e85fd0c370003323",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/x",
                                    "value": "#1e6a11ebcb0422c5fa27779e17768764e309f9be"
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fx%2f_sets%2fMYSET%2f1596560450",
                                    "value": {
                                        "member": "/6"
                                    },
                                    "partials":["/6"]
                                }
                            ],
                            "_id": "#a07ec3f1ae81107e65a31b344306b8856c82f92b"
                        }
                    },
                    rootHash = '#a07ec3f1ae81107e65a31b344306b8856c82f92b',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/6": true
                    },
                    "unload": {},
                    "update": {
                        "/x": true
                    }
                });
            });

            it('should trigger node update and partial for new member when adding second to set', function () {
                var patch = {
                        "#7641989e3645c9a5000a79740d943dc6be31fef9": {
                            "type": "patch",
                            "base": "#1e6a11ebcb0422c5fa27779e17768764e309f9be",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/reg/_sets_",
                                    "value": 15
                                },
                                {
                                    "op": "add",
                                    "path": "/_sets/MYSET/2107174038",
                                    "value": {
                                        "reg": {
                                            "_": "_",
                                            "position": {
                                                "x": 448,
                                                "y": 225
                                            }
                                        }
                                    }
                                }
                            ],
                            "_id": "#7641989e3645c9a5000a79740d943dc6be31fef9"
                        },
                        "#afc5c6d1102f217bb6691b7ac734050c3a399b13": {
                            "type": "patch",
                            "base": "#a07ec3f1ae81107e65a31b344306b8856c82f92b",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/x",
                                    "value": "#7641989e3645c9a5000a79740d943dc6be31fef9"
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fx%2f_sets%2fMYSET%2f2107174038",
                                    "value": {
                                        "member": "/s"
                                    },
                                    "partials":["/s"]
                                }
                            ],
                            "_id": "#afc5c6d1102f217bb6691b7ac734050c3a399b13"
                        }
                    },
                    rootHash = '#afc5c6d1102f217bb6691b7ac734050c3a399b13',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/s": true
                    },
                    "unload": {},
                    "update": {
                        "/x": true
                    }
                });
            });

            it('should trigger node update and partial for new member when removing from set', function () {
                var patch = {
                        "#22af45dbf74b6df70a0450ef7c311e223fa3a060": {
                            "type": "patch",
                            "base": "#7641989e3645c9a5000a79740d943dc6be31fef9",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/reg/_sets_",
                                    "value": 16
                                },
                                {
                                    "op": "remove",
                                    "path": "/_sets/MYSET/2107174038"
                                }
                            ],
                            "_id": "#22af45dbf74b6df70a0450ef7c311e223fa3a060"
                        },
                        "#16acc59ac9a618367025a1be86c3e5be3d43b170": {
                            "type": "patch",
                            "base": "#afc5c6d1102f217bb6691b7ac734050c3a399b13",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/x",
                                    "value": "#22af45dbf74b6df70a0450ef7c311e223fa3a060"
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2fx%2f_sets%2fMYSET%2f2107174038",
                                    "partials":["/s"]
                                }
                            ],
                            "_id": "#16acc59ac9a618367025a1be86c3e5be3d43b170"
                        }
                    },
                    rootHash = '#16acc59ac9a618367025a1be86c3e5be3d43b170',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/s": true
                    },
                    "unload": {},
                    "update": {
                        "/x": true
                    }
                });
            });

            it('should trigger node update and partial for new member when removing last from set', function () {
                var patch = {
                        "#eb8393c403ce1ef5459f1a3eec65393ab29373fd": {
                            "type": "patch",
                            "base": "#22af45dbf74b6df70a0450ef7c311e223fa3a060",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/reg/_sets_",
                                    "value": 17
                                },
                                {
                                    "op": "remove",
                                    "path": "/_sets/MYSET/1596560450"
                                }
                            ],
                            "_id": "#eb8393c403ce1ef5459f1a3eec65393ab29373fd"
                        },
                        "#3950c5a6f043bac0324a89035631f3060217a779": {
                            "type": "patch",
                            "base": "#16acc59ac9a618367025a1be86c3e5be3d43b170",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/x",
                                    "value": "#eb8393c403ce1ef5459f1a3eec65393ab29373fd"
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2fx%2f_sets%2fMYSET%2f1596560450",
                                    "partials":["/6"]
                                }
                            ],
                            "_id": "#3950c5a6f043bac0324a89035631f3060217a779"
                        }
                    },
                    rootHash = '#3950c5a6f043bac0324a89035631f3060217a779',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/6": true
                    },
                    "unload": {},
                    "update": {
                        "/x": true
                    }
                });
            });

            it('should trigger node update and partial for new member when removing last from set', function () {
                var patch = {
                        "#eb8393c403ce1ef5459f1a3eec65393ab29373fd": {
                            "type": "patch",
                            "base": "#22af45dbf74b6df70a0450ef7c311e223fa3a060",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/reg/_sets_",
                                    "value": 17
                                },
                                {
                                    "op": "remove",
                                    "path": "/_sets/MYSET/1596560450"
                                }
                            ],
                            "_id": "#eb8393c403ce1ef5459f1a3eec65393ab29373fd"
                        },
                        "#3950c5a6f043bac0324a89035631f3060217a779": {
                            "type": "patch",
                            "base": "#16acc59ac9a618367025a1be86c3e5be3d43b170",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/x",
                                    "value": "#eb8393c403ce1ef5459f1a3eec65393ab29373fd"
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2fx%2f_sets%2fMYSET%2f1596560450",
                                    "partials":["/6"]
                                }
                            ],
                            "_id": "#3950c5a6f043bac0324a89035631f3060217a779"
                        }
                    },
                    rootHash = '#3950c5a6f043bac0324a89035631f3060217a779',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/6": true
                    },
                    "unload": {},
                    "update": {
                        "/x": true
                    }
                });
            });

            it('should trigger partial for bases and one unload when removing tree', function () {
                var patch = {
                        "#95890feca384fcf91ab3882a6af8dc2b3f663560": {
                            "type": "patch",
                            "base": "#91bf42c5702877278421c9e38c0154b79b02fc84",
                            "patch": [
                                {
                                    "op": "remove",
                                    "path": "/f"
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2ff",
                                    "partials":["/x"]
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2ff%2fb",
                                    "partials":["/5"]
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2ff%2fb%2fB",
                                    "partials":["/5"]
                                }
                            ],
                            "_id": "#95890feca384fcf91ab3882a6af8dc2b3f663560"
                        }
                    },
                    rootHash = '#95890feca384fcf91ab3882a6af8dc2b3f663560',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/5": true,
                        "/x": true
                    },
                    "unload": {
                        "/f": true
                    },
                    "update": {}
                });
            });

            it('should trigger partial for target and update for node when adding meta-relation rule', function () {
                var patch = {
                        "#d199d3d4c68aaabef85057ed45543c22ec503e9b": {
                            "type": "patch",
                            "base": "#7cecebfd8dfa56113037e18fe218eb7e3e369524",
                            "patch": [
                                {
                                    "op": "add",
                                    "path": "/_meta",
                                    "value": {
                                        "_nullptr": {
                                            "atr": {
                                                "name": "_null_pointer"
                                            }
                                        },
                                        "ovr": {
                                            "": {
                                                "dst": "/_nullptr"
                                            }
                                        },
                                        "_p_dst": {
                                            "_sets": {
                                                "items": {
                                                    "1440215960": {
                                                        "reg": {
                                                            "_": "_"
                                                        },
                                                        "atr": {
                                                            "min": -1,
                                                            "max": 1
                                                        }
                                                    },
                                                    "reg": {
                                                        "_": "_"
                                                    }
                                                },
                                                "_nullptr": {
                                                    "atr": {
                                                        "name": "_null_pointer"
                                                    }
                                                },
                                                "ovr": {
                                                    "": {
                                                        "items": "/_nullptr"
                                                    }
                                                }
                                            },
                                            "reg": {
                                                "_sets_": 4
                                            },
                                            "atr": {
                                                "min": 1,
                                                "max": 1
                                            }
                                        }
                                    }
                                },
                                {
                                    "op": "add",
                                    "path": "/reg/_meta_event_",
                                    "value": 1
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/",
                                    "value": {
                                        "dst": "/_nullptr"
                                    },
                                    "partials":["/_nullptr"]
                                }
                            ],
                            "_id": "#d199d3d4c68aaabef85057ed45543c22ec503e9b"
                        },
                        "#d29851a5740abe0bb15a6c66ae3e4417838c0a6e": {
                            "type": "patch",
                            "base": "#59d1eda58dbbd5debcaede465702ca850042d874",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/I",
                                    "value": "#d199d3d4c68aaabef85057ed45543c22ec503e9b"
                                },
                                {
                                    "op": "add",
                                    "path": "/ovr/%2fI%2f_meta%2f_p_dst%2f_sets%2fitems%2f1440215960",
                                    "value": {
                                        "member": "/X"
                                    },
                                    "partials":["/X"]
                                }
                            ],
                            "_id": "#d29851a5740abe0bb15a6c66ae3e4417838c0a6e"
                        }
                    },
                    rootHash = '#d29851a5740abe0bb15a6c66ae3e4417838c0a6e',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/X": true
                    },
                    "unload": {},
                    "update": {
                        "/I": true
                    }
                });
            });

            it('should trigger partial for old target and update for node when assigning null-ptr', function () {
                var patch = {
                        "#6e53191b6a8a6fa397d07b7cc4b0fc6d0e3a8a96": {
                            "type": "patch",
                            "base": "#3029a3057e53852274089ecaaf6d2922494d8fea",
                            "patch": [
                                {
                                    "op": "add",
                                    "path": "/ovr/",
                                    "value": {
                                        "dst": "/_nullptr"
                                    },
                                    "partials":["/_nullptr"]
                                }
                            ],
                            "_id": "#6e53191b6a8a6fa397d07b7cc4b0fc6d0e3a8a96"
                        },
                        "#858fc3cb6f6f6928a092973a24d383ee2b995cad": {
                            "type": "patch",
                            "base": "#e11239afeca9f11371c3b1e2d77fce2c128030a3",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/p",
                                    "value": "#6e53191b6a8a6fa397d07b7cc4b0fc6d0e3a8a96"
                                }
                            ],
                            "_id": "#858fc3cb6f6f6928a092973a24d383ee2b995cad"
                        },
                        "#995fe834735afcf2e6eef1774670e1db00fe3a9c": {
                            "type": "patch",
                            "base": "#7053826de17ad7bfd83734857be26bfcb5340ce9",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/8",
                                    "value": "#858fc3cb6f6f6928a092973a24d383ee2b995cad"
                                }
                            ],
                            "_id": "#995fe834735afcf2e6eef1774670e1db00fe3a9c"
                        },
                        "#8db8723681444c52158ef4380806d94f6dae1ee3": {
                            "type": "patch",
                            "base": "#9900a9dc636511418e3f0e9696041aeb13c70964",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/v",
                                    "value": "#995fe834735afcf2e6eef1774670e1db00fe3a9c"
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2fv%2f8%2fp/dst",
                                    "partials":["/X"]
                                }
                            ],
                            "_id": "#8db8723681444c52158ef4380806d94f6dae1ee3"
                        }
                    },
                    rootHash = '#8db8723681444c52158ef4380806d94f6dae1ee3',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/X": true
                    },
                    "unload": {},
                    "update": {
                        "/v/8/p": true
                    }
                });
            });

            it('should trigger update for node when removing null-ptr', function () {
                var patch = {
                        "#e03246442ede7798d74468fd410667e637d067f0": {
                            "type": "patch",
                            "base": "#1c4ce40c293925d319b789902cd48aac06425253",
                            "patch": [
                                {
                                    "op": "remove",
                                    "path": "/ovr/",
                                    "partials":[]
                                },
                                {
                                    "op": "remove",
                                    "path": "/ovr/%2f_nullptr",
                                    "partials":[]
                                }
                            ],
                            "_id": "#e03246442ede7798d74468fd410667e637d067f0"
                        },
                        "#7bb2676d43fc1d5859940ab6b88a2b91910b2cf1": {
                            "type": "patch",
                            "base": "#e4fc8df1cf55997789b793681266a79ec6b62020",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/p",
                                    "value": "#e03246442ede7798d74468fd410667e637d067f0"
                                }
                            ],
                            "_id": "#7bb2676d43fc1d5859940ab6b88a2b91910b2cf1"
                        },
                        "#4eccb177f8687e1a7ed605ad97af4cddff486cd3": {
                            "type": "patch",
                            "base": "#7a3b8e90fd41a8f893f34119f661d5956038149b",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/8",
                                    "value": "#7bb2676d43fc1d5859940ab6b88a2b91910b2cf1"
                                }
                            ],
                            "_id": "#4eccb177f8687e1a7ed605ad97af4cddff486cd3"
                        },
                        "#310cf492269ffa0e4b3ce35b9fc15470cbaa0bbc": {
                            "type": "patch",
                            "base": "#ab59c006e6a1fe5c86c07826b2d57656a57f8b11",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/v",
                                    "value": "#4eccb177f8687e1a7ed605ad97af4cddff486cd3"
                                }
                            ],
                            "_id": "#310cf492269ffa0e4b3ce35b9fc15470cbaa0bbc"
                        }
                    },
                    rootHash = '#310cf492269ffa0e4b3ce35b9fc15470cbaa0bbc',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {},
                    "unload": {},
                    "update": {
                        "/v/8/p": true
                    }
                });
            });

            it('should trigger update for node changing base and partial for new and old target', function () {
                var patch = {
                        "#e2d5181eb73aec7a337c1968d16d1dfaa0b385f7": {
                            "type": "patch",
                            "base": "#0fba0faa4259e8441dc4b97de9b4af0bd288b271",
                            "patch": [
                                {
                                    "op": "replace",
                                    "path": "/ovr/%2fX/base",
                                    "value": "/I",
                                    "partials":["/I","/1"]
                                }
                            ],
                            "_id": "#e2d5181eb73aec7a337c1968d16d1dfaa0b385f7"
                        }
                    },
                    rootHash = '#e2d5181eb73aec7a337c1968d16d1dfaa0b385f7',
                    result = patcher.getChangedNodes(patch, rootHash);

                expect(result).to.deep.equal({
                    "load": {},
                    "partialUpdate": {
                        "/1": true,
                        "/I": true,
                    },
                    "unload": {},
                    "update": {
                        "/X": true
                    }
                });
            });
        });
    });
});

/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */
var tGlobals = require('../../_globals.js');

describe('Core Serialization', function () {
    'use strict';
//global variables of the test
    var storage = null,
        commit = '',
        baseCommit = '',
        root = null,
        rootHash = '',
        core = null,
        project = null;

    var iData,
        eData,
        nodes,
        guids,
        paths,
        guidToPath,
        jsonData;
    it('imports the example project', function (done) {
        tGlobals.importProject({
            filePath: './test/asset/exportimport.json',
            projectName: 'coreSerializationTest'
        }, function (err, result) {
            if (err) {
                done(err);
                return;
            }
            storage = result.storage;
            project = result.project;
            commit = result.commitHash;
            baseCommit = result.commitHash;
            root = result.root;
            core = result.core;
            rootHash = core.getHash(root);
            jsonData = result.jsonProject;
            done();
        });
    });
    it('exports the very same', function (done) {
        this.timeout(5000);
        iData = jsonData;
        eData = {};
        tGlobals.WebGME.serializer.export(core, root, function (err, exp) {
            if (err) {
                return done(err);
            }
            eData = exp;
            iData.should.be.eql(eData);
            done();
        });
    });
    it('loads all objects in the project', function (done) {
        core.loadSubTree(root, function (err, n) {
            if (err) {
                return done(err);
            }
            nodes = n;
            done();
        });
    });
    it('checks the guids', function () {
        var i, iGuids;
        guids = {};
        guidToPath = {};
        for (i = 0; i < nodes.length; i++) {
            guids[core.getGuid(nodes[i])] = nodes[i];
            guidToPath[core.getGuid(nodes[i])] = core.getPath(nodes[i]);
        }
        iGuids = Object.keys(iData.nodes);
        for (i = 0; i < iGuids.length; i++) {
            if (!guids[iGuids[i]]) {
                throw new Error('guid not found ' + iGuids[i]);
            }
        }
    });
    it('checks the paths', function () {
        var i, checkContainment = function (path, containment) {
            var i,keys = Object.keys(containment);
            if (!paths[path]) {
                throw new Error('missing path \'' + path + '\'');
            }
            for (i=0;i<keys.length;i++) {
                checkContainment(path + '/' + iData.relids[keys[i]], containment[keys[i]]);
            }
        };
        paths = {};
        for (i = 0; i < nodes.length; i++) {
            paths[core.getPath(nodes[i])] = nodes[i];
        }
        checkContainment('', iData.containment);

    });
    it('checks the FCO', function () {
        var FCOGuid = 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045';
        if (!guids[FCOGuid]) {
            throw new Error('no FCO in the project');
        }
        if (core.getAttribute(guids[FCOGuid], 'name') !== 'FCO') {
            throw new Error('name mismatch');
        }
        if (core.getPath(guids[FCOGuid]) !== '/1') {
            throw new Error('FCO has been moved');
        }
    });
    it('checks the attributes', function () {
        var i, keys = Object.keys(guids),
            checkAttributes = function (node, ownAttributes) {
            var i,keys = Object.keys(ownAttributes);
            for (i=0;i<keys.length;i++) {
                ownAttributes[keys[i]].should.be.eql(core.getOwnAttribute(node, keys[i]));
            }
        };


        for (i=0;i<keys.length;i++) {
            checkAttributes(guids[keys[i]], iData.nodes[keys[i]].attributes);
        }
    });
    it('checks the registry entries', function () {
        var i, keys = Object.keys(guids),
            checkRegistry = function (node, ownRegistry) {
                var i,keys = Object.keys(ownRegistry);
                for (i=0;i<keys.length;i++) {
                    ownRegistry[keys[i]].should.be.eql(core.getOwnRegistry(node, keys[i]));
                }
            };


        for (i=0;i<keys.length;i++) {
            checkRegistry(guids[keys[i]], iData.nodes[keys[i]].registry);
        }
    });
    it('checks base chains', function () {
        var i, keys = Object.keys(guids),
            checkBases = function (node) {
            var base = core.getBase(node);
            if (base) {
                if (core.getGuid(base) === iData.nodes[core.getGuid(node)].base) {
                    checkBases(base);
                } else {
                    throw new Error('base mismatch [' + core.getGuid(node) + ']');
                }
            } else if (iData.nodes[core.getGuid(node)].base !== null) {
                throw new Error('missing base in the project [' + core.getGuid(node) + ']');
            }
        };
        for (i=0;i<keys.length;i++) {
            checkBases(guids[keys[i]]);
        }
    });
    it('checks pointers', function () {
        var i, keys = Object.keys(guids),
            checkPointers = function (node) {
            var i, iNode = iData.nodes[core.getGuid(node)].pointers,
                keys = Object.keys(iNode);
            for (i=0;i<keys.length;i++) {
                if (iNode[keys[i]] === null) {
                    if (core.getPointerPath(node, keys[i]) !== null) {
                        throw new Error('not null target [' + core.getGuid(node) + '] [' + keys[i] + ']');
                    }
                } else if (iNode[keys[i]] !== core.getGuid(paths[core.getPointerPath(node, keys[i])])) {
                    throw new Error('wrong pointer target [' + core.getGuid(node) + '] [' + keys[i] + ']');
                }
            }
        };

        for (i=0;i<keys.length;i++) {
            checkPointers(guids[keys[i]]);
        }
    });
    it('checks set members', function () {
        var i, keys = Object.keys(guids),
            checkMembers = function (node) {
            var iNode = iData.nodes[core.getGuid(node)].sets, i, j, k, path,
                keys = Object.keys(iNode),
                values;
            for (i=0;i<keys.length;i++) {
                for (j = 0; j < iNode[keys[i]].length; j++) {
                    //guid
                    if (!guidToPath[iNode[keys[i]][j].guid]) {
                        throw new Error('set element missing [' + iNode[keys[i]][j].guid + ']');
                    }
                    path = guidToPath[iNode[keys[i]][j].guid];
                    //attributes
                    values = Object.keys(iNode[keys[i]][j].attributes);
                    for (k=0;k<values.length;k++) {
                        iNode[keys[i]][j].attributes[values[k]].should.be.eql(core.getMemberAttribute(node, keys[i], path, values[k]));
                    }

                    //registry
                    values = Object.keys(iNode[keys[i]][j].registry);
                    for (k=0;k<values.length;k++) {
                        iNode[keys[i]][j].registry[values[k]].should.be.eql(core.getMemberRegistry(node, keys[i], path, values[k]));
                    }
                }
            }
        };

        for (i=0;i<keys.length;i++) {
            checkMembers(guids[keys[i]]);
        }
    });
});
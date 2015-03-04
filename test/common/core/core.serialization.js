/**
 * Created by tamas on 12/22/14.
 */
require('../../_globals.js');

describe('Core#Serialization', function () {
    var FS = require('fs'),
        PATH = require('path'),
        storage = new global.Storage(),
        requirejs = require('requirejs'),
        CANON = requirejs('../src/common/util/canon');

    function saveProject(txt, ancestors, next) {
        core.persist(root, function (err) {
            if (err) {
                return next(err);
            }

            commit = project.makeCommit(ancestors, core.getHash(root), txt, function (err) {
                if (err) {
                    return next(err);
                }
                next(null, commit);
            });
        });
    }
    function loadJsonData(path) {
        try {
            jsonData = JSON.parse(FS.readFileSync(path, 'utf8'));
        } catch (err) {
            jsonData = null;
            return false;
        }

        return true;
    }
    function importProject(projectJson, next) {

        storage.getProjectNames(function (err, names) {
            if (err) {
                return next(err);
            }
            names = names || [];
            if (names.indexOf(projectName) !== -1) {
                return next(new Error('project already exists'));
            }

            storage.openProject(projectName, function (err, p) {
                if (err || !p) {
                    return next(err || new Error('unable to get quasi project'));
                }

                core = new global.WebGME.core(p);
                project = p;
                root = core.createNode();

                global.WebGME.serializer.import(core, root, projectJson, function (err, log) {
                    if (err) {
                        return next(err);
                    }
                    saveProject('test initial import', [], next);
                });
            });
        });
    }
    function deleteProject(next) {
        storage.getProjectNames(function (err, names) {
            if (err) {
                return next(err);
            }
            if (names.indexOf(projectName) === -1) {
                return next(new Error('no such project'));
            }

            storage.deleteProject(projectName, next);
        });
    }
    function loadNodes(paths, next) {
        var needed = paths.length,
            nodes = {}, error = null, i,
            loadNode = function (path) {
                core.loadByPath(root, path, function (err, node) {
                    error = error || err;
                    nodes[path] = node;
                    if (--needed === 0) {
                        next(error, nodes);
                    }
                })
            };
        for (i = 0; i < paths.length; i++) {
            loadNode(paths[i]);
        }
    }

//global variables of the test
    var projectName = "test_serialization_" + new Date().getTime(),
        commit = '',
        baseCommit = '',
        root = null,
        rootHash = '',
        core = null,
        project = null;

    var iData, eData, nodes, guids, paths, guidToPath;
    it('should open the database connection', function (done) {
        storage.openDatabase(done);
    });
    it('imports the example project', function (done) {
        loadJsonData('./test/asset/exportimport.json');
        if (jsonData === null) {
            return done(new Error('unable to load project file'));
        }
        importProject(jsonData, function (err, c) {
            if (err) {
                return done(err);
            }

            commit = c;
            baseCommit = c;
            rootHash = core.getHash(root);
            done();
        });
    });
    it('exports the very same', function (done) {
        this.timeout(5000);
        iData = jsonData;
        eData = {};
        global.WebGME.serializer.export(core, root, function (err, exp) {
            if (err) {
                return done(err);
            }
            eData = exp;
            if (JSON.stringify(iData) !== JSON.stringify(eData)) {
                //we print the exports only if there is some error
                FS.writeFileSync(PATH.join('test-tmp', 'input.json'), JSON.stringify(iData, null, 2));
                FS.writeFileSync(PATH.join('test-tmp', 'output.json'), JSON.stringify(eData, null, 2));
                return done(new Error('the two object differs'));
            }
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
            var i;
            if (!paths[path]) {
                throw new Error('missing path \'' + path + '\'');
            }
            for (i in containment) {
                checkContainment(path + '/' + iData.relids[i], containment[i]);
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
        var i, checkAttributes = function (node, ownAttributes) {
            var i;
            for (i in ownAttributes) {
                if (CANON.stringify(core.getOwnAttribute(node, i)) !== CANON.stringify(ownAttributes[i])) {
                    throw new Error('attribute mismatch [' + core.getGuid(node) + '] [' + i + ']');
                }
            }
        };

        for (i in guids) {
            checkAttributes(guids[i], iData.nodes[i].attributes);
        }
    });
    it('checks the registry entries', function () {
        var i, checkAttributes = function (node, ownRegistry) {
            var i;
            for (i in ownRegistry) {
                if (CANON.stringify(core.getOwnRegistry(node, i)) !== CANON.stringify(ownRegistry[i])) {
                    throw new Error('registry mismatch [' + core.getGuid(node) + '] [' + i + ']');
                }
            }
        };

        for (i in guids) {
            checkAttributes(guids[i], iData.nodes[i].registry);
        }
    });
    it('checks base chains', function () {
        var i, checkBases = function (node) {
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
        for (i in guids) {
            checkBases(guids[i]);
        }
    });
    it('checks pointers', function () {
        var i, checkPointers = function (node) {
            var i, iNode = iData.nodes[core.getGuid(node)].pointers;
            for (i in iNode) {
                if (iNode[i] === null) {
                    if (core.getPointerPath(node, i) !== null) {
                        throw new Error('not null target [' + core.getGuid(node) + '] [' + i + ']');
                    }
                } else if (iNode[i] !== core.getGuid(paths[core.getPointerPath(node, i)])) {
                    throw new Error('wrong pointer target [' + core.getGuid(node) + '] [' + i + ']');
                }
            }
        };

        for (i in guids) {
            checkPointers(guids[i]);
        }
    });
    it('checks set members', function () {
        var i, checkMembers = function (node) {
            var iNode = iData.nodes[core.getGuid(node)].sets, i, j, k, path;
            for (i in iNode) {
                for (j = 0; j < iNode[i].length; j++) {
                    //guid
                    if (!guidToPath[iNode[i][j].guid]) {
                        throw new Error('set element missing [' + iNode[i][j].guid + ']');
                    }
                    path = guidToPath[iNode[i][j].guid];
                    //attributes
                    for (k in iNode[i][j].attributes) {
                        if (CANON.stringify(iNode[i][j].attributes[k]) !== CANON.stringify(core.getMemberAttribute(node, i, path, k))) {
                            throw new Error('wrong attribute [' + core.getGuid(node) + '] [' + i + '] [' + iNode[i][j].guid + '] [' + k + ']');
                        }
                    }

                    //registry
                    for (k in iNode[i][j].registry) {
                        if (CANON.stringify(iNode[i][j].registry[k]) !== CANON.stringify(core.getMemberRegistry(node, i, path, k))) {
                            throw new Error('wrong registry [' + core.getGuid(node) + '] [' + i + '] [' + iNode[i][j].guid + '] [' + k + ']');
                        }
                    }
                }
            }
        };

        for (i in guids) {
            checkMembers(guids[i]);
        }
    });
    it('should close the project', function (done) {
        project.closeProject(function (err) {
            if (err) {
                return done(err);
            }
            done();
        });
    });
    it('should remove the test project', function (done) {
        storage.getProjectNames(function (err, names) {
            if (err) {
                return done(err);
            }
            if (names.indexOf(projectName) === -1) {
                return done(new Error('no such project'));
            }

            storage.deleteProject(projectName, done);
        });
    });
    it('should close the database connection', function (done) {
        storage.closeDatabase(done);
    });
});
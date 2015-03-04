/**
 * Created by tkecskes on 12/18/2014.
 */
//these checks intended to check what changes should be visible between persists
require('../../_globals.js');

describe('Core#IntraPersist', function () {
    var FS = require('fs'),
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
    var projectName = "test_intra_" + new Date().getTime(),
        commit = '',
        baseCommit = '',
        root = null,
        rootHash = '',
        core = null,
        project = null;


    describe('Core#IntraPersist#Pre', function () {
        it('should open the database connection', function (done) {
            storage.openDatabase(done);
        });
        it('import the basic project', function (done) {
            loadJsonData('./test/asset/intraPersist.json');
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
    });
    describe('Core#IntraPersist#SimpleChanges', function () {
        var e1NodePath = '/1736622193/1271963336',
            e1NodePrimePath = '/1710723537/1271963336',
            s1NodePath = '/1736622193/274170516',
            s1NodePrimePath = '/1710723537/274170516',
            nodes = null;
        it('sets the root and commit back to base', function (done) {
            core.loadRoot(rootHash, function (err, r) {
                if (err) {
                    return done(err);
                }
                root = r;
                done();
            });
        });
        it('loads all the nodes for the test', function (done) {
            loadNodes([e1NodePath, e1NodePrimePath, s1NodePath, s1NodePrimePath], function (err, n) {
                if (err) {
                    return done(err);
                }
                nodes = n;
                done();
            });
        });
        it('modified attributes should be visible in already loaded nodes', function () {
            if (core.getAttribute(nodes[e1NodePath], 'name') !== 'e1' || core.getAttribute(nodes[e1NodePrimePath], 'name') !== 'e1') {
                throw new Error('initial attribute values are wrong');
            }
            core.setAttribute(nodes[e1NodePath], 'name', 'e1modified');
            if (core.getAttribute(nodes[e1NodePath], 'name') !== 'e1modified' || core.getAttribute(nodes[e1NodePrimePath], 'name') !== 'e1modified') {
                throw new Error('modified attribute values are wrong');
            }
            core.setAttribute(nodes[e1NodePrimePath], 'name', 'e1prime');
            if (core.getAttribute(nodes[e1NodePath], 'name') !== 'e1modified' || core.getAttribute(nodes[e1NodePrimePath], 'name') !== 'e1prime') {
                throw new Error('differentiated attribute values are wrong');
            }
            core.delAttribute(nodes[e1NodePrimePath], 'name');
            if (core.getAttribute(nodes[e1NodePath], 'name') !== 'e1modified' || core.getAttribute(nodes[e1NodePrimePath], 'name') !== 'e1modified') {
                throw new Error('removed prime attribute values are wrong');
            }
            core.delAttribute(nodes[e1NodePath], 'name');
            if (core.getAttribute(nodes[e1NodePath], 'name') !== 'node' || core.getAttribute(nodes[e1NodePrimePath], 'name') !== 'node') {
                throw new Error('removed attribute values are wrong');
            }
            core.setAttribute(nodes[e1NodePath], 'name', 'e1');
            if (core.getAttribute(nodes[e1NodePath], 'name') !== 'e1' || core.getAttribute(nodes[e1NodePrimePath], 'name') !== 'e1') {
                throw new Error('final attribute values are wrong');
            }

        });
        it('modified registry should be visible in already loaded nodes', function () {
            var pos, posPrime;
            pos = core.getRegistry(nodes[e1NodePath], 'position');
            posPrime = core.getRegistry(nodes[e1NodePrimePath], 'position');
            if (pos.x !== 194 || pos.y !== 228 || posPrime.x !== 194 || posPrime.y !== 228) {
                throw new Error('initial registry values are wrong');
            }
            core.setRegistry(nodes[e1NodePath], 'position', {x: 100, y: 200});
            pos = core.getRegistry(nodes[e1NodePath], 'position');
            posPrime = core.getRegistry(nodes[e1NodePrimePath], 'position');
            if (pos.x !== 100 || pos.y !== 200 || posPrime.x !== 100 || posPrime.y !== 200) {
                throw new Error('modified registry values are wrong');
            }

            core.setRegistry(nodes[e1NodePrimePath], 'position', {x: 200, y: 300});
            pos = core.getRegistry(nodes[e1NodePath], 'position');
            posPrime = core.getRegistry(nodes[e1NodePrimePath], 'position');
            if (pos.x !== 100 || pos.y !== 200 || posPrime.x !== 200 || posPrime.y !== 300) {
                throw new Error('separated registry values are wrong');
            }
            core.delRegistry(nodes[e1NodePrimePath], 'position');
            pos = core.getRegistry(nodes[e1NodePath], 'position');
            posPrime = core.getRegistry(nodes[e1NodePrimePath], 'position');
            if (pos.x !== 100 || pos.y !== 200 || posPrime.x !== 100 || posPrime.y !== 200) {
                throw new Error('removed prime registry values are wrong');
            }

            core.delRegistry(nodes[e1NodePath], 'position');
            pos = core.getRegistry(nodes[e1NodePath], 'position');
            posPrime = core.getRegistry(nodes[e1NodePrimePath], 'position');
            if (pos.x !== 178 || pos.y !== 141 || posPrime.x !== 178 || posPrime.y !== 141) {
                throw new Error('removed registry values are wrong');
            }

            core.setRegistry(nodes[e1NodePath], 'position', {x: 194, y: 228});
            pos = core.getRegistry(nodes[e1NodePath], 'position');
            posPrime = core.getRegistry(nodes[e1NodePrimePath], 'position');
            if (pos.x !== 194 || pos.y !== 228 || posPrime.x !== 194 || posPrime.y !== 228) {
                throw new Error('final registry values are wrong');
            }
        });
        it('modified pointer targets should be visible in already loaded nodes', function () {
            if (core.getPointerPath(nodes[s1NodePath], 'myNode') !== core.getPath(nodes[e1NodePath]) || core.getPointerPath(nodes[s1NodePrimePath], 'myNode') !== core.getPath(nodes[e1NodePrimePath])) {
                throw new Error('initial target values are wrong');
            }

            core.setPointer(nodes[s1NodePath], 'myNode', nodes[e1NodePrimePath]);
            if (core.getPointerPath(nodes[s1NodePath], 'myNode') !== core.getPath(nodes[e1NodePrimePath]) || core.getPointerPath(nodes[s1NodePrimePath], 'myNode') !== core.getPath(nodes[e1NodePrimePath])) {
                throw new Error('modified target values are wrong');
            }

            core.setPointer(nodes[s1NodePrimePath], 'myNode', nodes[e1NodePath]);
            if (core.getPointerPath(nodes[s1NodePath], 'myNode') !== core.getPath(nodes[e1NodePrimePath]) || core.getPointerPath(nodes[s1NodePrimePath], 'myNode') !== core.getPath(nodes[e1NodePath])) {
                throw new Error('differentiated target values are wrong');
            }

            core.deletePointer(nodes[s1NodePath], 'myNode');
            if (core.getPointerPath(nodes[s1NodePath], 'myNode') !== null || core.getPointerPath(nodes[s1NodePrimePath], 'myNode') !== core.getPath(nodes[e1NodePath])) {
                throw new Error('removed target values are wrong');
            }

            core.deletePointer(nodes[s1NodePrimePath], 'myNode');
            if (core.getPointerPath(nodes[s1NodePath], 'myNode') !== null || core.getPointerPath(nodes[s1NodePrimePath], 'myNode') !== null) {
                throw new Error('removed prime target values are wrong');
            }

            core.setPointer(nodes[s1NodePath], 'myNode', nodes[e1NodePath]);
            if (core.getPointerPath(nodes[s1NodePath], 'myNode') !== core.getPath(nodes[e1NodePath]) || core.getPointerPath(nodes[s1NodePrimePath], 'myNode') !== core.getPath(nodes[e1NodePrimePath])) {
                throw new Error('final target values are wrong');
            }
        });
        it('checks the set harmonization for member registry', function () {
            var elements, elementsPrime, position;
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591', '/1736622193/274170516']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516'])) {
                throw new Error('initial set members are wrong');
            }

            core.delMember(nodes[e1NodePath], 'mySpecials', s1NodePath);
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591'])) {
                throw new Error('removed set members are wrong');
            }

            core.addMember(nodes[e1NodePrimePath], 'mySpecials', nodes[s1NodePrimePath]);
            core.setMemberRegistry(nodes[e1NodePrimePath], 'mySpecials', s1NodePrimePath, 'position', {x: 100, y: 200});
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            position = core.getMemberRegistry(nodes[e1NodePrimePath], 'mySpecials', s1NodePrimePath, 'position');
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516']) ||
                position.x !== 100 || position.y !== 200) {
                throw new Error('prime set members are wrong');
            }

            core.addMember(nodes[e1NodePath], 'mySpecials', nodes[s1NodePath]);
            core.setMemberRegistry(nodes[e1NodePath], 'mySpecials', s1NodePath, 'position', {x: 200, y: 300});
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            position = core.getMemberRegistry(nodes[e1NodePrimePath], 'mySpecials', s1NodePrimePath, 'position');
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591', '/1736622193/274170516']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516']) ||
                position.x !== 100 || position.y !== 200) {
                throw new Error('prime set member registry value are wrong');
            }
            position = core.getMemberRegistry(nodes[e1NodePath], 'mySpecials', s1NodePath, 'position');
            if (position.x !== 200 || position.y !== 300) {
                throw new Error('member registry value is wrong');
            }

        });
        it('modified set elements should be visible in already loaded nodes', function () {
            var elements, elementsPrime;
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591', '/1736622193/274170516']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516'])) {
                throw new Error('initial set members are wrong');
            }

            core.delMember(nodes[e1NodePrimePath], 'mySpecials', s1NodePrimePath);
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591', '/1736622193/274170516']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516'])) {
                throw new Error('prime removed set members are wrong');
            }

            core.delMember(nodes[e1NodePath], 'mySpecials', s1NodePath);
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591'])) {
                throw new Error('removed set members are wrong');
            }

            core.addMember(nodes[e1NodePrimePath], 'mySpecials', nodes[s1NodePrimePath]);
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516'])) {
                throw new Error('prime set members are wrong');
            }

            core.addMember(nodes[e1NodePath], 'mySpecials', nodes[s1NodePath]);
            core.setMemberRegistry(nodes[e1NodePath], 'mySpecials', s1NodePath, 'position', {x: 86, y: 80});
            elements = core.getMemberPaths(nodes[e1NodePath], 'mySpecials');
            elements.sort();
            elementsPrime = core.getMemberPaths(nodes[e1NodePrimePath], 'mySpecials');
            elementsPrime.sort();
            if (CANON.stringify(elements) !== CANON.stringify(['/1736622193/1579656591', '/1736622193/274170516']) ||
                CANON.stringify(elementsPrime) !== CANON.stringify(['/1710723537/1579656591', '/1710723537/274170516'])) {
                throw new Error('prime set members are wrong');
            }
        });
    });
    describe('Core#IntraPersist#Creation', function () {
        var nodePath = '/989341553/1009293372',
            specialPath = '/989341553/138645871',
            examplePath = '/1736622193',
            examplePrimePath = '/1710723537',
            e1NodePath = '/1736622193/1271963336',
            nodes = null;
        it('sets the root and commit back to base', function (done) {
            core.loadRoot(rootHash, function (err, r) {
                if (err) {
                    return done(err);
                }
                root = r;
                done();
            });
        });
        it('loads all the nodes for the test', function (done) {
            loadNodes([nodePath, specialPath, examplePath, examplePrimePath, e1NodePath], function (err, n) {
                if (err) {
                    return done(err);
                }
                nodes = n;
                done();
            });
        });
        it('new node should be available instantaneously', function () {
            var newNode = core.createNode({parent: nodes[examplePath], base: nodes[specialPath]});
            if (core.getChildrenPaths(nodes[examplePath]).indexOf(core.getPath(newNode)) === -1) {
                throw new Error('new child is unavailable');
            }
            if (core.getChildrenRelids(nodes[examplePrimePath]).indexOf(core.getRelid(newNode)) === -1) {
                throw new Error('new child is unavailable in descendant');
            }
            if (core.getAttribute(newNode, 'mySpeciality') !== 'nothing') {
                throw new Error('new node attribute is not available');
            }
            core.setAttribute(nodes[specialPath], 'mySpeciality', "shit");
            if (core.getAttribute(newNode, 'mySpeciality') !== 'shit') {
                throw new Error('new node changed attribute is not available');
            }

            core.setAttribute(nodes[specialPath], 'mySpeciality', "nothing");
            core.deleteNode(newNode);
        });
        it('newly created nodes\' set should be fully available', function () {
            var newNode = core.createNode({parent: root, base: nodes[e1NodePath]}),
                memberPaths, memberNewPaths;
            if (core.getAttribute(newNode, 'name') !== 'e1' ||
                core.getRegistry(newNode, 'position').x !== 194 ||
                core.getRegistry(newNode, 'position').y !== 228 ||
                CANON.stringify(core.getSetNames(newNode)) !== CANON.stringify(['mySpecials'])
            ) {
                throw new Error('values of the new node are wrong');
            }

            memberPaths = core.getMemberPaths(nodes[e1NodePath], 'mySpecials').sort();
            memberNewPaths = core.getMemberPaths(newNode, 'mySpecials').sort();
            if (CANON.stringify(memberPaths) !== CANON.stringify(memberNewPaths)) {
                throw new Error('bad set members of new node');
            }

            core.deleteNode(newNode);
        });
        it('children of new node should be visible instantaneously', function () {
            var newNode = core.createNode({parent: root, base: nodes[examplePath]}),
                childrenRelids,
                childrenNewRelids;

            childrenRelids = core.getChildrenRelids(nodes[examplePath]).sort();
            childrenNewRelids = core.getChildrenRelids(newNode).sort();
            if (CANON.stringify(childrenRelids) !== CANON.stringify(childrenNewRelids)) {
                throw new Error('wrong chilrdenlist for new node');
            }
        });
    });
    describe('Core#IntraPersist#Move', function () {
        var nodePath = '/989341553/1009293372',
            specialPath = '/989341553/138645871',
            examplePath = '/1736622193',
            examplePrimePath = '/1710723537',
            e1NodePath = '/1736622193/1271963336',
            nodes = null;
        it('sets the root and commit back to base', function (done) {
            core.loadRoot(rootHash, function (err, r) {
                if (err) {
                    return done(err);
                }
                root = r;
                done();
            });
        });
        it('loads all the nodes for the test', function (done) {
            loadNodes([nodePath, specialPath, examplePath, examplePrimePath, e1NodePath], function (err, n) {
                if (err) {
                    return done(err);
                }
                nodes = n;
                done();
            });
        });
        it('moved node should be available instantaneously', function () {
            var movedNode = core.moveNode(nodes[e1NodePath], root);
            if (core.getPath(movedNode) !== "/1271963336") {
                throw new Error('bad path of moved node');
            }
            if (core.getPath(nodes[e1NodePath]) !== e1NodePath) {
                throw new Error('old object points to old place');
            }
        });
    });
    describe('Core#IntraPersist#Post', function () {
        it('removes the project', function (done) {
            storage.deleteProject(projectName, done);
        });
        it('closes the database', function (done) {
            storage.closeDatabase(done);
        });
    });
});
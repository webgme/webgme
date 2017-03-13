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

    describe('core changes', function () {
        var gmeConfig = testFixture.getGmeConfig(),
            Q = testFixture.Q,
            logger = testFixture.logger.fork('jsonPatcher.core.changes.spec'),
            storageUtil = testFixture.requirejs('common/storage/util'),
            storage,
            projectName = 'coreChanges',
            projectId = testFixture.projectName2Id(projectName),
            core,
            root,
            parent,
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
            ])
                .nodeify(done);
        });

        beforeEach(function (done) {
            storage.openDatabase()
                .then(function () {
                    return storage.createProject({projectName: projectName});
                })
                .then(function (dbProject) {
                    var project = new testFixture.Project(dbProject, storage, logger, gmeConfig);
                    core = new testFixture.WebGME.core(project, {
                        globConf: gmeConfig,
                        logger: testFixture.logger.fork('meta-core:core')
                    });

                    root = core.createNode();
                    parent = core.createNode({parent: root});
                })
                .nodeify(done);
        });

        afterEach(function (done) {
            storage.deleteProject({projectId: projectId})
                .then(function () {
                    return storage.closeDatabase();
                })
                .nodeify(done);
        });

        function persistAndGetPatchData() {
            var pData = core.persist(root),
                coreObjects = pData.objects,
                keys = Object.keys(coreObjects),
                oldData,
                patchResult,
                i;

            for (i = 0; i < keys.length; i += 1) {
                if (storageUtil.coreObjectHasOldAndNewData(coreObjects[keys[i]])) {
                    // Patch type object.
                    oldData = coreObjects[keys[i]].oldData;
                    coreObjects[keys[i]] = storageUtil.getPatchObject(oldData, coreObjects[keys[i]].newData);

                    // Check if the created patch is correct.
                    patchResult = storageUtil.applyPatch(oldData, coreObjects[keys[i]].patch);
                    if (patchResult.status !== 'success') {
                        throw new Error('patching failed' + JSON.stringify(patchResult));
                    } else if (storageUtil.checkHashConsistency(gmeConfig, patchResult.result, keys[i]) === false) {
                        throw new Error('patching did not create consistent hash!');
                    }
                } else if (coreObjects[keys[i]].newData && coreObjects[keys[i]].newHash) {
                    // A new object with no previous data (send the entire data).
                    coreObjects[keys[i]] = coreObjects[keys[i]].newData;
                } else {
                    // A regular object.
                    coreObjects[keys[i]] = coreObjects[keys[i]];
                }
            }

            return storageUtil.getChangedNodes(coreObjects, pData.rootHash);
        }

        function getChangedNodesObj(partialUpdate, update, load, unload) {
            var result = {
                load: {},
                unload: {},
                update: {},
                partialUpdate: {}
            };

            function addToObject(arr, name) {
                arr = arr || [];
                arr.forEach(function (path) {
                    result[name][path] = true;
                });
            }

            addToObject(load, 'load');
            addToObject(unload, 'unload');
            addToObject(update, 'update');
            addToObject(partialUpdate, 'partialUpdate');

            return result;
        }

        function createTests(isRoot, suffix) {

            it('setting attribute should put node in update' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.persist(root);

                core.setAttribute(node, 'name', 'hello');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('setting attribute should put node in update 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.setAttribute(node, 'name2', 'hello');
                core.persist(root);

                core.setAttribute(node, 'name', 'hello');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('setting attribute should put node in update 3' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.setAttribute(node, 'name', 'helloOld');
                core.persist(root);

                core.setAttribute(node, 'name', 'helloNew');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('creating node should put node in load and base in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    newNode,
                    changedNodes;

                core.persist(root);

                newNode = core.createNode({parent: isRoot ? root : parent, base: node});
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([path], [], [core.getPath(newNode)]));
            });

            it('creating node should put node in load and base in partial 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    newNode,
                    changedNodes;

                core.persist(root);

                newNode = core.createNode({parent: isRoot ? root : parent, base: node});
                core.setAttribute(newNode, 'name', 'yello');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([path], [], [core.getPath(newNode)]));
            });

            it('creating tree should put node in load and base in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    newNode,
                    changedNodes;

                core.persist(root);

                newNode = core.createNode({parent: isRoot ? root : parent, base: node});
                core.createNode({parent: newNode});
                core.createNode({parent: newNode});
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([path], [], [core.getPath(newNode)]));
            });

            it('creating tree should put node in load and bases in partial 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    base2 = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    newNode,
                    changedNodes;

                core.persist(root);

                newNode = core.createNode({parent: isRoot ? root : parent, base: node});
                core.createNode({parent: newNode, base: node});
                core.createNode({parent: newNode, base: base2});
                changedNodes = persistAndGetPatchData();

                expect(changedNodes)
                    .to.deep.equal(getChangedNodesObj([path, core.getPath(base2)], [], [core.getPath(newNode)]));
            });

            it('del attribute should put node in update' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.setAttribute(node, 'name', 'hello');
                core.persist(root);

                core.delAttribute(node, 'name');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('del attribute should put node in update 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.setAttribute(node, 'name', 'hello');
                core.setAttribute(node, 'name2', 'hello');
                core.persist(root);

                core.delAttribute(node, 'name');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('setting attribute of instance should put it in update' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                    path = core.getPath(instance),
                    changedNodes;

                core.persist(root);

                core.setAttribute(instance, 'name', 'hello');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('setting pointer should put node in update and target in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathT = core.getPath(target),
                    changedNodes;

                core.persist(root);

                core.setPointer(node, 'ptt', target);
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathT], [path]));
            });

            it('setting pointer should put node in update and target in partial 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathT = core.getPath(target),
                    changedNodes;

                core.setPointer(node, 'ptt2', target);

                core.persist(root);

                core.setPointer(node, 'ptt', target);
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathT], [path]));
            });

            it('setting pointer should put node in update, oldTarget and newTarget in partials' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    targetNew = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathT = core.getPath(target),
                    pathTN = core.getPath(targetNew),
                    changedNodes;

                core.setPointer(node, 'ptt', target);

                core.persist(root);

                core.setPointer(node, 'ptt', targetNew);
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathT, pathTN], [path]));
            });

            it('setting pointer to null should put node in update' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.persist(root);

                core.setPointer(node, 'ptt', null);
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('setting pointer to null should put node in update and previous target to partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathT = core.getPath(target),
                    changedNodes;

                core.setPointer(node, 'ptt', target);

                core.persist(root);

                core.setPointer(node, 'ptt', null);
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathT], [path]));
            });

            it('del pointer should put node in update and target in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathT = core.getPath(target),
                    changedNodes;

                core.setPointer(node, 'ptt', target);
                core.persist(root);

                core.delPointer(node, 'ptt');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathT], [path]));
            });

            it('del pointer should put node in update and target in partial 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathT = core.getPath(target),
                    changedNodes;

                core.setPointer(node, 'ptt', target);
                core.setPointer(node, 'ptt2', target);
                core.persist(root);

                core.delPointer(node, 'ptt');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathT], [path]));
            });

            it('del null pointer should put node in update' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.setPointer(node, 'ptt', null);
                core.persist(root);

                core.delPointer(node, 'ptt');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('del null pointer should put node in update 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    target = core.createNode({parent: isRoot ? root : parent}),
                    changedNodes;

                core.setPointer(node, 'ptt', null);
                core.setPointer(node, 'ptt2', target);
                core.persist(root);

                core.delPointer(node, 'ptt');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('creating set should put node in update' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    changedNodes;

                core.persist(root);

                core.createSet(node, 'set');
                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([], [path]));
            });

            it('adding member should put node in update and member in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    member = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathM = core.getPath(member),
                    changedNodes;

                core.createSet(node, 'set');
                core.persist(root);

                core.addMember(node, 'set', member);

                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathM], [path]));
            });

            it('adding additional member should put node in update and member in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    member = core.createNode({parent: isRoot ? root : parent}),
                    member2 = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathM = core.getPath(member),
                    changedNodes;

                core.createSet(node, 'set');
                core.addMember(node, 'set', member2);
                core.persist(root);

                core.addMember(node, 'set', member);

                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathM], [path]));
            });

            it('del member should put node in update and member in partial' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    member = core.createNode({parent: isRoot ? root : parent}),
                    member2 = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathM = core.getPath(member),
                    changedNodes;

                core.addMember(node, 'set', member2);
                core.addMember(node, 'set', member);
                core.persist(root);

                core.delMember(node, 'set', pathM);

                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathM], [path]));
            });

            it('del member should put node in update and member in partial 2' + suffix, function () {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    member = core.createNode({parent: isRoot ? root : parent}),
                    path = core.getPath(node),
                    pathM = core.getPath(member),
                    changedNodes;

                core.addMember(node, 'set', member);
                core.persist(root);

                core.delMember(node, 'set', pathM);

                changedNodes = persistAndGetPatchData();

                expect(changedNodes).to.deep.equal(getChangedNodesObj([pathM], [path]));
            });

            // TODO: At some point we might have to consider changing this behavior.
            // TODO: That is that purely inherited children are treated as load,
            // TODO: (however the client converts these to updates too).
            it('in inherited child, setting attr should put it in update' + suffix, function (done) {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    child = core.createNode({parent: node}),
                    instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                    pathI = core.getPath(instance),
                    childRelid = core.getRelid(child),
                    pathIC = pathI + '/' + childRelid,
                    changedNodes;

                core.setAttribute(child, 'name', 'child');
                core.persist(root);

                core.loadByPath(root, pathIC, function (err, childInstance) {
                    expect(core.getAttribute(childInstance, 'name')).to.equal('child');
                    core.setAttribute(childInstance, 'name', 'preName');
                    core.persist(root);

                    core.setAttribute(childInstance, 'name', 'newChildName');
                    changedNodes = persistAndGetPatchData();
                    expect(changedNodes).to.deep.equal(getChangedNodesObj([], [pathIC]));
                    done();
                });

            });

            it('in purely inherited child, setting attr should put it in load' + suffix, function (done) {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    child = core.createNode({parent: node}),
                    instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                    pathI = core.getPath(instance),
                    childRelid = core.getRelid(child),
                    pathIC = pathI + '/' + childRelid,
                    changedNodes;

                core.setAttribute(child, 'name', 'child');
                core.persist(root);

                core.loadByPath(root, pathIC, function (err, childInstance) {
                    expect(core.getAttribute(childInstance, 'name')).to.equal('child');

                    core.setAttribute(childInstance, 'name', 'newChildName');
                    changedNodes = persistAndGetPatchData();
                    expect(changedNodes).to.deep.equal(getChangedNodesObj([], [], [pathIC]));
                    done();
                });
            });

            it('in inherited child, del attr should put it in update' + suffix, function (done) {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    child = core.createNode({parent: node}),
                    instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                    pathI = core.getPath(instance),
                    childRelid = core.getRelid(child),
                    pathIC = pathI + '/' + childRelid,
                    changedNodes;

                core.setAttribute(child, 'name', 'child');
                core.persist(root);

                core.loadByPath(root, pathIC, function (err, childInstance) {
                    expect(core.getAttribute(childInstance, 'name')).to.equal('child');
                    core.setAttribute(childInstance, 'name', 'preName');
                    core.persist(root);

                    core.delAttribute(childInstance, 'name');
                    changedNodes = persistAndGetPatchData();
                    expect(changedNodes).to.deep.equal(getChangedNodesObj([], [pathIC]));
                    done();
                });

            });

            it('in inherited child, setting null ptr should put it in update' + suffix, function (done) {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    child = core.createNode({parent: node}),
                    instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                    pathI = core.getPath(instance),
                    childRelid = core.getRelid(child),
                    pathIC = pathI + '/' + childRelid,
                    changedNodes;

                core.setAttribute(child, 'name', 'child');
                core.persist(root);

                core.loadByPath(root, pathIC, function (err, childInstance) {
                    expect(core.getAttribute(childInstance, 'name')).to.equal('child');
                    core.setAttribute(childInstance, 'name', 'preName');
                    core.persist(root);

                    core.setPointer(childInstance, 'ptr', null);
                    changedNodes = persistAndGetPatchData();
                    expect(changedNodes).to.deep.equal(getChangedNodesObj([], [pathIC]));
                    done();
                });
            });

            it('in purely inherited child, setting null ptr should put it in load' + suffix, function (done) {
                var node = core.createNode({parent: isRoot ? root : parent}),
                    child = core.createNode({parent: node}),
                    instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                    pathI = core.getPath(instance),
                    childRelid = core.getRelid(child),
                    pathIC = pathI + '/' + childRelid,
                    changedNodes;

                core.setAttribute(child, 'name', 'child');
                core.persist(root);

                core.loadByPath(root, pathIC, function (err, childInstance) {
                    expect(core.getAttribute(childInstance, 'name')).to.equal('child');

                    core.setPointer(childInstance, 'ptr', null);
                    changedNodes = persistAndGetPatchData();
                    expect(changedNodes).to.deep.equal(getChangedNodesObj([], [], [pathIC]));
                    done();
                });
            });

            it('in inherited child, setting ptr should put it in update and target in partial' + suffix,
                function (done) {
                    var node = core.createNode({parent: isRoot ? root : parent}),
                        child = core.createNode({parent: node}),
                        instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                        path = core.getPath(node),
                        pathI = core.getPath(instance),
                        childRelid = core.getRelid(child),
                        pathIC = pathI + '/' + childRelid,
                        changedNodes;

                    core.setAttribute(child, 'name', 'child');
                    core.persist(root);

                    core.loadByPath(root, pathIC, function (err, childInstance) {
                        expect(core.getAttribute(childInstance, 'name')).to.equal('child');
                        core.setAttribute(childInstance, 'name', 'preName');
                        core.persist(root);

                        core.setPointer(childInstance, 'ptr', node);
                        changedNodes = persistAndGetPatchData();
                        expect(changedNodes).to.deep.equal(getChangedNodesObj([path], [pathIC]));
                        done();
                    });
                }
            );

            it('in purely inherited child, setting ptr should put it in load and target in partial' + suffix,
                function (done) {
                    var node = core.createNode({parent: isRoot ? root : parent}),
                        child = core.createNode({parent: node}),
                        instance = core.createNode({parent: isRoot ? root : parent, base: node}),
                        path = core.getPath(node),
                        pathI = core.getPath(instance),
                        childRelid = core.getRelid(child),
                        pathIC = pathI + '/' + childRelid,
                        changedNodes;

                    core.setAttribute(child, 'name', 'child');
                    core.persist(root);

                    core.loadByPath(root, pathIC, function (err, childInstance) {
                        expect(core.getAttribute(childInstance, 'name')).to.equal('child');

                        core.setPointer(childInstance, 'ptr', node);
                        changedNodes = persistAndGetPatchData();
                        expect(changedNodes).to.deep.equal(getChangedNodesObj([path], [], [pathIC]));
                        done();
                    });
                }
            );
        }

        createTests(true, ' parent is root.');
        createTests(false, ' parent is NOT root.');
    });

    describe('sharded overlay handling', function () {

        it('should work fine during first creation', function () {
            var oldData = {
                    6: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    _id: '',
                    ovr: {'/6': {parentA: '', 'parentB': ''}},
                    __v: '1.1.0'
                },
                newData = {
                    6: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    _id: '',
                    __v: '1.1.0',
                    ovr: {
                        9: '#f53f3346eb25868aba13cbfed5abad3ccb7758fd',
                        sharded: true,
                        l: '#1c29df713f7cc6500bfa999b82a3cffe4956fb1e',
                        r: '#4a5ef79b14caf635b7e645c8c66bf35850bc5d15',
                        S: '#3fb07aae598bd03cfa059ba55acb1ea8c6c1634e'
                    }
                },
                patch = patcher.create(oldData, newData);

            expect(patcher.apply(oldData, patch).result).to.eql(newData);
            expect(patch).to.eql([{
                op: 'replace', path: '/ovr',
                value: {
                    9: '#f53f3346eb25868aba13cbfed5abad3ccb7758fd',
                    sharded: true,
                    l: '#1c29df713f7cc6500bfa999b82a3cffe4956fb1e',
                    r: '#4a5ef79b14caf635b7e645c8c66bf35850bc5d15',
                    S: '#3fb07aae598bd03cfa059ba55acb1ea8c6c1634e'
                },
                preShardRelations: {'/6': {parentA: '', parentB: ''}}
            }]);
        });

        it('should work fine during shard addition', function () {
            var oldData = {
                    6: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    '_id': '',
                    '__v': '1.1.0',
                    c: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    ovr: {
                        9: '#f53f3346eb25868aba13cbfed5abad3ccb7758fd',
                        sharded: true,
                        S: '#3fb07aae598bd03cfa059ba55acb1ea8c6c1634e'
                    },
                    X: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    G: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a'
                },
                newData = {
                    6: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    '_id': '',
                    '__v': '1.1.0',
                    c: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    ovr: {
                        9: '#f53f3346eb25868aba13cbfed5abad3ccb7758fd',
                        sharded: true,
                        l: '#1c29df713f7cc6500bfa999b82a3cffe4956fb1e',
                        r: '#4a5ef79b14caf635b7e645c8c66bf35850bc5d15',
                        S: '#3fb07aae598bd03cfa059ba55acb1ea8c6c1634e'
                    },
                    X: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    G: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a'
                },
                patch = patcher.create(oldData, newData);

            expect(patcher.apply(oldData, patch).result).to.eql(newData);
        });

        it('should work fine during shard removal', function () {
            var newData = {
                    6: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    '_id': '',
                    '__v': '1.1.0',
                    c: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    ovr: {
                        9: '#f53f3346eb25868aba13cbfed5abad3ccb7758fd',
                        sharded: true,
                        S: '#3fb07aae598bd03cfa059ba55acb1ea8c6c1634e'
                    },
                    X: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    G: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a'
                },
                oldData = {
                    6: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    '_id': '',
                    '__v': '1.1.0',
                    c: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    ovr: {
                        9: '#f53f3346eb25868aba13cbfed5abad3ccb7758fd',
                        sharded: true,
                        l: '#1c29df713f7cc6500bfa999b82a3cffe4956fb1e',
                        r: '#4a5ef79b14caf635b7e645c8c66bf35850bc5d15',
                        S: '#3fb07aae598bd03cfa059ba55acb1ea8c6c1634e'
                    },
                    X: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a',
                    G: '#e1d65cdafc2aeef464efdf67895f6d9ec54f650a'
                },
                patch = patcher.create(oldData, newData);

            expect(patcher.apply(oldData, patch).result).to.eql(newData);
        });

        it('should create a valid patch for updating entry inside shard-item', function () {
            var oldData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: '',
                            parentB: ''
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                newData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: '',
                            parentB: '/some/path'
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                patch = patcher.create(oldData, newData);

            expect(patch).to.eql([{
                op: 'replace',
                path: '/items/%2fW/parentB',
                value: '/some/path',
                updates: ['/W'],
                partialUpdates: ['/some/path', '']
            }]);
        });

        it('should create a valid patch for adding entry to shard-item', function () {
            var oldData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: '',
                            parentB: ''
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                newData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: '',
                            parentB: '',
                            parentC: ''
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                patch = patcher.create(oldData, newData);

            expect(patch).to.eql([{
                op: 'add',
                path: '/items/%2fW/parentC',
                value: '',
                updates: ['/W'],
                partialUpdates: ['']
            }]);
        });

        it('should create a valid patch for removing entry from shard-item', function () {
            var oldData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: '',
                            parentB: ''
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                newData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: ''
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                patch = patcher.create(oldData, newData);

            expect(patch).to.eql([{
                op: 'remove',
                path: '/items/%2fW/parentB',
                updates: ['/W'],
                partialUpdates: ['']
            }]);
        });

        it('should create a valid patch for removing a shard entry', function () {
            var oldData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {
                        '/W': {
                            parentA: '',
                            parentB: ''
                        }
                    },
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                newData = {
                    type: 'shard',
                    itemCount: 2,
                    items: {},
                    '_id': '#6ca0a1a3c52f381e69d7fa930468c7adce47646b',
                    '__v': '1.1.0'
                },
                patch = patcher.create(oldData, newData);

            expect(patch).to.eql([{
                op: 'replace',
                path: '/items',
                value: {},
                partialUpdates: ['', ''],
                updates: ['/W']
            }]);
        });
    });

    describe('sharded overlay handling in core changes', function () {
        this.timeout(10000);
        var gmeConfig = testFixture.getGmeConfig(),
            Q = testFixture.Q,
            logger = testFixture.logger.fork('jsonPatcher.core.shard.changes.spec'),
            storageUtil = testFixture.requirejs('common/storage/util'),
            storage,
            projectName = 'coreShardChanges',
            basicRootHash,
            shardedRootHash,
            core,
            root,
            gmeAuth;

        function persistAndGetPatches() {
            var persisted = core.persist(root),
                hash,
                patch = {};

            for (hash in persisted.objects) {
                if (storageUtil.coreObjectHasOldAndNewData(persisted.objects[hash])) {
                    patch[hash] = storageUtil.getPatchObject(
                        persisted.objects[hash].oldData,
                        persisted.objects[hash].newData);
                } else if (persisted.objects[hash].newData) {
                    patch[hash] = persisted.objects[hash].newData;
                }
            }

            return patch;
        }

        before(function (done) {
            gmeConfig.core.overlayShardSize = 8;
            testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                    return storage.openDatabase();
                })
                .then(function () {
                    return storage.openDatabase();
                })
                .then(function () {
                    return storage.createProject({projectName: projectName});
                })
                .then(function (dbProject) {

                    var project = new testFixture.Project(dbProject, storage, logger, gmeConfig),
                        root,
                        child1,
                        child2,
                        child3,
                        child4;

                    core = new testFixture.WebGME.core(project, {
                        globConf: gmeConfig,
                        logger: logger.fork('core')
                    });

                    root = core.createNode();
                    child1 = core.createNode({parent: root, relid: '1'});
                    child2 = core.createNode({parent: root, relid: '2'});
                    core.setPointer(child1, 'parent', root);
                    // core.setPointer(child2, 'parent', root);
                    core.setPointer(root, 'noref', null);
                    core.persist(root);
                    basicRootHash = core.getHash(root);

                    core.setPointer(child2, 'parent', root);
                    child3 = core.createNode({parent: root, relid: '3'});
                    core.setPointer(child3, 'parent', root);
                    child4 = core.createNode({parent: root, relid: '4'});
                    core.setPointer(child4, 'parent', root);
                    core.persist(root);
                    shardedRootHash = core.getHash(root);

                })
                .nodeify(done);
        });

        after(function (done) {
            Q.allDone([
                storage.closeDatabase(),
                gmeAuth.unload()
            ])
                .nodeify(done);
        });

        beforeEach(function (done) {
            Q.ninvoke(core, 'loadRoot', basicRootHash)
                .then(function (root_) {
                    root = root_;
                    expect(root.overlays).to.eql(undefined);
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding add relation', function () {
            var newChild = core.createNode({parent: root, relid: 'new'}),
                patch,
                changes;
            core.setPointer(newChild, 'parent', root);
            core.setPointer(newChild, 'parent_', root);
            patch = persistAndGetPatches();
            changes = patcher.getChangedNodes(patch, core.getHash(root), '');
            expect(changes).to.eql({
                load: {'/new': true},
                unload: {},
                update: {},
                partialUpdate: {'': true}
            });
        });

        it('should generate correct changes - sharding add relations', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var i,
                        newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', root);
                    core.setPointer(newChild, 'parent_', root);

                    for (i = 0; i < oldChildren.length; i += 1) {
                        core.setPointer(oldChildren[i], 'parent_', root);
                        core.setPointer(oldChildren[i], 'sibling', newChild);
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'/1': true, '/2': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding add null relations', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var i,
                        newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', root);
                    core.setPointer(newChild, 'parent_', root);
                    core.setPointer(root, 'nptr', null);

                    for (i = 0; i < oldChildren.length; i += 1) {
                        core.setPointer(oldChildren[i], 'parent_', root);
                        core.setPointer(oldChildren[i], 'sibling', newChild);
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'/1': true, '/2': true, '': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding update relations', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var i,
                        newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', root);
                    core.setPointer(newChild, 'parent_', root);

                    for (i = 0; i < oldChildren.length; i += 1) {
                        core.setPointer(oldChildren[i], 'parent', newChild);
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'/1': true, '/2': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding update null relation', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', oldChildren[0]);
                    core.setPointer(newChild, 'parent_', oldChildren[1]);
                    core.setPointer(root, 'noref', newChild);

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'': true},
                        partialUpdate: {'/1': true, '/2': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding remove relations', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var i,
                        newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', root);
                    core.setPointer(newChild, 'parent_', root);

                    for (i = 0; i < oldChildren.length; i += 1) {
                        core.deletePointer(oldChildren[i], 'parent');
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'/1': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding remove null relation', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', oldChildren[0]);
                    core.setPointer(newChild, 'parent_', oldChildren[1]);

                    core.deletePointer(root, 'noref');

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'': true},
                        partialUpdate: {'/1': true, '/2': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding add and remove relations', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var i,
                        newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', root);
                    core.setPointer(newChild, 'parent_', root);

                    for (i = 0; i < oldChildren.length; i += 1) {
                        core.deletePointer(oldChildren[i], 'parent');
                        core.setPointer(oldChildren[i], 'sibling', newChild);
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {},
                        update: {'/1': true, '/2': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharding remove relations and nodes', function (done) {
            Q.ninvoke(core, 'loadChildren', root)
                .then(function (oldChildren) {
                    var i,
                        newChild = core.createNode({parent: root, relid: 'new'}),
                        patch,
                        changes;

                    expect(oldChildren).to.have.length(2);

                    core.setPointer(newChild, 'parent', root);
                    core.setPointer(newChild, 'parent_', root);

                    for (i = 0; i < oldChildren.length; i += 1) {
                        core.setBase(oldChildren[i], newChild);
                        core.deleteNode(oldChildren[i]);
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/new': true},
                        unload: {'/1': true, '/2': true},
                        update: {},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharded add relation', function (done) {
            Q.ninvoke(core, 'loadRoot', shardedRootHash)
                .then(function (root_) {
                    root = root_;
                    return Q.ninvoke(core, 'loadChild', root, '1');
                })
                .then(function (child1) {
                    var patch,
                        changes;

                    expect(child1).not.to.eql(null);
                    core.setPointer(child1, 'parent_', root);

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {},
                        unload: {},
                        update: {'/1': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharded add null relation', function (done) {
            Q.ninvoke(core, 'loadRoot', shardedRootHash)
                .then(function (root_) {
                    root = root_;
                    return Q.ninvoke(core, 'loadChild', root, '1');
                })
                .then(function (child1) {
                    var patch,
                        changes;

                    expect(child1).not.to.eql(null);
                    core.setPointer(child1, 'nptr', null);
                    core.setPointer(child1, 'parent', null);
                    core.setPointer(root, 'nptr', null);

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {},
                        unload: {},
                        update: {'/1': true, '': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharded add shard', function (done) {
            Q.ninvoke(core, 'loadRoot', shardedRootHash)
                .then(function (root_) {
                    var patch,
                        changes,
                        newChild1, newChild2, newChild3;

                    root = root_;

                    newChild1 = core.createNode({parent: root, relid: 'n1'});
                    core.setPointer(newChild1, 'parent', root);
                    newChild2 = core.createNode({parent: root, relid: 'n2'});
                    core.setPointer(newChild2, 'parent', root);
                    newChild3 = core.createNode({parent: root, relid: 'n3'});
                    core.setPointer(newChild3, 'parent', root);

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {'/n1': true, '/n2': true, '/n3': true},
                        unload: {},
                        update: {},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - sharded remove relations', function (done) {
            Q.ninvoke(core, 'loadRoot', shardedRootHash)
                .then(function (root_) {
                    root = root_;
                    return Q.ninvoke(core, 'loadChildren', root);
                })
                .then(function (children) {
                    var patch,
                        changes,
                        i;

                    expect(children).to.have.length(4);

                    for (i = 0; i < children.length; i += 1) {
                        core.deletePointer(children[i], 'parent');
                    }

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql({
                        load: {},
                        unload: {},
                        update: {'/1': true, '/2': true, '/3': true, '/4': true},
                        partialUpdate: {'': true}
                    });
                })
                .nodeify(done);
        });

        it('should generate correct changes - copy node', function (done) {
            Q.ninvoke(core, 'loadRoot', shardedRootHash)
                .then(function (root_) {
                    root = root_;
                    return Q.ninvoke(core, 'loadChildren', root);
                })
                .then(function (children) {
                    var patch,
                        changes,
                        expectedChanges = {
                            load: {}, unload: {}, update: {}, partialUpdate: {'': true}
                        };

                    expect(children).to.have.length(4);

                    expectedChanges.load[core.getPath(core.copyNode(children[0], root))] = true;

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql(expectedChanges);
                })
                .nodeify(done);
        });

        it('should generate correct changes - copy more nodes', function (done) {
            Q.ninvoke(core, 'loadRoot', shardedRootHash)
                .then(function (root_) {
                    root = root_;
                    return Q.ninvoke(core, 'loadChildren', root);
                })
                .then(function (children) {
                    var tempS, tempT;

                    expect(children).to.have.length(4);
                    tempS = core.createNode({parent: root, relid: 'temp'});
                    children[0] = core.moveNode(children[0], tempS);
                    children[1] = core.moveNode(children[1], tempS);
                    children[2] = core.moveNode(children[2], tempS);
                    children[3] = core.moveNode(children[3], tempS);
                    tempT = core.copyNode(tempS, root);
                    children[0] = core.moveNode(children[0], root);
                    children[1] = core.moveNode(children[1], root);
                    children[2] = core.moveNode(children[2], root);
                    children[3] = core.moveNode(children[3], root);

                    core.setBase(tempS, children[0]);
                    core.deleteNode(tempS);

                    return Q.nfcall(core.loadChildren, tempT);
                })
                .then(function (copies) {
                    var patch,
                        tempT,
                        changes,
                        expectedChanges = {
                            load: {}, unload: {}, update: {}, partialUpdate: {'':true}
                        };

                    expect(copies).to.have.length(4);

                    tempT = core.getParent(copies[0]);
                    copies[0] = core.moveNode(copies[0], root);
                    expectedChanges.load[core.getPath(copies[0])] = true;
                    expectedChanges.load[core.getPath(core.moveNode(copies[1], root))] = true;
                    expectedChanges.load[core.getPath(core.moveNode(copies[2], root))] = true;
                    expectedChanges.load[core.getPath(core.moveNode(copies[3], root))] = true;

                    core.setBase(tempT, copies[0]);
                    core.deleteNode(tempT);

                    patch = persistAndGetPatches();
                    changes = patcher.getChangedNodes(patch, core.getHash(root), '');
                    expect(changes).to.eql(expectedChanges);
                })
                .nodeify(done);
        });
    });
});

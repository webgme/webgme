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
});

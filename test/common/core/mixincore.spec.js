/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('mixin core', function () {
    'user strict';

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('mixincore.spec'),
        storage,
        projectName = 'mixinTest',
        project,
        core,
        rootNode,
        commit,
        baseRootHash,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'seeds/EmptyProject.webgmex',
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
                baseRootHash = result.rootHash;
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

    describe('new functionality', function () {
        beforeEach(function (done) {
            core.loadRoot(baseRootHash)
                .then(function (root) {
                    rootNode = root;
                })
                .nodeify(done);
        });

        it('should give empty response regarding mixins for empty project', function () {
            var root = rootNode, //saving just for sure
                metaNodes = core.getAllMetaNodes(root),
                i;

            expect(core.getMixinNodes(root)).to.eql({});

            for (i in metaNodes) {
                expect(core.getMixinNodes(metaNodes[i])).to.eql({});
            }
        });

        it('should be able to add and remove elements of Meta to the mixins', function () {
            var root = rootNode, //saving just for sure
                FCO = core.getAllMetaNodes(root)['/1'],
                mixin = core.createNode({parent: root, base: FCO}),
                i;

            core.addMember(root, 'MetaAspectSet', mixin);
            core.addMixin(FCO, core.getPath(mixin));

            expect(core.getMixinPaths(FCO)).to.include.members([core.getPath(mixin)]);

            core.delMixin(FCO, core.getPath(mixin));
            expect(core.getMixinPaths(FCO)).not.to.include.members([core.getPath(mixin)]);

        });

        it('should be able to add itself to the mixins', function () {
            var root = rootNode, //saving just for sure
                FCO = core.getAllMetaNodes(root)['/1'];

            core.addMixin(FCO, '/1');

            expect(core.getMixinPaths(FCO)).to.include.members(['/1']);
        });

        it('should not add a mixin which is not on the Meta', function () {
            var root = rootNode, //saving just for sure
                mixin = core.createNode({parent: root, base: null}),
                FCO = core.getAllMetaNodes(root)['/1'];

            core.addMixin(FCO, core.getPath(mixin));

            expect(core.getMixinPaths(FCO)).not.to.include.members([core.getPath(mixin)]);
        });

        it('should be able to remove mixin even if it was previously removed from Meta', function () {
            var root = rootNode, //saving just for sure
                FCO = core.getAllMetaNodes(root)['/1'],
                mixin = core.createNode({parent: root, base: FCO}),
                mixinPath = core.getPath(mixin);

            core.addMember(root, 'MetaAspectSet', mixin);
            core.addMixin(FCO, mixinPath);

            expect(core.getMixinPaths(FCO)).to.include.members([mixinPath]);
            expect(Object.keys(core.getMixinNodes(FCO))).to.include.members([mixinPath]);

            core.delMember(root, 'MetaAspectSet', mixinPath);

            expect(core.getMixinPaths(FCO)).to.include.members([mixinPath]);
            expect(Object.keys(core.getMixinNodes(FCO))).not.to.include.members([mixinPath]);

            core.delMixin(FCO, mixinPath);

            expect(core.getMixinPaths(FCO)).not.to.include.members([mixinPath]);
            expect(Object.keys(core.getMixinNodes(FCO))).not.to.include.members([mixinPath]);

        });

        it('should be able to remove all mixins', function () {
            var root = rootNode, //saving just for sure
                mixin = core.createNode({parent: root, base: null}),
                otherMixin = core.createNode({parent: root, base: null}),
                FCO = core.getAllMetaNodes(root)['/1'];

            //put mixins onto meta sheet
            core.addMember(root, 'MetaAspectSet', mixin);
            core.addMember(root, 'MetaAspectSet', otherMixin);

            //add mixins
            core.addMixin(FCO, core.getPath(mixin));
            core.addMixin(FCO, core.getPath(otherMixin));

            expect(core.getMixinPaths(FCO)).to.have.members([core.getPath(mixin), core.getPath(otherMixin)]);

            //clear it all!
            core.clearMixins(FCO);

            expect(core.getMixinPaths(FCO)).to.have.length(0);
        });

    });

    describe('basic', function () {
        var FCO, A, M1, M2, M3, M4, ROOT;
        beforeEach(function (done) {
            //nodes:
            // A: 5ebfcb27-9795-4c57-8874-19d0bb37f58d '/A'
            // M1: 8f0bf1f5-970a-4d62-a4a0-713e63a00f10 '/M1'
            // M2: a8d407f0-524d-469c-8581-a6fb6520226c '/M2'
            // M3: e76571ec-0948-4137-b53b-e9701fd5a6f3 '/M3'
            // M4: a8d407f0-524d-469c-8581-a6fb6520226d '/M4'
            //the following relations will be built up on the Meta
            // FCO base of every node, except M3: M3 is an instance of M1
            // A's mixin: M2, M4
            //FCO's mixin: M1
            // M2's mixin: M3
            core.loadRoot(baseRootHash)
                .then(function (root) {
                    ROOT = root;
                    FCO = core.getAllMetaNodes(root)['/1'];
                    A = core.createNode({
                        parent: root,
                        base: FCO,
                        relid: 'A',
                        guid: '5ebfcb27-9795-4c57-8874-19d0bb37f58d'
                    });
                    M1 = core.createNode({
                        parent: root,
                        base: FCO,
                        relid: 'M1',
                        guid: '8f0bf1f5-970a-4d62-a4a0-713e63a00f10'
                    });
                    M2 = core.createNode({
                        parent: root,
                        base: FCO,
                        relid: 'M2',
                        guid: 'a8d407f0-524d-469c-8581-a6fb6520226c'
                    });
                    M3 = core.createNode({
                        parent: root,
                        base: M1,
                        relid: 'M3',
                        guid: 'e76571ec-0948-4137-b53b-e9701fd5a6f3'
                    });
                    M4 = core.createNode({
                        parent: root,
                        base: FCO,
                        relid: 'M4',
                        guid: 'a8d407f0-524d-469c-8581-a6fb6520226d'
                    });

                    rootNode = root;

                    //adding everybody to the Meta
                    core.addMember(root, 'MetaAspectSet', A);
                    core.addMember(root, 'MetaAspectSet', M1);
                    core.addMember(root, 'MetaAspectSet', M2);
                    core.addMember(root, 'MetaAspectSet', M3);
                    core.addMember(root, 'MetaAspectSet', M4);

                    //A
                    core.setAttribute(A, 'name', 'A');
                    core.addMixin(A, '/M2');
                    core.addMixin(A, '/M4');
                    core.setAttributeMeta(A, 'A', {type: 'integer'});
                    core.setAspectMetaTarget(A, 'A', FCO);
                    core.setPointerMetaTarget(A, 'A', FCO, 0, 1);
                    core.setPointerMetaLimits(A, 'A', 0, 1);
                    core.setChildMeta(A, A, 0, 1);
                    core.setPointerMetaTarget(A, 'sA', FCO, -1, -1);
                    core.setPointerMetaLimits(A, 'sA', -1, -1);

                    //FCO
                    core.addMixin(FCO, '/M1');
                    core.setPointerMetaTarget(FCO, 'FCO', FCO, 0, 1);
                    core.setPointerMetaLimits(FCO, 'FCO', 0, 1);

                    //M1
                    core.setAttribute(M1, 'name', 'M1');
                    core.setAttributeMeta(M1, 'M1', {type: 'string'});
                    core.setAspectMetaTarget(M1, 'M1', FCO);
                    core.setPointerMetaTarget(M1, 'Ms', M2, 0, 1);
                    core.setPointerMetaLimits(M1, 'Ms', 0, 1);
                    core.setChildMeta(M1, M2, 0, 1);
                    core.setPointerMetaTarget(M1, 'sMs', M2, -1, -1);
                    core.setPointerMetaLimits(M1, 'sMs', -1, -1);

                    //M2
                    core.setAttribute(M2, 'name', 'M2');
                    core.addMixin(M2, '/M3');
                    core.setAttributeMeta(M2, 'M2', {type: 'string'});
                    core.setAspectMetaTarget(M2, 'M2', FCO);
                    core.setPointerMetaTarget(M2, 'Ms', M3, 0, 1);
                    core.setPointerMetaLimits(M2, 'Ms', 0, 1);
                    core.setPointerMetaTarget(M2, 'MEs', M4, 0, 1);
                    core.setPointerMetaLimits(M2, 'MEs', 0, 1);
                    core.setChildMeta(M2, M3, 0, 1);
                    core.setPointerMetaTarget(M2, 'sMs', M3, -1, -1);
                    core.setPointerMetaLimits(M2, 'sMs', -1, -1);

                    //M3
                    core.setAttribute(M3, 'name', 'M3');
                    core.setAttributeMeta(M3, 'M3', {type: 'integer'});
                    core.setAttributeMeta(M3, 'conflicting', {type: 'integer'});
                    core.setAspectMetaTarget(M3, 'M3', FCO);
                    core.setAspectMetaTarget(M3, 'conflicting', FCO);
                    core.setPointerMetaTarget(M3, 'Ms', M4, 0, 1);
                    core.setPointerMetaLimits(M3, 'Ms', 0, 1);
                    core.setChildMeta(M3, M4, 0, 1);
                    core.setChildMeta(M3, M1, 0, 10);
                    core.setPointerMetaTarget(M3, 'sMs', M4, 0, 10);
                    core.setPointerMetaLimits(M3, 'sMs', -1, -1);

                    //M4
                    core.setAttribute(M4, 'name', 'M4');
                    core.setAttributeMeta(M4, 'M4', {type: 'integer'});
                    core.setAttributeMeta(M4, 'conflicting', {type: 'string'});
                    core.setAspectMetaTarget(M4, 'M4', FCO);
                    core.setAspectMetaTarget(M4, 'conflicting', A);
                    core.setPointerMetaTarget(M4, 'Ms', M1, 0, 1);
                    core.setPointerMetaTarget(M4, 'Ms', M3, 0, 10);
                    core.setPointerMetaLimits(M4, 'Ms', 0, 1);
                    core.setPointerMetaTarget(M4, 'MEs', M2, 0, 1);
                    core.setPointerMetaLimits(M4, 'MEs', 0, 1);
                    core.setChildMeta(M4, M1, 1, 1);
                    core.setPointerMetaTarget(M4, 'sMs', M4, -1, -1);
                    core.setPointerMetaLimits(M4, 'sMs', -1, -1);

                })
                .nodeify(done);
        });

        it('should return the names of attribute rules extended with mixin definitions', function () {
            expect(core.getValidAttributeNames(A)).to.have.members(['name',
                'M1', 'A', 'M2', 'M3', 'M4', 'conflicting']);
            expect(core.getValidAttributeNames(FCO)).to.have.members(['name', 'M1']);
            expect(core.getValidAttributeNames(M1)).to.have.members(['name', 'M1']);
            expect(core.getValidAttributeNames(M2)).to.have.members(['name', 'M1', 'M2', 'M3', 'conflicting']);
            expect(core.getValidAttributeNames(M3)).to.have.members(['name', 'M1', 'M3', 'conflicting']);
            expect(core.getValidAttributeNames(M4)).to.have.members(['name', 'M1', 'M4', 'conflicting']);
        });

        it('should return the names of aspect rules extended with mixin definitions', function () {
            expect(core.getValidAspectNames(A)).to.have.members(['M1', 'A', 'M2', 'M3', 'M4', 'conflicting']);
            expect(core.getValidAspectNames(FCO)).to.have.members(['M1']);
            expect(core.getValidAspectNames(M1)).to.have.members(['M1']);
            expect(core.getValidAspectNames(M2)).to.have.members(['M1', 'M2', 'M3', 'conflicting']);
            expect(core.getValidAspectNames(M3)).to.have.members(['M1', 'M3', 'conflicting']);
            expect(core.getValidAspectNames(M4)).to.have.members(['M1', 'M4', 'conflicting']);
        });

        it('should return the names of pointer rules extended with mixin definitions', function () {
            expect(core.getValidPointerNames(A)).to.have.members(['A', 'FCO', 'Ms', 'MEs']);
            expect(core.getValidPointerNames(FCO)).to.have.members(['FCO', 'Ms']);
            expect(core.getValidPointerNames(M1)).to.have.members(['Ms', 'FCO']);
            expect(core.getValidPointerNames(M2)).to.have.members(['Ms', 'MEs', 'FCO']);
            expect(core.getValidPointerNames(M3)).to.have.members(['Ms', 'FCO']);
            expect(core.getValidPointerNames(M4)).to.have.members(['Ms', 'MEs', 'FCO']);
        });

        it('should return the names of set rules extended with mixin definitions', function () {
            expect(core.getValidSetNames(A)).to.have.members(['sA', 'sMs']);
            expect(core.getValidSetNames(FCO)).to.have.members(['sMs']);
            expect(core.getValidSetNames(M1)).to.have.members(['sMs']);
            expect(core.getValidSetNames(M2)).to.have.members(['sMs']);
            expect(core.getValidSetNames(M3)).to.have.members(['sMs']);
            expect(core.getValidSetNames(M4)).to.have.members(['sMs']);
        });

        it('should return the aspect rule of the first match in the order', function () {
            expect(core.getAspectMeta(A, 'A')).to.eql(['/1']);
            expect(core.getAspectMeta(A, 'M1')).to.eql(['/1']);
            expect(core.getAspectMeta(A, 'M2')).to.eql(['/1']);
            expect(core.getAspectMeta(A, 'M3')).to.eql(['/1']);
            expect(core.getAspectMeta(A, 'M4')).to.eql(['/1']);
            expect(core.getAspectMeta(A, 'conflicting')).to.eql(['/1']);
            expect(core.getAspectMeta(A, 'unknown')).to.eql(undefined);
        });

        it('should return the attribute rule of the first match in the order', function () {
            expect(core.getAttributeMeta(A, 'A')).to.eql({type: 'integer'});
            expect(core.getAttributeMeta(A, 'M1')).to.eql({type: 'string'});
            expect(core.getAttributeMeta(A, 'M2')).to.eql({type: 'string'});
            expect(core.getAttributeMeta(A, 'M3')).to.eql({type: 'integer'});
            expect(core.getAttributeMeta(A, 'M4')).to.eql({type: 'integer'});
            expect(core.getAttributeMeta(A, 'conflicting')).to.eql({type: 'integer'});
            expect(core.getAttributeMeta(A, 'name')).to.eql({type: 'string'});
            expect(core.getAttributeMeta(A, 'unknown')).to.eql(undefined);
        });

        it('should return the containment rule combined from all sources', function () {
            expect(core.getChildrenMeta(A)).to.eql({
                min: undefined,
                max: undefined,
                '/A': {min: -1, max: 1},
                '/M2': {min: -1, max: 1},
                '/M3': {min: -1, max: 1},
                '/M4': {min: -1, max: 1},
                '/M1': {min: -1, max: 10}
            });

            expect(core.getChildrenMeta(FCO)).to.eql({
                min: undefined,
                max: undefined,
                '/M2': {min: -1, max: 1}
            });

            expect(core.getChildrenMeta(M1)).to.eql({
                min: undefined,
                max: undefined,
                '/M2': {min: -1, max: 1}
            });

            expect(core.getChildrenMeta(M2)).to.eql({
                min: undefined,
                max: undefined,
                '/M2': {min: -1, max: 1},
                '/M3': {min: -1, max: 1},
                '/M4': {min: -1, max: 1},
                '/M1': {min: -1, max: 10}
            });

            expect(core.getChildrenMeta(M3)).to.eql({
                min: undefined,
                max: undefined,
                '/M2': {min: -1, max: 1},
                '/M4': {min: -1, max: 1},
                '/M1': {min: -1, max: 10}
            });

            expect(core.getChildrenMeta(M4)).to.eql({
                min: undefined,
                max: undefined,
                '/M1': {min: 1, max: 1},
                '/M2': {min: -1, max: 1}
            });
        });

        it('should return pointer rule combined from all sources', function () {
            expect(core.getPointerMeta(A, 'Ms')).to.eql({
                min: -1,
                max: 1,
                '/M2': {min: -1, max: 1},
                '/M3': {min: -1, max: 1},
                '/M4': {min: -1, max: 1},
                '/M1': {min: -1, max: 1}
            });

            expect(core.getPointerMeta(A, 'FCO')).to.eql({
                min: -1,
                max: 1,
                '/1': {min: -1, max: 1}
            });

            expect(core.getPointerMeta(A, 'MEs')).to.eql({
                min: -1,
                max: 1,
                '/M2': {min: -1, max: 1},
                '/M4': {min: -1, max: 1}
            });

            expect(core.getPointerMeta(A, 'unknown')).to.eql(undefined);
        });

        it('should return set rule combined from all sources', function () {
            expect(core.getPointerMeta(A, 'sMs')).to.eql({
                min: -1,
                max: -1,
                '/M2': {min: -1, max: -1},
                '/M3': {min: -1, max: -1},
                '/M4': {min: -1, max: 10}
            });

            expect(core.getPointerMeta(M4, 'sMs')).to.eql({
                min: -1,
                max: -1,
                '/M2': {min: -1, max: -1},
                '/M4': {min: -1, max: -1}
            });
        });

        it('should not return values of mixins, but only inherited and direct ones', function () {
            core.setAttribute(M1, 'M1', 'M1');
            expect(core.getAttribute(A, 'M1')).to.equal(undefined);

            core.setAttribute(FCO, 'M1', 'FCO');
            expect(core.getAttribute(A, 'M1')).to.equal('FCO');

            core.setAttribute(A, 'M1', 'A');
            expect(core.getAttribute(A, 'M1')).to.equal('A');
        });

        it('should return the base type, and the mixins directly related to that given type', function () {
            var getBasesNameArray = function (node) {
                var bases = core.getBaseTypes(node),
                    i;
                for (i = 0; i < bases.length; i += 1) {
                    bases[i] = core.getAttribute(bases[i], 'name');
                }
                return bases;
            };

            expect(getBasesNameArray(FCO)).to.eql(['FCO', 'M1']);
            expect(getBasesNameArray(M1)).to.eql(['M1']);
            expect(getBasesNameArray(M2)).to.eql(['M2', 'M3']);
            expect(getBasesNameArray(M3)).to.eql(['M3']);
            expect(getBasesNameArray(M4)).to.eql(['M4']);
            expect(getBasesNameArray(A)).to.eql(['A', 'M2', 'M4']);

            //check for instances of each as well
            expect(getBasesNameArray(core.createNode({parent: ROOT, base: FCO}))).to.eql(['FCO', 'M1']);
            expect(getBasesNameArray(core.createNode({parent: ROOT, base: M1}))).to.eql(['M1']);
            expect(getBasesNameArray(core.createNode({parent: ROOT, base: M2}))).to.eql(['M2', 'M3']);
            expect(getBasesNameArray(core.createNode({parent: ROOT, base: M3}))).to.eql(['M3']);
            expect(getBasesNameArray(core.createNode({parent: ROOT, base: M4}))).to.eql(['M4']);
            expect(getBasesNameArray(core.createNode({parent: ROOT, base: A}))).to.eql(['A', 'M2', 'M4']);

        });

        it('should return list of directly connected mixins as part of the own meta rules', function () {
            expect(core.getOwnJsonMeta(FCO).mixins).to.eql(['/M1']);
            expect(core.getOwnJsonMeta(M1).mixins).to.eql(undefined);
            expect(core.getOwnJsonMeta(M2).mixins).to.eql(['/M3']);
            expect(core.getOwnJsonMeta(M3).mixins).to.eql(undefined);
            expect(core.getOwnJsonMeta(M4).mixins).to.eql(undefined);
            expect(core.getOwnJsonMeta(A).mixins).to.have.members(['/M2', '/M4']);
        });

        it('should check if a target is valid based on the combined rule-set', function () {
            expect(core.isValidTargetOf(FCO, A, 'FCO')).to.equal(true);
            expect(core.isValidTargetOf(M1, A, 'FCO')).to.equal(true);
            expect(core.isValidTargetOf(FCO, A, 'Ms')).to.equal(true);
            expect(core.isValidTargetOf(M1, A, 'Ms')).to.equal(true);
            expect(core.isValidTargetOf(M2, A, 'Ms')).to.equal(true);
            expect(core.isValidTargetOf(M3, A, 'FCO')).to.equal(true);
            expect(core.isValidTargetOf(M4, A, 'FCO')).to.equal(true);
        });

        it('should check if a given node is a valid child based on the composed rule-set', function () {
            expect(core.isValidChildOf(A, FCO)).to.equal(true);
            expect(core.isValidChildOf(M2, FCO)).to.equal(true);

            expect(core.isValidChildOf(FCO, A)).to.equal(true);
            expect(core.isValidChildOf(M1, A)).to.equal(true);
            expect(core.isValidChildOf(M2, A)).to.equal(true);
            expect(core.isValidChildOf(M3, A)).to.equal(true);
            expect(core.isValidChildOf(M4, A)).to.equal(true);
            expect(core.isValidChildOf(A, A)).to.equal(true);

        });

        it('should check if a value is valid given the first matching attribute rule', function () {
            expect(core.isValidAttributeValueOf(A, 'conflicting', 'string')).to.equal(false);
            expect(core.isValidAttributeValueOf(A, 'conflicting', 1)).to.equal(true);
            expect(core.isValidAttributeValueOf(M4, 'conflicting', 1)).to.equal(false);
            expect(core.isValidAttributeValueOf(M4, 'conflicting', 'string')).to.equal(true);
            expect(core.isValidAttributeValueOf(M4, 'conflicting', 'string')).to.equal(true);
            expect(core.isValidAttributeValueOf(A, 'A', 1)).to.equal(true);
            expect(core.isValidAttributeValueOf(A, 'M1', '1')).to.equal(true);
            expect(core.isValidAttributeValueOf(A, 'M2', '1')).to.equal(true);
            expect(core.isValidAttributeValueOf(A, 'M3', 1)).to.equal(true);
            expect(core.isValidAttributeValueOf(A, 'M4', 1)).to.equal(true);

        });

        it('should check if a node is really a type of the other', function () {
            expect(core.isTypeOf(FCO, FCO)).to.equal(true);
            expect(core.isTypeOf(FCO, A)).to.equal(false);
            expect(core.isTypeOf(FCO, M1)).to.equal(true);
            expect(core.isTypeOf(FCO, M2)).to.equal(false);
            expect(core.isTypeOf(FCO, M3)).to.equal(false);
            expect(core.isTypeOf(FCO, M4)).to.equal(false);

            expect(core.isTypeOf(A, FCO)).to.equal(true);
            expect(core.isTypeOf(A, A)).to.equal(true);
            expect(core.isTypeOf(A, M1)).to.equal(true);
            expect(core.isTypeOf(A, M2)).to.equal(true);
            expect(core.isTypeOf(A, M3)).to.equal(true);
            expect(core.isTypeOf(A, M4)).to.equal(true);

            expect(core.isTypeOf(M1, FCO)).to.equal(true);
            expect(core.isTypeOf(M1, A)).to.equal(false);
            expect(core.isTypeOf(M1, M1)).to.equal(true);
            expect(core.isTypeOf(M1, M2)).to.equal(false);
            expect(core.isTypeOf(M1, M3)).to.equal(false);
            expect(core.isTypeOf(M1, M4)).to.equal(false);

            expect(core.isTypeOf(M2, FCO)).to.equal(true);
            expect(core.isTypeOf(M2, A)).to.equal(false);
            expect(core.isTypeOf(M2, M1)).to.equal(true);
            expect(core.isTypeOf(M2, M2)).to.equal(true);
            expect(core.isTypeOf(M2, M3)).to.equal(true);
            expect(core.isTypeOf(M2, M4)).to.equal(false);

            expect(core.isTypeOf(M3, FCO)).to.equal(true);
            expect(core.isTypeOf(M3, A)).to.equal(false);
            expect(core.isTypeOf(M3, M1)).to.equal(true);
            expect(core.isTypeOf(M3, M2)).to.equal(false);
            expect(core.isTypeOf(M3, M3)).to.equal(true);
            expect(core.isTypeOf(M3, M4)).to.equal(false);

            expect(core.isTypeOf(M4, FCO)).to.equal(true);
            expect(core.isTypeOf(M4, A)).to.equal(false);
            expect(core.isTypeOf(M4, M1)).to.equal(true);
            expect(core.isTypeOf(M4, M2)).to.equal(false);
            expect(core.isTypeOf(M4, M3)).to.equal(false);
            expect(core.isTypeOf(M4, M4)).to.equal(true);

        });

        it('should return all mixin errors directly related to the node', function () {
            var errors = core.getMixinErrors(A);

            expect(errors).to.have.length(5);
            expect(errors[0].message).to.include('attribute');
            expect(errors[0].message).to.include('conflicting');
            expect(errors[0].message).to.include('M2');
            expect(errors[0].message).to.include('M4');

            expect(errors[1].message).to.include('child definition');
            expect(errors[1].message).to.include('M1');
            expect(errors[1].message).to.include('M2');
            expect(errors[1].message).to.include('M4');

            expect(errors[2].message).to.include('pointer');
            expect(errors[2].message).to.include('Ms');
            expect(errors[2].message).to.include('M2');
            expect(errors[2].message).to.include('M4');

            expect(errors[3].message).to.include('set');
            expect(errors[3].message).to.include('sMs');
            expect(errors[3].message).to.include('M2');
            expect(errors[3].message).to.include('M4');

            expect(errors[4].message).to.include('aspect');
            expect(errors[4].message).to.include('conflicting');
            expect(errors[4].message).to.include('M2');
            expect(errors[4].message).to.include('M4');
        });

        it('should notice an error if a mixin is removed from Meta', function () {
            core.delMember(ROOT, 'MetaAspectSet', '/M4');

            expect(core.getMixinErrors(A)[0].message).to.include('missing from the Meta');

            core.addMember(ROOT, 'MetaAspectSet', M4);
        });

        it('should notice about constraint collision among mixins', function () {
            core.setConstraint(M2, 'conflicter', {});
            core.setConstraint(M4, 'conflicter', {});

            expect(core.getMixinErrors(A)[5].message).to.include('conflicter');

            core.delConstraint(M2, 'conflicter');
            core.delConstraint(M4, 'conflicter');
        });

        it('should return the combined meta rules of the node in a json format', function () {
            var jsonMeta,
                constraint = {a: 'anything'};

            core.setConstraint(M4, 'const', constraint);
            jsonMeta = core.getJsonMeta(A);
            expect(jsonMeta).not.to.have.keys(['mixins']);

            expect(jsonMeta.children.items).to.have.members(['/A', '/M2', '/M3', '/M1', '/M4']);
            expect(jsonMeta.attributes).to.have.keys(['name', 'M1', 'A', 'M2', 'M3', 'M4', 'conflicting']);
            expect(jsonMeta.pointers).to.have.keys(['FCO', 'Ms', 'sMs', 'MEs', 'sA', 'A']);
            expect(jsonMeta.constraints).to.have.keys(['const']);
            core.delConstraint(M4, 'const');
        });

        it('should respond if setting something as a mixin is Ok, or not', function () {
            expect(core.canSetAsMixin(A, '/M3').isOk).to.equal(true);
            expect(core.canSetAsMixin(A, '/A').isOk).to.equals(false);
            expect(core.canSetAsMixin(A, '/1').isOk).to.equals(false);

            core.delMember(ROOT, 'MetaAspectSet', '/M4');

            expect(core.canSetAsMixin(A, '/M4').isOk).to.equal(false);

            core.addMember(ROOT, 'MetaAspectSet', M4);
        });

        it('should containment validity should based on the isTypeOf relation', function () {
            var root = core.createNode(),
                base = core.createNode({parent:root,relid:'B'}),
                container = core.createNode({parent:root, base:base, relid:'C'}),
                element = core.createNode({parent:root, base: base, relid:'E'}),
                mixin = core.createNode({parent:root, base: base,relid:'M'}),
                subElement = core.createNode({parent:root, base:element, relid:'S'}),
                mixed = core.createNode({parent:root,base:base, relid:'m'}),
                connection = core.createNode({parent:root,base:base,relid:'c'});

            core.addMember(root, 'MetaAspectSet', base);
            core.addMember(root, 'MetaAspectSet', container);
            core.addMember(root, 'MetaAspectSet', element);
            core.addMember(root, 'MetaAspectSet', mixin);
            core.addMember(root, 'MetaAspectSet', subElement);
            core.addMember(root, 'MetaAspectSet', mixed);
            core.addMember(root, 'MetaAspectSet', connection);

            core.setPointerMetaTarget(connection,'ptr',mixin,0,1);
            core.setChildMeta(container,mixin,0,1);
            core.setChildMeta(container,element,0,10);

            core.addMixin(mixed,core.getPath(mixin));

            expect(core.isValidChildOf(mixed,container)).to.equal(true);
            expect(core.isValidChildOf(mixin,container)).to.equal(true);
            expect(core.isValidChildOf(element,container)).to.equal(true);
            expect(core.isValidChildOf(subElement,container)).to.equal(true);
            expect(core.isValidTargetOf(mixed,connection,'ptr')).to.equal(true);
        });
    });
});
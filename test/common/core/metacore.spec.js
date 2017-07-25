/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('meta core', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        logger = testFixture.logger.fork('metacore.spec'),
        storage,
        projectName = 'coreMetaTesting',
        __should = testFixture.should,
        expect = testFixture.expect,
        projectId = testFixture.projectName2Id(projectName),
        core,
        root,
        base,
        attrNode,
        setNode,
        childNode,
        aspectNode,

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
                base = core.createNode({parent: root});
                core.setAttribute(base, 'name', 'base');

                attrNode = core.createNode({parent: root, base: base});
                core.setAttribute(attrNode, 'name', 'attr');
                core.setAttributeMeta(attrNode, 'boolean', {type: 'boolean'});
                core.setAttributeMeta(attrNode, 'string', {type: 'string'});
                core.setAttributeMeta(attrNode, 'stringReg', {type: 'string', regexp: '^win'});
                core.setAttributeMeta(attrNode, 'stringEnum', {type: 'string', regexp: '^win', enum: ['one', 'two']});
                core.setAttributeMeta(attrNode, 'integer', {type: 'integer'});
                core.setAttributeMeta(attrNode, 'float', {type: 'float'});
                core.setAttributeMeta(attrNode, 'floatMin', {type: 'float', min: 0.1});
                core.setAttributeMeta(attrNode, 'intMax', {type: 'integer', max: 200});
                core.setAttributeMeta(attrNode, 'intRange', {type: 'integer', min: 188, max: 200});
                core.setAttributeMeta(attrNode, 'zeroFloat', {type: 'float', min: 0, max: 0});
                core.setAttributeMeta(attrNode, 'zeroInteger', {type: 'integer', min: 0, max: 0});

                setNode = core.createNode({parent: root, base: base});
                core.setAttribute(setNode, 'name', 'set');
                core.setPointerMetaTarget(setNode, 'set', attrNode, 0, -1);
                core.setPointerMetaTarget(setNode, 'set', setNode, 0, -1);
                core.setPointerMetaLimits(setNode, 'set', 0, 2);

                core.setPointerMetaTarget(setNode, 'ptr', base, 0, 1);
                core.setPointerMetaLimits(setNode, 'ptr', 1, 1);

                childNode = core.createNode({parent: root, base: base});
                core.setAttribute(childNode, 'name', 'child');
                core.setChildMeta(childNode, attrNode);
                core.setChildMeta(childNode, setNode, 0, 1);
                core.setChildMeta(childNode, childNode, -1, -1);
                core.setChildrenMetaLimits(childNode, 0, 10);

                aspectNode = core.createNode({parent: root, base: base});
                core.setAttribute(aspectNode, 'name', 'aspect');
                core.setAspectMetaTarget(aspectNode, 'aspect', base);
            })
            .then(done)
            .catch(done);
    });

    afterEach(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                storage.closeDatabase(done);
            })
            .catch(function (err) {
                logger.error(err);
                storage.closeDatabase(done);
            });
    });

    it('checking types', function () {
        core.isTypeOf(attrNode, base).should.be.true;
        core.isTypeOf(attrNode, setNode).should.be.false;
    });

    it('check instances deprecated should still work', function () {
        core.isInstanceOf(attrNode, 'base').should.be.true;
        core.isInstanceOf(setNode, 'set').should.be.false;
        core.isInstanceOf(base, 'unknown').should.be.false;
    });

    it('check instance of it self should return true', function () {
        core.isInstanceOf(attrNode, attrNode).should.be.true;
    });

    it('check instance of a base should return true', function () {
        core.isInstanceOf(attrNode, base).should.be.true;
    });

    it('check instance when no base relation exists should return false', function () {
        core.isInstanceOf(attrNode, setNode).should.be.false;
    });

    it('check instance when reverse holds should return false', function () {
        core.isInstanceOf(base, attrNode).should.be.false;
    });

    it('checking attribute values', function () {

        core.isValidAttributeValueOf(attrNode, 'boolean', 'true').should.be.false;
        core.isValidAttributeValueOf(attrNode, 'boolean', 1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'boolean', 1.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'boolean', true).should.be.true;

        core.isValidAttributeValueOf(attrNode, 'string', 1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'string', 1.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'string', true).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'string', '1').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'integer', 1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'integer', 1.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'integer', true).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'integer', '1').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'float', 1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'float', 1.1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'float', true).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'float', '1').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'stringReg', 'linux').should.be.false;
        core.isValidAttributeValueOf(attrNode, 'stringReg', 'windows').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'stringEnum', 'windows').should.be.false;
        core.isValidAttributeValueOf(attrNode, 'stringEnum', 'two').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'floatMin', 0.09999).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'floatMin', 0.1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'floatMin', 1000).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'floatMin', -1000).should.be.false;

        core.isValidAttributeValueOf(attrNode, 'intMax', 201).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'intMax', 200).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'intMax', 100).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'intMax', -1000).should.be.true;

        core.isValidAttributeValueOf(attrNode, 'intRange', -1000).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'intRange', 188).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'intRange', 198).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'intRange', 200).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'intRange', 201).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'intRange', 20100).should.be.false;

        core.isValidAttributeValueOf(attrNode, 'zeroFloat', 0.09999).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'zeroFloat', -0.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'zeroFloat', 0.0).should.be.true;

        core.isValidAttributeValueOf(attrNode, 'zeroInteger', 10).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'zeroInteger', -100).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'zeroInteger', 0).should.be.true;
    });

    it('checking attributes', function () {
        core.getValidAttributeNames(attrNode).should.have.members([
            'boolean',
            'float',
            'integer',
            'string',
            'floatMin',
            'intMax',
            'intRange',
            'stringReg',
            'stringEnum',
            'zeroFloat',
            'zeroInteger'
        ]);
        core.getValidAttributeNames(attrNode).should.have.length(11);
        (core.getAttributeMeta(attrNode, 'unknown') === undefined).should.be.true;
        core.getAttributeMeta(attrNode, 'string').should.have.property('type');

        core.delAttributeMeta(attrNode, 'string');
        core.getValidAttributeNames(attrNode).should.not.include.members(['string']);
        core.getValidAttributeNames(attrNode).should.have.length(10);
    });

    it('checking pointers and sets', function () {
        core.getValidSetNames(setNode).should.include.members(['set']);
        core.getValidSetNames(setNode).should.have.length(1);

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

        core.isValidTargetOf(attrNode, setNode, 'set').should.be.true;
        core.isValidTargetOf(setNode, setNode, 'set').should.be.true;

        core.isValidTargetOf(attrNode, setNode, 'ptr').should.be.true;
        core.isValidTargetOf(aspectNode, setNode, 'ptr').should.be.true;
        core.isValidTargetOf(base, setNode, 'ptr').should.be.true;
        core.isValidTargetOf(root, setNode, 'ptr').should.be.false;
    });

    it('removing pointer rules', function () {
        core.getValidSetNames(setNode).should.include.members(['set']);
        core.getValidSetNames(setNode).should.have.length(1);

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

        core.delPointerMetaTarget(setNode, 'set', core.getPath(setNode));

        core.getValidSetNames(setNode).should.include.members(['set']);
        core.getValidSetNames(setNode).should.have.length(1);

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

        core.delPointerMeta(setNode, 'set');

        //TODO check why the removal not visible without persisting
        core.getValidSetNames(setNode).should.be.empty;

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

    });

    it('checking children rules', function () {
        core.getValidChildrenPaths(childNode).should.have.length(3);
        core.getValidChildrenPaths(childNode).should.include.members([core.getPath(childNode),
            core.getPath(attrNode), core.getPath(setNode)]);

        core.isValidChildOf(attrNode, childNode).should.be.true;
        core.isValidChildOf(childNode, childNode).should.be.true;
        core.isValidChildOf(base, childNode).should.be.false;

        core.delChildMeta(childNode, core.getPath(childNode));

        core.getValidChildrenPaths(childNode).should.have.length(2);
        core.getValidChildrenPaths(childNode).should.include.members([core.getPath(setNode), core.getPath(attrNode)]);

    });

    it('checking aspect rules', function () {
        core.getValidAspectNames(aspectNode).should.have.length(1);
        core.getValidAspectNames(aspectNode).should.include.members(['aspect']);

        core.delAspectMetaTarget(aspectNode, 'aspect', core.getPath(base));

        core.getValidAspectNames(aspectNode).should.have.length(1);
        core.getValidAspectNames(aspectNode).should.include.members(['aspect']);

        core.delAspectMeta(aspectNode, 'aspect');

        core.getValidAspectNames(aspectNode).should.be.empty;
    });

    it('checks MetaSheet based type query', function () {
        core.addMember(root, 'MetaAspectSet', attrNode);
        core.addMember(root, 'MetaAspectSet', base);

        core.getPath(core.getBaseType(attrNode)).should.be.eql(core.getPath(attrNode));
        core.getPath(core.getBaseType(setNode)).should.be.eql(core.getPath(base));

        (core.getBaseType(root) === null).should.be.true;
    });

    it('checks getChildrenMeta', function () {
        var path,
            childrenMeta = core.getChildrenMeta(childNode);

        expect(childrenMeta.max).to.equal(10);
        expect(childrenMeta.min).to.equal(undefined);

        delete childrenMeta.min;
        delete childrenMeta.max;

        for (path in childrenMeta) {
            expect(typeof childrenMeta[path].min).to.equal('number');
            expect(typeof childrenMeta[path].max).to.equal('number');
        }
    });

    it('checks getPointerMeta for pointer', function () {
        var path,
            pointerMeta = core.getPointerMeta(setNode, 'ptr');

        expect(pointerMeta.max).to.equal(1);
        expect(pointerMeta.min).to.equal(1);

        delete pointerMeta.min;
        delete pointerMeta.max;

        for (path in pointerMeta) {
            expect(typeof pointerMeta[path].min).to.equal('number');
            expect(typeof pointerMeta[path].max).to.equal('number');
        }
    });

    it('checks getPointerMeta for set', function () {
        var path,
            pointerMeta = core.getPointerMeta(setNode, 'set');

        expect(pointerMeta.max).to.equal(2);
        expect(pointerMeta.min).to.equal(-1);

        delete pointerMeta.min;
        delete pointerMeta.max;

        for (path in pointerMeta) {
            expect(typeof pointerMeta[path].min).to.equal('number');
            expect(typeof pointerMeta[path].max).to.equal('number');
        }
    });

    it('returns the owner of the attribute definition', function () {
        var defRoot = core.createNode({}),
            defFCO = core.createNode({base: null, parent: defRoot, relid: '1'}),
            defOwner1 = core.createNode({base: defFCO, parent: defRoot, relid: 'O1'}),
            defOwner2 = core.createNode({base: defOwner1, parent: defRoot, relid: 'O2'}),
            defInst1 = core.createNode({base: defOwner1, parent: defRoot, relid: 'I1'}),
            defInst2 = core.createNode({base: defOwner2, parent: defRoot, relid: 'I2'});

        core.setAttributeMeta(defFCO, 'name', {type: 'string'});
        core.setAttributeMeta(defOwner1, 'attribute', {type: 'string'});
        core.setAttributeMeta(defOwner1, 'altOne', {type: 'string'});
        core.setAttributeMeta(defOwner2, 'attribute', {type: 'string'});
        core.setAttributeMeta(defOwner2, 'altTwo', {type: 'string'});

        expect(core.getAttributeDefinitionOwner(defInst2, 'attribute')).to.equal(defOwner2);
        expect(core.getAttributeDefinitionOwner(defInst2, 'altOne')).to.equal(defOwner1);
        expect(core.getAttributeDefinitionOwner(defInst2, 'altTwo')).to.equal(defOwner2);
        expect(core.getAttributeDefinitionOwner(defInst1, 'attribute')).to.equal(defOwner1);
        expect(core.getAttributeDefinitionOwner(defOwner2, 'attribute')).to.equal(defOwner2);
        expect(core.getAttributeDefinitionOwner(defOwner1, 'attribute')).to.equal(defOwner1);
        expect(core.getAttributeDefinitionOwner(defInst1, 'name')).to.equal(defFCO);
        expect(core.getAttributeDefinitionOwner(defInst2, 'name')).to.equal(defFCO);

    });

    it('returns the owner of the aspect definition', function () {
        var defRoot = core.createNode({}),
            defFCO = core.createNode({base: null, parent: defRoot, relid: '1'}),
            defOwner1 = core.createNode({base: defFCO, parent: defRoot, relid: 'O1'}),
            defOwner2 = core.createNode({base: defOwner1, parent: defRoot, relid: 'O2'}),
            defInst1 = core.createNode({base: defOwner1, parent: defRoot, relid: 'I1'}),
            defInst2 = core.createNode({base: defOwner2, parent: defRoot, relid: 'I2'});

        core.setAttributeMeta(defFCO, 'name', {type: 'string'});
        core.setAspectMetaTarget(defOwner1, 'aspect', defFCO);
        core.setAspectMetaTarget(defOwner1, 'a1', defFCO);
        core.setAspectMetaTarget(defOwner2, 'aspect', defFCO);
        core.setAspectMetaTarget(defOwner2, 'a2', defFCO);

        expect(core.getAspectDefinitionOwner(defInst2, 'aspect')).to.equal(defOwner2);
        expect(core.getAspectDefinitionOwner(defInst2, 'a1')).to.equal(defOwner1);
        expect(core.getAspectDefinitionOwner(defInst2, 'a2')).to.equal(defOwner2);
        expect(core.getAspectDefinitionOwner(defInst1, 'aspect')).to.equal(defOwner1);
        expect(core.getAspectDefinitionOwner(defInst1, 'a1')).to.equal(defOwner1);
        expect(core.getAspectDefinitionOwner(defOwner2, 'aspect')).to.equal(defOwner2);
        expect(core.getAspectDefinitionOwner(defOwner1, 'aspect')).to.equal(defOwner1);

    });

    it('returns the info about the pointer definition', function () {
        var defRoot = core.createNode({}),
            defFCO = core.createNode({base: null, parent: defRoot, relid: '1'}),
            defTarget1 = core.createNode({base: defFCO, parent: defRoot, relid: 'T1'}),
            defTarget2 = core.createNode({base: defFCO, parent: defRoot, relid: 'T2'}),
            defOwner1 = core.createNode({base: defFCO, parent: defRoot, relid: 'O1'}),
            defOwner2 = core.createNode({base: defOwner1, parent: defRoot, relid: 'O2'}),
            defInst1 = core.createNode({base: defOwner1, parent: defRoot, relid: 'I1'}),
            defInst2 = core.createNode({base: defOwner2, parent: defRoot, relid: 'I2'}),
            defInstT1 = core.createNode({base: defTarget1, parent: defRoot, relid: 'IT1'}),
            defInstT2 = core.createNode({base: defTarget2, parent: defRoot, relid: 'IT2'});

        core.setAttributeMeta(defFCO, 'name', {type: 'string'});
        core.setPointerMetaTarget(defOwner1, 'ptr', defFCO);
        core.setPointerMetaLimits(defOwner1, 'ptr', 0, 1);
        core.setPointerMetaTarget(defOwner2, 'ptr', defTarget2);
        core.setPointerMetaLimits(defOwner2, 'ptr', 0, 1);
        core.setPointerMetaTarget(defOwner1, 'pA', defTarget1);
        core.setPointerMetaLimits(defOwner1, 'pA', 0, 1);
        core.setPointerMetaTarget(defOwner2, 'pA', defTarget2);
        core.setPointerMetaLimits(defOwner2, 'pA', 0, 1);

        expect(core.getPointerDefinitionInfo(defInst2, 'ptr', defFCO)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defFCO,
            targetPath: '/1'
        });

        expect(core.getPointerDefinitionInfo(defInst2, 'ptr', defInstT2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getPointerDefinitionInfo(defInst2, 'pA', defInstT2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getPointerDefinitionInfo(defInst2, 'pA', defInstT1)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defTarget1,
            targetPath: '/T1'
        });
    });

    it('returns the info about the set definition', function () {
        var defRoot = core.createNode({}),
            defFCO = core.createNode({base: null, parent: defRoot, relid: '1'}),
            defTarget1 = core.createNode({base: defFCO, parent: defRoot, relid: 'T1'}),
            defTarget2 = core.createNode({base: defFCO, parent: defRoot, relid: 'T2'}),
            defOwner1 = core.createNode({base: defFCO, parent: defRoot, relid: 'O1'}),
            defOwner2 = core.createNode({base: defOwner1, parent: defRoot, relid: 'O2'}),
            defInst1 = core.createNode({base: defOwner1, parent: defRoot, relid: 'I1'}),
            defInst2 = core.createNode({base: defOwner2, parent: defRoot, relid: 'I2'}),
            defInstT1 = core.createNode({base: defTarget1, parent: defRoot, relid: 'IT1'}),
            defInstT2 = core.createNode({base: defTarget2, parent: defRoot, relid: 'IT2'});

        core.setAttributeMeta(defFCO, 'name', {type: 'string'});
        core.setPointerMetaTarget(defOwner1, 'ptr', defFCO);
        core.setPointerMetaTarget(defOwner2, 'ptr', defTarget2);
        core.setPointerMetaTarget(defOwner1, 'pA', defTarget1);
        core.setPointerMetaTarget(defOwner2, 'pA', defTarget2);

        expect(core.getSetDefinitionInfo(defInst2, 'ptr', defFCO)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defFCO,
            targetPath: '/1'
        });

        expect(core.getSetDefinitionInfo(defInst2, 'ptr', defInstT2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getSetDefinitionInfo(defInst2, 'pA', defInstT2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getSetDefinitionInfo(defInst2, 'pA', defInstT1)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defTarget1,
            targetPath: '/T1'
        });
    });

    it('returns the info about containment relationship', function () {
        var defRoot = core.createNode({}),
            defFCO = core.createNode({base: null, parent: defRoot, relid: '1'}),
            defTarget1 = core.createNode({base: defFCO, parent: defRoot, relid: 'T1'}),
            defTarget2 = core.createNode({base: defFCO, parent: defRoot, relid: 'T2'}),
            defOwner1 = core.createNode({base: defFCO, parent: defRoot, relid: 'O1'}),
            defOwner2 = core.createNode({base: defOwner1, parent: defRoot, relid: 'O2'}),
            defInst1 = core.createNode({base: defOwner1, parent: defRoot, relid: 'I1'}),
            defInst2 = core.createNode({base: defOwner2, parent: defRoot, relid: 'I2'});

        core.setChildMeta(defOwner1, defTarget1);
        core.setChildMeta(defOwner2, defTarget2);

        expect(core.getChildDefinitionInfo(defInst2, defTarget2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getChildDefinitionInfo(defInst2, defTarget1)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defTarget1,
            targetPath: '/T1'
        });
    });

    it('returns the info about the aspect definition', function () {
        var defRoot = core.createNode({}),
            defFCO = core.createNode({base: null, parent: defRoot, relid: '1'}),
            defTarget1 = core.createNode({base: defFCO, parent: defRoot, relid: 'T1'}),
            defTarget2 = core.createNode({base: defFCO, parent: defRoot, relid: 'T2'}),
            defOwner1 = core.createNode({base: defFCO, parent: defRoot, relid: 'O1'}),
            defOwner2 = core.createNode({base: defOwner1, parent: defRoot, relid: 'O2'}),
            defInst1 = core.createNode({base: defOwner1, parent: defRoot, relid: 'I1'}),
            defInst2 = core.createNode({base: defOwner2, parent: defRoot, relid: 'I2'}),
            defInstT1 = core.createNode({base: defTarget1, parent: defRoot, relid: 'IT1'}),
            defInstT2 = core.createNode({base: defTarget2, parent: defRoot, relid: 'IT2'});

        core.setAttributeMeta(defFCO, 'name', {type: 'string'});
        core.setAspectMetaTarget(defOwner1, 'ptr', defFCO);
        core.setAspectMetaTarget(defOwner2, 'ptr', defTarget2);
        core.setAspectMetaTarget(defOwner1, 'pA', defTarget1);
        core.setAspectMetaTarget(defOwner2, 'pA', defTarget2);

        expect(core.getAspectDefinitionInfo(defInst2, 'ptr', defFCO)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defFCO,
            targetPath: '/1'
        });

        expect(core.getAspectDefinitionInfo(defInst2, 'ptr', defInstT2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getAspectDefinitionInfo(defInst2, 'pA', defInstT2)).to.eql({
            sourceNode: defOwner2,
            sourcePath: '/O2',
            targetNode: defTarget2,
            targetPath: '/T2'
        });

        expect(core.getAspectDefinitionInfo(defInst2, 'pA', defInstT1)).to.eql({
            sourceNode: defOwner1,
            sourcePath: '/O1',
            targetNode: defTarget1,
            targetPath: '/T1'
        });
    });

    it('should move the target of a pointer/set definition', function () {
        var defRoot = core.createNode({}),
            defOwner = core.createNode({parent: defRoot, relid: 'O'}),
            defTarget = core.createNode({parent: defRoot, relid: 'T'});

        core.setPointerMetaTarget(defOwner, 'old', defTarget, 9, 10);
        core.setPointerMetaLimits(defOwner, 'old', 8, 11);
        expect(core.getValidPointerNames(defOwner)).to.eql([]);
        expect(core.getValidSetNames(defOwner)).to.eql(['old']);
        expect(core.isValidTargetOf(defTarget, defOwner, 'old')).to.eql(true);
        expect(core.isValidTargetOf(defTarget, defOwner, 'new')).to.eql(false);

        core.movePointerMetaTarget(defOwner, defTarget, 'old', 'new');
        expect(core.getValidPointerNames(defOwner)).to.eql([]);
        expect(core.getValidSetNames(defOwner)).to.eql(['new']);
        expect(core.isValidTargetOf(defTarget, defOwner, 'old')).to.eql(false);
        expect(core.isValidTargetOf(defTarget, defOwner, 'new')).to.eql(true);
        expect(core.getPointerMeta(defOwner, 'new')).to.include({min: 8, max: 11});
    });

    it.only('should move the target of an aspect definition', function () {
        var defRoot = core.createNode({}),
            defOwner = core.createNode({parent: defRoot, relid: 'O'}),
            defTarget = core.createNode({parent: defRoot, relid: 'T'});

        core.setAspectMetaTarget(defOwner, 'old', defTarget);
        expect(core.getValidAspectNames(defOwner)).to.eql(['old']);
        expect(core.isValidAspectMemberOf(defTarget, defOwner, 'old')).to.eql(true);
        expect(core.isValidAspectMemberOf(defTarget, defOwner, 'new')).to.eql(false);

        core.moveAspectMetaTarget(defOwner, defTarget, 'old', 'new');
        expect(core.getValidAspectNames(defOwner)).to.eql(['new']);
        expect(core.isValidAspectMemberOf(defTarget, defOwner, 'old')).to.eql(false);
        expect(core.isValidAspectMemberOf(defTarget, defOwner, 'new')).to.eql(true);
    });
});
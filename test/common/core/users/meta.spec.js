/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../../_globals.js');

describe('meta', function () {
    'use strict';

    var projectName = 'metaUserTest',
        projectId = testFixture.projectName2Id(projectName),
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('meta.spec'),
        expect = testFixture.expect,
        Meta = testFixture.requirejs('common/core/users/meta'),
        storage,
        meta,
        context,
        gmeAuth,
        fileMeta,
        saveFunction = function () {
        },
        nodes;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: projectId});
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/common/core/users/meta/project.json'
                });
            })
            .then(function (result) {
                context = result;
                return Q.nfcall(context.core.loadByPath, context.rootNode, '/1');
            })
            .then(function (fco) {
                meta = new Meta();
                nodes = {'/1': fco};
                meta.initialize(context.core, nodes, saveFunction);

                fileMeta = JSON.parse(testFixture.fs.readFileSync('./test/common/core/users/meta/meta.json', 'utf8'));
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                return Q.allDone([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .nodeify(done);
    });

    it('should have the same meta as the json file', function () {
        expect(meta.getMeta('/1')).to.deep.equal(fileMeta);
    });

    it('should set the meta rules from a file format', function (done) {
        //always set saveFunction first
        var savePhase = 'empty';

        saveFunction = function () {
            if (savePhase === 'empty') {
                savePhase = 'full';

                expect(meta.getValidAttributeNames('/1')).to.deep.equal([]);
                expect(meta.getValidChildrenItems('/1')).to.deep.equal([]);

                meta.setMeta('/1', fileMeta);
            } else if (savePhase === 'full') {
                savePhase = 'done';
                expect(meta.getMeta('/1')).to.deep.equal(fileMeta);
                done();
            } else {
                done(new Error('unexpected save'));
            }
        };
        meta.initialize(context.core, nodes, saveFunction);

        meta.setMeta('/1', {});
    });

    it('should check all getter functions on the full meta', function () {
        expect(meta.isValidChild('/1', '/1')).to.equal(true);
        expect(meta.getChildrenMeta('/1')).to.deep.equal({
            min: 1,
            max: 100,
            items: [{id: '/1', min: undefined, max: 10}]
        });
        expect(meta.getChildrenMetaAttribute('/1')).to.equal(undefined);
        expect(meta.getValidChildrenTypes('/1')).to.deep.equal(['/1']);
        expect(meta.getOwnValidChildrenTypes('/1')).to.deep.equal(['/1']);
        expect(meta.getValidChildrenItems('/1')).to.deep.equal([{id: '/1', min: undefined, max: 10}]);
        expect(meta.isValidAttribute('/1', 'any')).to.equal(true);
        expect(meta.getAttributeSchema('/1', 'number')).to.deep.equal({type: 'integer'});
        expect(meta.getValidAttributeNames('/1')).to.have.members(['number', 'floatNumber', 'name', 'enumText']);
        expect(meta.getOwnValidAttributeNames('/1')).to.have.members(['number', 'floatNumber', 'name', 'enumText']);
        expect(meta.isValidTarget('/1', 'ptr', '/1')).to.equal(true);
        expect(meta.getPointerMeta('/1', 'ptr')).to.deep.equal({
            min: 1,
            max: 1,
            items: [{id: '/1', min: undefined, max: 1}]
        });
        expect(meta.getValidTargetItems('/1', 'ptr')).to.deep.equal([{id: '/1', min: undefined, max: 1}]);
        expect(meta.hasOwnMetaRules('/1')).to.equal(true);
        expect(meta.filterValidTarget('/1', 'ptr', 'nopath')).to.deep.equal([]);
        expect(meta.getMetaAspectNames('/1')).to.deep.equal(['testAspect']);
        expect(meta.getOwnMetaAspectNames('/1')).to.deep.equal(['testAspect']);
        expect(meta.getMetaAspect('/1', 'testAspect')).to.deep.equal({items: ['/1']});
        expect(meta.getAspectTerritoryPattern('/1', 'testAspect')).to.deep.equal({items: ['/1'], children: 1});
    });

    it('should build up the meta with individual function calls', function (done) {
        var savePhase = 'empty';

        saveFunction = function () {
            if (savePhase === 'empty') {
                //nothing to check here
                expect(meta.getMeta('/1')).not.to.deep.equal(fileMeta);
            } else if (savePhase === 'full') {
                savePhase = 'done';

                expect(meta.getMeta('/1')).to.deep.equal(fileMeta);
                done();
            } else {
                done(new Error('unexpected save'));
            }
        };
        meta.initialize(context.core, nodes, saveFunction);

        meta.setMeta('/1', {});
        meta.updateValidChildrenItem('/1', {id: '/1', min: undefined, max: 10});
        meta.setChildrenMetaAttribute('/1', 'max', 100);
        meta.setChildrenMetaAttribute('/1', 'min', 1);
        meta.setAttributeSchema('/1', 'number', {type: 'integer'});
        meta.setAttributeSchema('/1', 'floatNumber', {type: 'float'});
        meta.setAttributeSchema('/1', 'name', {type: 'string'});
        meta.setAttributeSchema('/1', 'enumText', {type: 'string', enum: ['one', 'two', 'three']});
        meta.setPointerMeta('/1', 'ptr', {items: [{id: '/1', min: undefined, max: 1}], min: 1, max: 1});
        savePhase = 'full';
        meta.setMetaAspect('/1', 'testAspect', ['/1']);

    });

    it('should clear out the meta rules with individual function calls', function (done) {
        var savePhase = 'full';

        saveFunction = function () {
            if (savePhase === 'full') {
                //nothing to check here
                expect(meta.getMeta('/1')).not.to.deep.equal(fileMeta);
            } else if (savePhase === 'empty') {
                savePhase = 'done';
                expect(meta.getValidAttributeNames('/1')).to.deep.equal([]);
                expect(meta.getValidChildrenItems('/1')).to.deep.equal([]);
                done();
            } else {
                done(new Error('unexpected save'));
            }
        };
        meta.initialize(context.core, nodes, saveFunction);

        meta.removeValidChildrenItem('/1', '/1');
        meta.removeAttributeSchema('/1', 'number');
        meta.removeAttributeSchema('/1', 'floatNumber');
        meta.removeAttributeSchema('/1', 'name');
        meta.removeAttributeSchema('/1', 'enumText');
        meta.removeValidTargetItem('/1', 'ptr', '/1');
        meta.deleteMetaPointer('/1', 'ptr');
        savePhase = 'empty';
        meta.deleteMetaAspect('/1', 'testAspect');
    });
});
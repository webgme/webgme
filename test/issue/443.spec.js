/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('./../_globals.js');

describe('issue443 testing', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('issue443.spec'),
        storage = null,

        projectName = 'issue443test',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth,
        context;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: projectId});
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: './seeds/ActivePanels.webgmex',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (result) {
                context = result;
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

    it('should be able to modify newly created instance\'s inherited child', function (done) {
        //first we create a model with a child
        var model, modelType, FCO, child, instance;

        Q.nfcall(context.core.loadByPath, context.rootNode, '/1')
            .then(function (node) {
                FCO = node;
                return Q.nfcall(context.core.loadByPath, context.rootNode, '/175547009/1817665259');
            })
            .then(function (node) {
                modelType = node;

                model = context.core.createNode({parent: context.rootNode, base: modelType});
                child = context.core.createNode({parent: model, base: FCO});
                instance = context.core.createNode({parent: context.rootNode, base: model});

                return Q.nfcall(context.core.loadChildren, instance);
            })
            .then(function (children) {
                expect(children).to.have.length[1];
                expect(context.core.getRelid(children[0])).to.equal(context.core.getRelid(child));

                //now we modify the inherited child
                context.core.setAttribute(children[0], 'name', 'newChild');
                done();
            })
            .catch(done);
    });
});

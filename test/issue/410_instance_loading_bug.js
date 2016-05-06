/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('./../_globals.js');

describe('issue410 testing', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('issue410.spec'),
        storage = null,

        projectName = 'issue410test',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth;

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

    it('child of an instance of an instance should have a real base', function (done) {
        var context,
            createBaseModel = function () {
                var deferred = Q.defer();
                Q.nfcall(context.core.loadByPath, context.rootNode, '/-38')
                    .then(function (metaContainer) {
                        expect(metaContainer).not.to.equal(null);
                        return Q.nfcall(context.core.loadChildren, metaContainer);
                    })
                    .then(function (metaNodes) {
                        expect(metaNodes).not.to.equal(null);
                        expect(metaNodes).to.have.length(36);

                        var name, folder, configuration, command, event, i,
                            base, c1, c2;

                        for (i = 0; i < metaNodes.length; i += 1) {
                            name = context.core.getAttribute(metaNodes[i], 'name');
                            if (name === 'Folder') {
                                folder = metaNodes[i];
                            } else if (name === 'Configuration') {
                                configuration = metaNodes[i];
                            } else if (name === 'Event') {
                                event = metaNodes[i];
                            } else if (name === 'Command') {
                                command = metaNodes[i];
                            }
                        }

                        expect(folder).not.to.equal(undefined);
                        expect(configuration).not.to.equal(undefined);
                        expect(event).not.to.equal(undefined);
                        expect(command).not.to.equal(undefined);

                        base = context.core.createNode({parent: context.rootNode, base: folder});
                        context.core.setAttribute(base, 'name', 'base');
                        c1 = context.core.createNode({parent: base, base: configuration});
                        context.core.setAttribute(c1, 'name', 'c1');
                        context.core.createNode({parent: c1, base: event});
                        context.core.createNode({parent: c1, base: command});

                        c2 = context.core.createNode({parent: base, base: configuration});
                        context.core.setAttribute(c2, 'name', 'c2');
                        context.core.createNode({parent: c2, base: event});
                        context.core.createNode({parent: c2, base: command});
                        context.core.createNode({parent: c2, base: c1});

                        deferred.resolve(base);
                    })
                    .catch(deferred.reject);

                return deferred.promise;
            };

        testFixture.importProject(storage,
            {
                projectSeed: './test/issue/410/input.webgmex',
                projectName: projectName,
                gmeConfig: gmeConfig,
                logger: logger
            })
            .then(function (result) {
                context = result;
                return createBaseModel();
            })
            .then(function (base) {
                var instance = context.core.createNode({parent: context.rootNode, base: base});

                return Q.nfcall(context.core.loadChildren, instance);
            })
            .then(function (firstLevel) {
                var i;
                expect(firstLevel).not.to.equal(null);
                expect(firstLevel).to.have.length(2);
                for (i = 0; i < firstLevel.length; i += 1) {
                    if (context.core.getAttribute(firstLevel[i], 'name') === 'c2') {
                        return Q.nfcall(context.core.loadChildren, firstLevel[i]);
                    }
                }
            })
            .then(function (thirdLevel) {
                var i;
                expect(thirdLevel).not.to.equal(null);
                expect(thirdLevel).to.have.length(3);
                for (i = 0; i < thirdLevel.length; i += 1) {
                    if (context.core.getAttribute(thirdLevel[i], 'name') === 'c1') {
                        return Q.nfcall(context.core.loadChildren, thirdLevel[i]);
                    }
                }
            })
            .then(function (finalLevel) {
                expect(finalLevel).not.to.equal(null);
                expect(finalLevel).to.have.length(2);

                expect(context.core.getBase(finalLevel[0])).not.to.equal(null);
                expect(context.core.getBase(finalLevel[1])).not.to.equal(null);
            })
            .nodeify(done);
    });
});
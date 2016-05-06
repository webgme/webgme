/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('./../_globals.js');

describe.skip('issue772 testing', function () {

    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('issue110.spec'),
        storage = null,
        serializer = testFixture.WebGME.serializer,
        Core = testFixture.Core,

        projectName = 'issue772test',
        projectId = testFixture.projectName2Id(projectName),
        core,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);
    });

    beforeEach(function (done) {
        storage.createProject({projectName: projectName})
            .then(function (project) {
                core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger
                });
            })
            .nodeify(done);
    });

    afterEach(function (done) {
        storage.deleteProject({
                projectId: projectId
            })
            .nodeify(done);
    });

    it('should export and import compositeId reference targets', function (done) {
        var root = {
                path: '',
                guid: ''
            },
            template = {
                path: '',
                guid: '',
                port: ''
            },
            instance = {
                path: '',
                guid: ''
            },
            importRootNode;

        //now we build the project from scratch
        var rootNode = core.createNode({}),
            templateNode = core.createNode({parent: rootNode}),
            portNode = core.createNode({parent: templateNode}),
            instanceNode = core.createNode({parent: rootNode, base: templateNode}),
            iPortNode = core.getChild(instanceNode, core.getRelid(portNode));

        root.path = core.getPath(rootNode);
        root.guid = core.getGuid(rootNode);
        template.path = core.getPath(templateNode);
        template.guid = core.getGuid(templateNode);
        template.port = core.getRelid(portNode);
        instance.path = core.getPath(instanceNode);
        instance.guid = core.getGuid(instanceNode);

        //create the reference to point to the instance port
        core.setPointer(rootNode, 'ref', iPortNode);

        //now we can export
        Q.nfcall(serializer.export, core, rootNode)
            .then(function (eJson) {
                expect(eJson.nodes[root.guid].pointers['ref']).to.equal(instance.guid + '@/' + template.port);

                //now import back, and check
                importRootNode = core.createNode({});

                return Q.nfcall(serializer.import, core, importRootNode, eJson);

            })
            .then(function () {
                //everything should be loaded, so we can check them synchronously
                expect(core.getPointerNames(importRootNode)).to.include.members(['ref']);
                expect(core.getPointerPath(importRootNode, 'ref')).to.equal(instance.path + '/' + template.port);
            })
            .nodeify(done);
    });

    it('should export and import deeper compositeId reference targets', function (done) {
        var root = {
                path: '',
                guid: ''
            },
            template = {
                path: '',
                guid: '',
                port: ''
            },
            instance = {
                path: '',
                guid: ''
            },
            importRootNode;

        //now we build the project from scratch
        var rootNode = core.createNode({}),
            templateNode = core.createNode({parent: rootNode}),
            portContainerNode = core.createNode({parent: templateNode}),
            portNode = core.createNode({parent: portContainerNode}),
            instanceNode = core.createNode({parent: rootNode, base: templateNode}),
            iPortNode = core.getChild(
                core.getChild(instanceNode, core.getRelid(portContainerNode)),
                core.getRelid(portNode)
            );

        root.path = core.getPath(rootNode);
        root.guid = core.getGuid(rootNode);
        template.path = core.getPath(templateNode);
        template.guid = core.getGuid(templateNode);
        template.port = core.getRelid(portContainerNode) + '/' + core.getRelid(portNode);
        instance.path = core.getPath(instanceNode);
        instance.guid = core.getGuid(instanceNode);

        //create the reference to point to the instance port
        core.setPointer(rootNode, 'ref', iPortNode);

        //now we can export
        Q.nfcall(serializer.export, core, rootNode)
            .then(function (eJson) {
                expect(eJson.nodes[root.guid].pointers['ref']).to.equal(instance.guid + '@/' + template.port);

                //now import back, and check
                importRootNode = core.createNode({});

                return Q.nfcall(serializer.import, core, importRootNode, eJson);

            })
            .then(function () {
                //everything should be loaded, so we can check them synchronously
                expect(core.getPointerNames(importRootNode)).to.include.members(['ref']);
                expect(core.getPointerPath(importRootNode, 'ref')).to.equal(instance.path + '/' + template.port);
            })
            .nodeify(done);
    });

    it('should export and import deeper instantiated reference targets', function (done) {
        var root = {
                path: '',
                guid: ''
            },
            template = {
                path: '',
                guid: '',
                port: ''
            },
            instance = {
                path: '',
                guid: ''
            },
            importRootNode;

        //now we build the project from scratch
        var rootNode = core.createNode({}),
            portBaseNode = core.createNode({parent: rootNode}),
            templateNode = core.createNode({parent: rootNode}),
            portNode = core.createNode({parent: templateNode, base: portBaseNode}),
            instanceNode = core.createNode({parent: rootNode, base: templateNode}),
            iPortNode = core.getChild(instanceNode, core.getRelid(portNode));

        root.path = core.getPath(rootNode);
        root.guid = core.getGuid(rootNode);
        template.path = core.getPath(templateNode);
        template.guid = core.getGuid(templateNode);
        template.port = core.getRelid(portNode);
        instance.path = core.getPath(instanceNode);
        instance.guid = core.getGuid(instanceNode);

        //create the reference to point to the instance port
        core.setPointer(rootNode, 'ref', iPortNode);

        //now we can export
        Q.nfcall(serializer.export, core, rootNode)
            .then(function (eJson) {
                expect(eJson.nodes[root.guid].pointers['ref']).to.equal(instance.guid + '@/' + template.port);

                //now import back, and check
                importRootNode = core.createNode({});

                return Q.nfcall(serializer.import, core, importRootNode, eJson);

            })
            .then(function () {
                //everything should be loaded, so we can check them synchronously
                expect(core.getPointerNames(importRootNode)).to.include.members(['ref']);
                expect(core.getPointerPath(importRootNode, 'ref')).to.equal(instance.path + '/' + template.port);
            })
            .nodeify(done);
    });

    it('should export and import compositeId set members', function (done) {
        var root = {
                path: '',
                guid: ''
            },
            template = {
                path: '',
                guid: '',
                port: ''
            },
            instance = {
                path: '',
                guid: ''
            },
            importRootNode;

        var rootNode = core.createNode({}),
            templateNode = core.createNode({parent: rootNode}),
            portNode = core.createNode({parent: templateNode}),
            instanceNode = core.createNode({parent: rootNode, base: templateNode}),
            iPortNode = core.getChild(instanceNode, core.getRelid(portNode));

        root.path = core.getPath(rootNode);
        root.guid = core.getGuid(rootNode);
        template.path = core.getPath(templateNode);
        template.guid = core.getGuid(templateNode);
        template.port = core.getRelid(portNode);
        instance.path = core.getPath(instanceNode);
        instance.guid = core.getGuid(instanceNode);

        //adding the port to a set of the master
        core.addMember(rootNode, 'set', iPortNode);

        //now we can export
        Q.nfcall(serializer.export, core, rootNode)
            .then(function (eJson) {
                expect(eJson.nodes[root.guid].sets['set'][0].guid).to.equal(instance.guid + '@/' + template.port);

                //now import back, and check
                importRootNode = core.createNode({});

                return Q.nfcall(serializer.import, core, importRootNode, eJson);

            })
            .then(function () {
                //everything should be loaded, so we can check them synchronously
                expect(core.getSetNames(importRootNode)).to.include.members(['set']);
                expect(core.getMemberPaths(importRootNode, 'set')).to.eql([instance.path + '/' + template.port]);
            })
            .nodeify(done);
    });
});

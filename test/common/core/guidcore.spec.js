/* jshint node:true, mocha: true*/
/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('Core GUID handling', function () {
    'use strict';

    var gmeConfig,
        logger,
        Q,
        expect,
        storage,
        projectName = 'CoreQAsync',
        core,
        rootHash,
        REGEXP = testFixture.requirejs('common/regexp'),

        gmeAuth;

    before(function (done) {
        gmeConfig = testFixture.getGmeConfig();
        logger = testFixture.logger.fork('GuidCore');
        expect = testFixture.expect;
        Q = testFixture.Q;

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'seeds/SignalFlowSystem.webgmex',
                        projectName: projectName,
                        branchName: 'master',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (importResult) {
                core = importResult.core;
                rootHash = importResult.rootHash;
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

    it('should create a proper GUID for a new node', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                //load parent and base
                return Q.allDone([
                    core.loadByPath(rootNode, '/682825457'),
                    core.loadByPath(rootNode, '/-2/-15')
                ]);
            })
            .then(function (nodes) {
                expect(nodes).to.have.length(2);

                var newNode = core.createNode({parent: nodes[0], base: nodes[1]});

                expect(REGEXP.GUID.test(core.getGuid(newNode))).to.equal(true);
            })
            .nodeify(done);
    });

    it('should create a new GUID when the node is copied, ' +
        'but the data portion of GUID should be the same', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadByPath(rootNode, '/1036661779');
            })
            .then(function (node) {
                var newNode = core.copyNode(node, core.getParent(node));

                expect(core.getRelid(newNode)).not.to.equal(core.getRelid(node));
                expect(core.getGuid(newNode)).not.to.equal(core.getGuid(node));
                expect(REGEXP.GUID.test(core.getGuid(newNode))).to.equal(true);
            })
            .nodeify(done);
    });

    it('should keep the GUID when the node is moved around', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return Q.allDone([
                    core.loadByPath(rootNode, '/682825457'),
                    core.loadByPath(rootNode, '/1036661779')
                ])
            })
            .then(function (nodes) {
                expect(nodes).to.have.length(2);
                var originalGuid = core.getGuid(nodes[1]),
                    newPlacedNode = core.moveNode(nodes[1], nodes[0]);

                expect(originalGuid).to.equal(core.getGuid(newPlacedNode));
            })
            .nodeify(done);
    });

    it('should keep the children\'s GUID intact when the GUID of the container changes', function (done) {
        var container,
            oldGuids = {},
            i;

        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadByPath(rootNode, '/1036661779');
            })
            .then(function (node) {
                container = node;
                return core.loadChildren(node);
            })
            .then(function (children) {
                expect(children).to.have.length(8);

                for (i = 0; i < children.length; i += 1) {
                    oldGuids[core.getPath(children[i])] = core.getGuid(children[i]);
                }

                return core.setGuid(container, '12345678-1234-1234-1234-123456789012')
            })
            .then(function () {
                expect(core.getGuid(container)).to.equal('12345678-1234-1234-1234-123456789012');

                return core.loadChildren(container);
            })
            .then(function (children) {
                expect(children).to.have.length(8);

                for (i = 0; i < children.length; i += 1) {
                    expect(oldGuids[core.getPath(children[i])]).to.equal(core.getGuid(children[i]));
                }
            })
            .nodeify(done);
    });

    it('should have new GUIDs for the whole sub-tree after copy', function (done) {
        var guids = [],
            guid,
            numOfNodes,
            container,
            i;
        core.loadRoot(rootHash)
            .then(function(rootNode){
                return core.loadByPath(rootNode,'/682825457');
            })
            .then(function(node){
                container = node;

                return core.loadSubTree(container);
            })
            .then(function(nodes){
                numOfNodes = nodes.length;
                for(i=0;i<nodes.length;i+=1){
                    guid = core.getGuid(nodes[i]);
                    expect(guids.indexOf(guid)).to.equal(-1);
                    guids.push(guid);
                }

                //now copy the whole FMreceiver node
                var newContainer = core.copyNode(container,core.getParent(container));

                return core.loadSubTree(newContainer);
            })
            .then(function(nodes){
                expect(nodes).to.have.length(numOfNodes);

                for(i=0;i<nodes.length;i+=1){
                    guid = core.getGuid(nodes[i]);
                    expect(guids.indexOf(guid)).to.equal(-1);
                    guids.push(guid);
                }
            })
            .nodeify(done);
    });

});
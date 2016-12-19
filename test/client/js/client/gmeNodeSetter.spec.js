/* jshint node:true, mocha: true*/
/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../../_globals.js');

describe('gmeNodeSetter', function () {
    'use strict';

    var gmeConfig,
        logger,
        Q,
        expect,
        NodeSetter,
        setNode,
        storage,
        projectName = 'gmeNodeSetterTests',
        context,
        basicState,
        oldWarn = console.warn,
        lastWarning,
        lastCoreError,
        saveCalled = false,
        gmeAuth;

    before(function (done) {
        oldWarn = console.warn;
        console.warn = function (message) {
            lastWarning = message;
        };
        gmeConfig = testFixture.getGmeConfig();
        logger = testFixture.logger.fork('gmeNodeSetter');
        expect = testFixture.expect;
        Q = testFixture.Q;
        NodeSetter = testFixture.requirejs('js/client/gmeNodeSetter');

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'seeds/ActivePanels.webgmex',
                        projectName: projectName,
                        branchName: 'master',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (importResult) {
                var metaNodes = importResult.core.getAllMetaNodes(importResult.rootNode),
                    path;

                context = importResult;

                basicState = {
                    core: context.core,
                    nodes: {
                        '': {node: context.rootNode}
                    }
                };
                for (path in metaNodes) {
                    basicState.nodes[path] = {node: metaNodes[path]};
                }

                return context.core.loadByPath(context.rootNode, '/1303043463/2119137141');
            })
            .then(function (node) {
                basicState.nodes['/1303043463/2119137141'] = {node: node};

                return context.core.loadByPath(context.rootNode, '/1303043463');
            })
            .then(function (node) {
                basicState.nodes['/1303043463'] = {node: node};

                return context.core.loadByPath(context.rootNode, '/1303043463/1044885565');
            })
            .then(function (node) {
                basicState.nodes['/1303043463/1044885565'] = {node: node};

                setNode = new NodeSetter(
                    logger,
                    basicState,
                    function () {
                        saveCalled = true;
                    },
                    function (node) {
                        var path = context.core.getPath(node);
                        basicState.nodes[path] = {node: node};
                        return path;
                    },
                    function (error) {
                        lastCoreError = error;
                    });
            })
            .nodeify(done);
    });

    beforeEach(function () {
        lastWarning = null;
        lastCoreError = null;
        saveCalled = false;
    });

    after(function (done) {
        console.warn = oldWarn;
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    //TODO add library related error handling cases

    it('should manipulate the attribute of the node', function () {

        setNode.setAttribute('/1', 'testing', 'one');
        expect(context.core.getAttribute(basicState.nodes['/1'].node, 'testing')).to.equal('one');
        setNode.setAttributes('/1', 'moretesting', 'two');
        expect(context.core.getAttribute(basicState.nodes['/1'].node, 'moretesting')).to.equal('two');
        expect(lastWarning).to.contains('setAttribute');

        setNode.delAttribute('/1', 'testing');
        expect(context.core.getAttribute(basicState.nodes['/1'].node, 'testing')).to.eql(undefined);
        setNode.delAttributes('/1', 'moretesting');
        expect(context.core.getAttribute(basicState.nodes['/1'].node, 'moretesting')).to.eql(undefined);
        expect(lastWarning).to.contains('delAttribute');
    });

    it('should manipulate the registry of the node', function () {
        setNode.setRegistry('/1', 'testing', 'one');
        expect(context.core.getRegistry(basicState.nodes['/1'].node, 'testing')).to.equal('one');
        setNode.delRegistry('/1', 'testing');
        expect(context.core.getRegistry(basicState.nodes['/1'].node, 'testing')).to.eql(undefined);
    });

    it('should copy a node', function () {
        var newPath = setNode.copyNode('/1', '', {
            attributes: {
                name: 'copyFCO'
            },
            registry: {
                testing: 'one'
            }
        }, 'copying a node');
        expect(typeof newPath).to.eql('string');
        expect(context.core.getAttribute(basicState.nodes[newPath].node, 'name')).to.eql('copyFCO');
        expect(context.core.getRegistry(basicState.nodes[newPath].node, 'testing')).to.eql('one');
    });

    it('should copy more node at once', function () {
        var parameters = {
            parentId: ''
        };

        parameters['/1303043463/2119137141'] = {
            attributes: {
                name: 'copy1'
            }
        };
        parameters['/1303043463/1044885565'] = {
            attributes: {
                name: 'copy2'
            }
        };

        expect(basicState.nodes['/2119137141']).to.eql(undefined);
        expect(basicState.nodes['/1044885565']).to.eql(undefined);
        setNode.copyMoreNodes(parameters);
        expect(basicState.nodes['/2119137141']).not.to.eql(undefined);
        expect(basicState.nodes['/1044885565']).not.to.eql(undefined);
    });

    it('should move a node', function () {
        var newId = setNode.createNode({
            parentId: '',
            baseId: '/1'
        }), newPath;
        expect(basicState.nodes['/1303043463' + newId]).to.eql(undefined);
        newPath = setNode.moveNode(newId, '/1303043463');
        expect(newPath).to.eql('/1303043463' + newId);
        expect(basicState.nodes[newPath]).not.to.eql(undefined);
        setNode.moveNode('/1303043463' + newId, '', 'moving back');
        setNode.deleteNode(newId);
    });

    it('should move more nodes at once', function () {
        var parameters = {
            parentId: '/1303043463/2119137141'

        };
        parameters['/1303043463/1044885565'] = {
            attributes: {
                name: 'move1'
            }
        };

        expect(basicState.nodes['/1303043463/2119137141/1044885565']).to.eql(undefined);
        setNode.moveMoreNodes(parameters);
        expect(basicState.nodes['/1303043463/2119137141/1044885565']).not.to.eql(undefined);
        expect(context.core.getAttribute(basicState.nodes['/1303043463/2119137141/1044885565'].node, 'name'))
            .to.eql('move1');
        parameters = {
            parentId: '/1303043463'
        };
        parameters['/1303043463/2119137141/1044885565'] = {
            attributes: {
                name: 'moveBack'
            }
        };
        setNode.moveMoreNodes(parameters, 'moving back');
        expect(context.core.getAttribute(basicState.nodes['/1303043463/1044885565'].node, 'name'))
            .to.eql('moveBack');
    });

    // TODO - is this even meaningful??? - we should probably change the parameter for allowing multiple
    // TODO instance of the same type
    it('should be able to create multiple children for the same parent', function () {
        var parameters = {
            parentId: '/1303043463/2119137141'
        };
        parameters['/1'] = {
            attributes: {
                name: 'newFCO'
            }
        };
        parameters['/1303043463/1044885565'] = {
            attributes: {
                name: 'newChild'
            }
        };

        //we set a  pointer beforehand so the created children will map that
        context.core.setPointer(basicState.nodes['/1303043463/1044885565']
            .node, 'myRef', basicState.nodes['/1'].node);
        expect(context.core.getChildrenPaths(basicState.nodes['/1303043463/2119137141'].node)).to.eql([]);
        setNode.createChildren(parameters, 'newChildren have been created');
        expect(context.core.getChildrenPaths(basicState.nodes['/1303043463/2119137141'].node)).to.have.length(2);
        //now we remove the technical pointer
        context.core.delPointer(basicState.nodes['/1303043463/1044885565'].node, 'myRef');

    });

    it('should be able to create a node', function () {
        var oldNumOfChildren = context.core.getChildrenPaths(context.rootNode).length,
            newId;

        newId = setNode.createNode({
            parentId: '',
            baseId: '/1'
        }, {
            attributes: {
                name: 'newNode'
            }
        }, 'creating new node');
        expect(typeof newId).to.eql('string');
        expect(context.core.getChildrenPaths(context.rootNode)).to.have.length(oldNumOfChildren + 1);
        expect(context.core.getChildrenPaths(context.rootNode).indexOf(newId)).not.to.eql(-1);
        expect(context.core.getAttribute(basicState.nodes[newId].node, 'name')).to.eql('newNode');
    });

    it('should remove a node', function () {
        var newId = setNode.createNode({
            parentId: '',
            baseId: '/1'
        }, {
            attributes: {
                name: 'toDelete'
            }
        }, 'creating new node to delete');

        expect(typeof newId).to.eql('string');
        expect(basicState.nodes[newId]).not.to.eql(undefined);
        setNode.deleteNode(newId, 'remove a node');
        expect(basicState.nodes[newId]).not.to.eql(undefined); //not removed from cache
    });

    it('should remove multiple nodes', function () {
        var newId1 = setNode.createNode({
                parentId: '',
                baseId: '/1'
            }, {}, 'creating new node to delete'),
            newId2 = setNode.createNode({
                parentId: '',
                baseId: '/1'
            }, {}, 'creating new node to delete');

        expect(typeof newId1).to.eql('string');
        expect(typeof newId2).to.eql('string');
        expect(basicState.nodes[newId1]).not.to.eql(undefined);
        expect(basicState.nodes[newId2]).not.to.eql(undefined);
        setNode.deleteNodes([newId1, newId2], 'remove a node');
        expect(basicState.nodes[newId1]).not.to.eql(undefined); //not removed from cache
        expect(basicState.nodes[newId2]).not.to.eql(undefined); //not removed from cache
    });

    //TODO should we check for the nodes properly??
    it('should manipulate pointers of the node', function () {
        var newId = setNode.createNode({
            parentId: '',
            baseId: '/1'
        }, {}, 'creating new node to delete');

        setNode.setPointer(newId, 'onePtr', null);
        expect(context.core.getPointerPath(basicState.nodes[newId].node, 'onePtr')).to.eql(null);
        setNode.setPointer(newId, 'onePtr', '/1');
        expect(context.core.getPointerPath(basicState.nodes[newId].node, 'onePtr')).to.eql('/1');
        setNode.delPointer(newId, 'onePtr');
        expect(context.core.getPointerPath(basicState.nodes[newId].node, 'onePtr')).to.eql(undefined);
        setNode.deleteNode(newId);
    });

    it('should create and remove a set', function () {
        expect(saveCalled).to.eql(false);
        setNode.createSet('/unknown', 'anySet');
        expect(saveCalled).to.eql(false);
        expect(context.core.getSetNames(context.rootNode)).not.to.include.members(['mySet']);
        setNode.createSet('', 'mySet');
        expect(context.core.getSetNames(context.rootNode)).to.include.members(['mySet']);
        expect(saveCalled).to.eql(true);
        setNode.deleteSet('', 'mySet');
        expect(context.core.getSetNames(context.rootNode)).not.to.include.members(['mySet']);

        saveCalled = false;
        setNode.deleteSet('/unkown', 'any');
        expect(saveCalled).to.eql(false);
    });

    it('should manipulate member-data', function () {
        // Calls for not loaded nodes should be ignored.
        expect(saveCalled).to.eql(false);
        setNode.addMember('', '/unknown', 'mySet');
        setNode.addMember('/unknown', '', 'mySet');
        setNode.removeMember('/unknown', '', 'mySet');
        setNode.setMemberAttribute('/unkown', '/unknown', 'mySet', 'name', 'anything');
        setNode.delMemberAttribute('/unknown', '/unknown', 'mySet', 'name');
        setNode.setMemberRegistry('/unknown', '/unknown', 'mySet', 'name', 'anything');
        setNode.delMemberRegistry('/unknown', '/unknown', 'mySet', 'name');
        expect(saveCalled).to.eql(false);

        setNode.createSet('', 'mySet');
        setNode.addMember('', '/1', 'mySet');
        expect(context.core.getMemberPaths(context.rootNode, 'mySet')).to.have.members(['/1']);
        setNode.setMemberAttribute('', '/1', 'mySet', 'name', 'inSet');
        expect(context.core.getMemberAttribute(context.rootNode, 'mySet', '/1', 'name')).to.eql('inSet');
        setNode.setMemberRegistry('', '/1', 'mySet', 'name', 'inSetR');
        expect(context.core.getMemberRegistry(context.rootNode, 'mySet', '/1', 'name')).to.eql('inSetR');
        setNode.delMemberAttribute('', '/1', 'mySet', 'name');
        expect(context.core.getMemberAttribute(context.rootNode, 'mySet', '/1', 'name')).to.eql(undefined);
        setNode.delMemberRegistry('', '/1', 'mySet', 'name');
        expect(context.core.getMemberRegistry(context.rootNode, 'mySet', '/1', 'name')).to.eql(undefined);
        setNode.removeMember('', '/1', 'mySet');
        expect(context.core.getMemberPaths(context.rootNode, 'mySet')).to.have.length(0);

        setNode.deleteSet('', 'mySet');
    });

    it('should manipulate set-data', function () {
        // Calls for not loaded nodes should be ignored
        expect(saveCalled).to.eql(false);
        setNode.setSetAttribute('/unkown', 'any', 'any', 'any');
        setNode.setSetRegistry('/unkown', 'any', 'any', 'any');
        setNode.delSetAttribute('/unkown', 'any', 'any', 'any');
        setNode.delSetRegistry('/unkown', 'any', 'any', 'any');
        expect(saveCalled).to.eql(false);

        setNode.createSet('', 'mySet');

        setNode.setSetAttribute('', 'mySet', 'test', 'attr');
        expect(context.core.getSetAttribute(context.rootNode, 'mySet', 'test')).to.eql('attr');
        setNode.setSetRegistry('', 'mySet', 'test', 'reg');
        expect(context.core.getSetRegistry(context.rootNode, 'mySet', 'test')).to.eql('reg');
        setNode.delSetAttribute('', 'mySet', 'test');
        expect(context.core.getSetAttribute(context.rootNode, 'mySet', 'test')).to.eql(undefined);
        setNode.delSetRegistry('', 'mySet', 'test');
        expect(context.core.getSetRegistry(context.rootNode, 'mySet', 'test')).to.eql(undefined);

        setNode.deleteSet('', 'mySet');
    });

    //TODO shouldn't we replace some of CORE's ASSERT with error? like isValidNewBase...
    it('should manipulate the base of the node', function () {
        // Calls for not loaded nodes should be ignored
        expect(saveCalled).to.eql(false);
        setNode.setBase('', '/unknown');
        setNode.setBase('/unknown', '');
        setNode.delBase('/unknown');
        expect(saveCalled).to.eql(false);

        var newId = setNode.createNode({
            parentId: '',
            baseId: '/1303043463/2119137141'
        });
        setNode.setBase(newId, '/1');
        expect(context.core.getPath(context.core.getBase(basicState.nodes[newId].node))).to.eql('/1');
        setNode.delBase(newId);
        expect(context.core.getBase(basicState.nodes[newId].node)).to.eql(null);
    });

});
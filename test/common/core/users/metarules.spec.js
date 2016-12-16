/*globals requireJS*/
/* jshint node:true, mocha: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals');

describe('Meta Rules', function () {
    'use strict';

    var logger = testFixture.logger.fork('MetaRules'),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        checkNode = requireJS('common/core/users/metarules').checkNode,
        checkMetaConsistency = requireJS('common/core/users/metarules').checkMetaConsistency,
        projectName = 'MetaRules',
        branchName = 'master',
        languagePath = '/822429792/',
        ir,
        metaMetaIr,

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: './test/common/core/users/meta/metaRules.webgmex',
                    projectName: projectName,
                    branchName: branchName,
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                ir = importResult;

                var importParam = {
                    projectSeed: './seeds/EmptyProject.webgmex',
                    projectName: 'MetaConsistencyCheck',
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                metaMetaIr = importResult;
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

    it('RootNode should pass (without any checks)', function (done) {
        var nodePath = '';

        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    describe('Language Nodes', function () {
        it('FCO should pass', function (done) {
            var nodePath = '/1';

            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('SetElement should pass', function (done) {
            var nodePath = languagePath + '1578427941';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('ModelElement should pass', function (done) {
            var nodePath = languagePath + '942380411';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('ConnectionElement should pass', function (done) {
            var nodePath = languagePath + '1686535233';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('ModelRef should pass', function (done) {
            var nodePath = languagePath + '474747191';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('PortElement should pass', function (done) {
            var nodePath = languagePath + '474747191';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });
    });

    describe('Direct Language-instances', function () {
        // Direct instances of META nodes.
        it('SetElementInstance should pass', function (done) {
            var nodePath = '/1936712753';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('ModelElementInstance should pass', function (done) {
            var nodePath = '/767879236';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('ConnectionElementInstance should pass', function (done) {
            var nodePath = '/31060956';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('ModelRefInstance should pass', function (done) {
            var nodePath = '/551635397';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });

        it('PortElementInstance should pass', function (done) {
            var nodePath = '/361739760';
            testFixture.loadNode(ir.core, ir.rootNode, nodePath)
                .then(function (node) {
                    return checkNode(ir.core, node);
                })
                .then(function (result) {
                    expect(result.hasViolation).to.equal(false, result.message);
                })
                .nodeify(done);
        });
    });

    // Fail cases
    it('TooManyChildren should fail', function (done) {
        var nodePath = '/994621516';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('more');
            })
            .nodeify(done);
    });

    it('InvalidAttributeValue should fail', function (done) {
        var nodePath = '/1694245053';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('invalid value');
            })
            .nodeify(done);
    });

    it('Connection element with invalid target should fail', function (done) {
        var nodePath = '/1868058421';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('not an allowed dst target');
            })
            .nodeify(done);
    });

    it('InvalidAttribute should fail', function (done) {
        var nodePath = '/2048951527';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('attribute that is not part of any meta');
            })
            .nodeify(done);
    });

    it('InvalidTarget should fail', function (done) {
        var nodePath = '/1672466581';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('not an allowed ref target');
            })
            .nodeify(done);
    });

    it('TooManyMembers should fail', function (done) {
        var nodePath = '/1232831412';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('more');
            })
            .nodeify(done);
    });

    it('ModelOneChild should fail', function (done) {
        var nodePath = '/1702033017';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('fewer');
            })
            .nodeify(done);
    });

    it('InvalidPointer should fail', function (done) {
        var nodePath = '/990231279';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('Invalid pointer');
            })
            .nodeify(done);
    });

    it('InvalidSetName should fail', function (done) {
        var nodePath = '/3351391';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true);
                expect(result.message).to.contain('Invalid set');
            })
            .nodeify(done);
    });

    it('MixingInValidChildren should pass', function (done) {
        var nodePath = '/R';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it('ModelWithMixinsValidChildren should pass', function (done) {
        var nodePath = '/j';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it('should return false result when an invalid regex is defined on the meta', function (done) {
        var nodePath = '/1',
            node;
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node_) {
                node = node_;
                ir.core.setAttributeMeta(node, 'withInvalidRegEx', {
                    type: 'string',
                    regexp: "/((?<=\\()[A-Za-z][A-Za-z0-9\\+\\.\\-]*:([A-Za-z0-9\\.\\-_~:/\\?#\\[\\]@!\\$&'\\(\\)\\*\\+,;=]|%[A-Fa-f0-9]{2})+(?=\\)))|([A-Za-z][A-Za-z0-9\\+\\.\\-]*:([A-Za-z0-9\\.\\-_~:/\\?#\\[\\]@!\\$&'\\(\\)\\*\\+,;=]|%[A-Fa-f0-9]{2})+)/"
                });

                ir.core.setAttribute(node, 'withInvalidRegEx', 'hej');

                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true, result.message);
                expect(result.message).to.include('Invalid regular expression');
                ir.core.delAttributeMeta(node, 'withInvalidRegEx');
                ir.core.delAttribute(node, 'withInvalidRegEx', 'hej');

                // Make sure that other tests could broke.
                return checkNode(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    describe('metaConsistencyCheck', function () {
        function getContext() {
            var result = {
                root: null,
                fco: null,
                core: metaMetaIr.core
            };

            return metaMetaIr.core.loadRoot(metaMetaIr.rootHash)
                .then(function (root) {
                    result.root = root;
                    return metaMetaIr.core.loadByPath(root, '/1');
                })
                .then(function (fco) {
                    result.fco = fco;
                    return result;
                });
        }

        it('should return empty array on empty project', function (done) {
            getContext()
                .then(function (c) {
                    expect(checkMetaConsistency(c.core, c.root)).to.deep.equal([]);
                })
                .nodeify(done);
        });

        it('should return error with two meta nodes sharing name', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.addMember(c.root, 'MetaAspectSet', n);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('Duplicate name');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error with containment def of non-meta node', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    //c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setChildMeta(c.fco, n, -1, -1);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('containment of a node that is not part of the meta');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error with pointer target to non-meta node', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    //c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setPointerMetaTarget(c.fco, 'toNonMeta', n, 1, 1);
                    c.core.setPointerMetaLimits(c.fco, 'toNonMeta', 1, 1);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines a pointer [toNonMeta] where the ' +
                        'target is not part of the meta');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error with set member to non-meta node', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    //c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setPointerMetaTarget(c.fco, 'toNonMeta', n, -1, -1);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines a set [toNonMeta] where the ' +
                        'member is not part of the meta');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        // Name collisions sets/pointers/aspects.
        it('should return error when pointer name overrides set name', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setPointerMetaTarget(c.fco, 'setAndPtr', n, -1, -1);

                    c.core.setPointerMetaTarget(n, 'setAndPtr', c.fco, 1, 1);
                    c.core.setPointerMetaLimits(n, 'setAndPtr', 1, 1);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines a pointer [setAndPtr] colliding' +
                        ' with a set definition');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error when set name overrides pointer name', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    c.core.addMember(c.root, 'MetaAspectSet', n);

                    c.core.setPointerMetaTarget(c.fco, 'ptrAndSet', c.fco, 1, 1);
                    c.core.setPointerMetaLimits(c.fco, 'ptrAndSet', 1, 1);

                    c.core.setPointerMetaTarget(n, 'ptrAndSet', n, -1, -1);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines a set [ptrAndSet] colliding' +
                        ' with a pointer definition');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error when aspect name overrides set name', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setPointerMetaTarget(c.fco, 'setAndAspect', c.fco, -1, -1);

                    c.core.setChildMeta(n, c.fco, -1, -1);
                    c.core.setAspectMetaTarget(n, 'setAndAspect', c.fco);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines an aspect [setAndAspect] colliding' +
                        ' with a set definition');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error when set name overrides aspect name', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setChildMeta(c.fco, c.fco, -1, -1);
                    c.core.setAspectMetaTarget(c.fco, 'aspectAndSet', c.fco);

                    c.core.setPointerMetaTarget(n, 'aspectAndSet', c.fco, -1, -1);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines a set [aspectAndSet] colliding' +
                        ' with an aspect definition');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        // Aspects
        it('should return error when an aspect member is not a meta-node', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    //c.core.addMember(c.root, 'MetaAspectSet', n);
                    //c.core.setChildMeta(c.fco, c.fco, -1, -1);
                    c.core.setAspectMetaTarget(c.fco, 'nonMeta', n);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines an aspect [nonMeta] where ' +
                        'a member is not part of the meta');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        it('should return error when an aspect has a member that does not have a containment def', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.setAspectMetaTarget(c.fco, 'notChild', n);

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('defines an aspect [notChild] where ' +
                        'a member does not have a containment definition');
                    expect(result[0].severity).to.include('error');
                })
                .nodeify(done);
        });

        // Attributes
        it('should return error when regexp is invalid', function (done) {
            getContext()
                .then(function (c) {
                    var result;
                    c.core.setAttributeMeta(c.fco, 'InvalidRegexp', {
                        type: 'string',
                        regexp: "/((?<=\\()[A-Za-z][A-Za-z0-9\\+\\.\\-]*:([A-Za-z0-9\\.\\-_~:/\\?#\\[\\]@!\\$&'\\(\\)\\*\\+,;=]|%[A-Fa-f0-9]{2})+(?=\\)))|([A-Za-z][A-Za-z0-9\\+\\.\\-]*:([A-Za-z0-9\\.\\-_~:/\\?#\\[\\]@!\\$&'\\(\\)\\*\\+,;=]|%[A-Fa-f0-9]{2})+)/"
                    });

                    result = checkMetaConsistency(c.core, c.root);

                    expect(result.length).to.equal(1);
                    expect(result[0].severity).to.equal('error');
                    expect(result[0].message).to.include('defines an invalid regular expression');
                })
                .nodeify(done);
        });

        it('should return error when min and max of integer/float not a number', function (done) {
            getContext()
                .then(function (c) {
                    var result;
                    c.core.setAttributeMeta(c.fco, 'MinMaxStringsInt', {type: 'integer', min: '0', max: '2'});
                    c.core.setAttributeMeta(c.fco, 'MinMaxStringsFloat', {type: 'float', min: '0', max: '2'});

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(4);
                    result.forEach(function (res) {
                        expect(res.severity).to.equal('error');
                        expect(res.message).to.include('defines an invalid');
                        expect(res.message).to.include('The type is not a number');
                    });
                })
                .nodeify(done);
        });

        // Invalid/reserved names
        it.skip('should return error when attribute name starts with _', function (done) {
            getContext()
                .then(function (c) {
                    var result;
                    // TODO: This should throw!
                    c.core.setAttributeMeta(c.fco, '_underscore', {
                        type: 'string'
                    });

                    result = checkMetaConsistency(c.core, c.root);

                    expect(result.length).to.equal(1);
                    expect(result[0].severity).to.equal('error');
                    expect(result[0].message).to.include('defines an invalid regular expression');
                })
                .nodeify(done);
        });

        it('should return error when set starts with _', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setPointerMetaTarget(c.fco, '_underscore', c.fco, -1, -1);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        it('should return error when set is named ovr', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setPointerMetaTarget(c.fco, 'ovr', c.fco, -1, -1);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        it('should return error when aspect starts with _', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setAspectMetaTarget(c.fco, '_underscore', c.fco);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        it('should return error when aspect is named ovr', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setAspectMetaTarget(c.fco, 'ovr', c.fco);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        it('should return error when pointer starts with _', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setPointerMetaLimits(c.fco, '_underscore', 1, 1);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        it('should return error when pointer is named base', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setPointerMetaLimits(c.fco, 'base', 1, 1);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        it('should return error when pointer is named base', function (done) {
            getContext()
                .then(function (c) {
                    c.core.setPointerMetaTarget(c.fco, 'base', c.fco, 1, 1);

                    throw new Error('should have thrown earlier!!!');
                })
                .catch(function (e) {
                    expect(e instanceof Error).to.eql(true);
                    expect(e.name).to.eql('CoreIllegalArgumentError');
                })
                .nodeify(done);
        });

        // Mixin - this only checks the single call to core.getMixinErrors which has its own tests.
        it('should return warning when there is a mixin warning', function (done) {
            getContext()
                .then(function (c) {
                    var n = c.core.createNode({parent: c.root, base: c.fco}),
                        mixin = c.core.createNode({parent: c.root, base: c.fco}),
                        mixin2 = c.core.createNode({parent: c.root, base: c.fco}),
                        result;

                    c.core.setAttribute(n, 'name', 'Node');
                    c.core.setAttribute(mixin, 'name', 'mixin');
                    c.core.setAttribute(mixin2, 'name', 'mixin2');
                    c.core.addMember(c.root, 'MetaAspectSet', n);
                    c.core.addMember(c.root, 'MetaAspectSet', mixin);
                    c.core.addMember(c.root, 'MetaAspectSet', mixin2);

                    c.core.setAttributeMeta(mixin, 'same', {
                        type: 'string'
                    });

                    c.core.setAttributeMeta(mixin2, 'same', {
                        type: 'string'
                    });

                    c.core.addMixin(n, c.core.getPath(mixin));
                    c.core.addMixin(n, c.core.getPath(mixin2));

                    result = checkMetaConsistency(c.core, c.root);
                    expect(result.length).to.equal(1);
                    expect(result[0].message).to.include('inherits attribute definition \'same\' from');
                    expect(result[0].severity).to.include('warning');
                })
                .nodeify(done);
        });
    });
});
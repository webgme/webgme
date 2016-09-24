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
        checkMetaRules = requireJS('common/core/users/metarules'),
        projectName = 'MetaRules',
        branchName = 'master',
        languagePath = '/822429792/',
        ir,

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
                return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                    return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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
                return checkMetaRules(ir.core, node);
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

                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(true, result.message);
                expect(result.message).to.include('Invalid regular expression');
                ir.core.delAttributeMeta(node, 'withInvalidRegEx');
                ir.core.delAttribute(node, 'withInvalidRegEx', 'hej');

                // Make sure that other tests could broke.
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });
});
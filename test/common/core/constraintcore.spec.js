/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('constraint.core', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('constraint.core:storage'),
        Q = testFixture.Q,
        storage,
        __should = testFixture.should,
        TASYNC = testFixture.requirejs('common/core/tasync'),
        project,
        projectName = 'coreConstraintTesting',
        projectId = testFixture.projectName2Id(projectName),
        core,
        rootNode,

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
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    beforeEach(function (done) {
        storage.createProject({projectName: projectName})
            .then(function (dbProject) {
                var base,
                    instance;

                project = new testFixture.Project(dbProject, storage, logger, gmeConfig);
                core = new testFixture.WebGME.core(project, {
                    usertype: 'tasync',
                    globConf: gmeConfig,
                    logger: logger
                });
                rootNode = core.createNode();
                base = core.createNode({parent: rootNode});
                core.setAttribute(base, 'name', 'base');
                core.setRegistry(base, 'position', {x: 100, y: 100});
                core.setConstraint(base, 'global', {
                    priority: 100,
                    info: 'just info text',
                    script: 'script text for global constraint'
                });

                instance = core.createNode({parent: rootNode, base: base});
                core.setAttribute(instance, 'name', 'instance');
                core.setConstraint(instance, 'local', {
                    priority: 1,
                    info: 'just another info text',
                    script: 'script text for local constraint'
                });
                done();
            })
            .catch(done);
    });

    afterEach(function (done) {
        storage.deleteProject({projectId: projectId}, done);
    });

    it('gives back null for unknown constraint', function () {
        (core.getConstraint(rootNode, 'any') === null).should.be.true;
    });

    it('gives back proper names for own and all constraints', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }

            core.getConstraintNames(rootNode).should.be.empty;
            core.getOwnConstraintNames(rootNode).should.be.empty;
            core.getConstraintNames(base).should.be.eql(['global']);
            core.getOwnConstraintNames(base).should.be.eql(['global']);
            core.getConstraintNames(instance).should.include.members(['global', 'local']);
            core.getOwnConstraintNames(instance).should.be.eql(['local']);

            done();
        }, core.loadChildren(rootNode));
    });
    it('removing constraints', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }
            core.delConstraint(base, 'global');

            core.getConstraintNames(instance).should.be.eql(['local']);
            core.getOwnConstraintNames(instance).should.be.eql(['local']);

            done();
        }, core.loadChildren(rootNode));
    });
});

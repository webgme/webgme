/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('constraint core', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        storage = new testFixture.Storage({
            globConf: gmeConfig,
            logger: testFixture.logger.fork('constraint_core:storage')
        }),
        TASYNC = testFixture.requirejs('common/core/tasync'),
        project,
        core,
        root;

    beforeEach(function (done) {
        storage.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }
            storage.openProject('coreConstraintTesting', function (err, p) {
                var base, instance;
                if (err) {
                    done(err);
                    return;
                }
                project = p;
                core = new testFixture.WebGME.core(project, {
                    usertype: 'tasync',
                    globConf: gmeConfig,
                    logger: testFixture.logger.fork('constraint_core:core')
                });
                root = core.createNode();
                base = core.createNode({parent: root});
                core.setAttribute(base, 'name', 'base');
                core.setRegistry(base, 'position', {x: 100, y: 100});
                core.setConstraint(base, 'global', {
                    priority: 100,
                    info: 'just info text',
                    script: 'script text for global constraint'
                });

                instance = core.createNode({parent: root, base: base});
                core.setAttribute(instance, 'name', 'instance');
                core.setConstraint(instance, 'local', {
                    priority: 1,
                    info: 'just another info text',
                    script: 'script text for local constraint'
                });
                done();
            });
        });
    });
    afterEach(function (done) {
        storage.deleteProject('coreConstraintTesting', function (err) {
            if (err) {
                done(err);
                return;
            }
            storage.closeDatabase(done);
        });
    });
    it('gives back null for unknown contraint', function () {
        (core.getConstraint(root, 'any') === null).should.be.true;
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

            core.getConstraintNames(root).should.be.empty;
            core.getOwnConstraintNames(root).should.be.empty;
            core.getConstraintNames(base).should.be.eql(['global']);
            core.getOwnConstraintNames(base).should.be.eql(['global']);
            core.getConstraintNames(instance).should.include.members(['global', 'local']);
            core.getOwnConstraintNames(instance).should.be.eql(['local']);

            done();
        }, core.loadChildren(root));
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
        }, core.loadChildren(root));
    });
});

/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('meta core', function () {
    'use strict';
    var storage = testFixture.Storage(),
        project,
        core,
        root,
        base,
        attrNode,
        setNode,
        childNode,
        aspectNode;

    beforeEach(function (done) {
        storage.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }
            storage.openProject('coreMetaTesting', function (err, p) {
                if (err) {
                    done(err);
                    return;
                }
                project = p;
                core = new testFixture.WebGME.core(project);
                root = core.createNode();
                base = core.createNode({parent: root});
                core.setAttribute(base, 'name', 'base');

                attrNode = core.createNode({parent: root, base: base});
                core.setAttribute(attrNode, 'name', 'attr');
                core.setAttributeMeta(attrNode, 'boolean', {type: 'boolean', default: true});
                core.setAttributeMeta(attrNode, 'string', {type: 'string', default: 'text'});
                core.setAttributeMeta(attrNode, 'integer', {type: 'integer', default: 0});
                core.setAttributeMeta(attrNode, 'float', {type: 'float', default: 1.2});

                setNode = core.createNode({parent: root, base: base});
                core.setAttribute(setNode, 'name', 'set');
                core.setPointerMetaTarget(setNode, 'set', attrNode, 0, -1);
                core.setPointerMetaTarget(setNode, 'set', setNode, 0, -1);
                core.setPointerMetaLimits(setNode, 'set', 0, 2);

                core.setPointerMetaTarget(setNode, 'ptr', base, 0, 1);
                core.setPointerMetaLimits(setNode, 'ptr', 0, 1);

                childNode = core.createNode({parent: root, base: base});
                core.setAttribute(childNode, 'name', 'child');
                core.setChildMeta(childNode, attrNode);
                core.setChildMeta(childNode, setNode, 0, 1);
                core.setChildMeta(childNode, childNode, -1, -1);
                core.setChildrenMetaLimits(childNode, 0, 10);

                aspectNode = core.createNode({parent: root, base: base});
                core.setAttribute(aspectNode, 'name', 'aspect');
                core.setAspectMetaTarget(aspectNode, 'aspect', base);
                done();
            });
        });
    });
    afterEach(function (done) {
        storage.deleteProject('coreMetaTesting', function (err) {
            if (err) {
                done(err);
                return;
            }
            storage.closeDatabase(done);
        });
    });
    it('checking types', function () {
        core.isTypeOf(attrNode, base).should.be.true;
        core.isTypeOf(attrNode, setNode).should.be.false;
    });
    it('check instances', function () {
        core.isInstanceOf(attrNode, 'base').should.be.true;
        core.isInstanceOf(setNode, 'set').should.be.false;
        core.isInstanceOf(base, 'unkown').should.be.false;
    });
    it('checking attribute values', function () {

        core.isValidAttributeValueOf(attrNode, 'unknown', 'anything').should.be.false;

        core.isValidAttributeValueOf(attrNode, 'boolean', 'true').should.be.false;
        core.isValidAttributeValueOf(attrNode, 'boolean', 1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'boolean', 1.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'boolean', true).should.be.true;

        core.isValidAttributeValueOf(attrNode, 'string', 1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'string', 1.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'string', true).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'string', '1').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'integer', 1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'integer', 1.1).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'integer', true).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'integer', '1').should.be.true;

        core.isValidAttributeValueOf(attrNode, 'float', 1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'float', 1.1).should.be.true;
        core.isValidAttributeValueOf(attrNode, 'float', true).should.be.false;
        core.isValidAttributeValueOf(attrNode, 'float', '1').should.be.true;
    });
    it('checking attributes', function () {
        core.getValidAttributeNames(attrNode).should.include.members(['boolean', 'float', 'integer', 'string']);
        core.getValidAttributeNames(attrNode).should.have.length(4);
        (core.getAttributeMeta(attrNode, 'unknown') === undefined).should.be.true;
        core.getAttributeMeta(attrNode, 'string').should.have.property('type');
        core.getAttributeMeta(attrNode, 'string').should.have.property('default');

        core.delAttributeMeta(attrNode, 'string');
        core.getValidAttributeNames(attrNode).should.not.include.members(['string']);
        core.getValidAttributeNames(attrNode).should.have.length(3);
    });
    it('checking pointers and sets', function () {
        core.getValidSetNames(setNode).should.include.members(['set']);
        core.getValidSetNames(setNode).should.have.length(1);

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

        core.isValidTargetOf(attrNode, setNode, 'set').should.be.true;
        core.isValidTargetOf(setNode, setNode, 'set').should.be.true;
        core.isValidTargetOf(base, setNode, 'set').should.be.false;

        core.isValidTargetOf(attrNode, setNode, 'unknown').should.be.false;

        core.isValidTargetOf(attrNode, setNode, 'ptr').should.be.true;
        core.isValidTargetOf(aspectNode, setNode, 'ptr').should.be.true;
        core.isValidTargetOf(base, setNode, 'ptr').should.be.true;
        core.isValidTargetOf(root, setNode, 'ptr').should.be.false;
    });
    it('removing pointer rules', function () {
        core.getValidSetNames(setNode).should.include.members(['set']);
        core.getValidSetNames(setNode).should.have.length(1);

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

        core.delPointerMetaTarget(setNode, 'set', core.getPath(setNode));

        core.getValidSetNames(setNode).should.include.members(['set']);
        core.getValidSetNames(setNode).should.have.length(1);

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

        core.delPointerMeta(setNode, 'set');

        //TODO check why the removal not visible without persisting
        core.getValidSetNames(setNode).should.be.empty;

        core.getValidPointerNames(setNode).should.include.members(['ptr']);
        core.getValidPointerNames(setNode).should.have.length(1);

    });
    it('checking children rules', function () {
        core.getValidChildrenPaths(childNode).should.have.length(3);
        core.getValidChildrenPaths(childNode).should.include.members([core.getPath(childNode), core.getPath(attrNode), core.getPath(setNode)]);

        core.isValidChildOf(attrNode, childNode).should.be.true;
        core.isValidChildOf(childNode, childNode).should.be.true;
        core.isValidChildOf(base, childNode).should.be.false;

        core.delChildMeta(childNode, core.getPath(childNode));

        core.getValidChildrenPaths(childNode).should.have.length(2);
        core.getValidChildrenPaths(childNode).should.include.members([core.getPath(setNode), core.getPath(attrNode)]);

    });
    it('checking aspect rules', function () {
        core.getValidAspectNames(aspectNode).should.have.length(1);
        core.getValidAspectNames(aspectNode).should.include.members(['aspect']);

        core.delAspectMetaTarget(aspectNode, 'aspect', core.getPath(base));

        core.getValidAspectNames(aspectNode).should.have.length(1);
        core.getValidAspectNames(aspectNode).should.include.members(['aspect']);

        core.delAspectMeta(aspectNode, 'aspect');

        core.getValidAspectNames(aspectNode).should.be.empty;
    });
    it('checks MetaSheet based type query',function(){
        core.addMember(root,'MetaAspectSet',attrNode);
        core.addMember(root,'MetaAspectSet',base);

        core.getPath(core.getBaseType(attrNode)).should.be.eql(core.getPath(attrNode));
        core.getPath(core.getBaseType(setNode)).should.be.eql(core.getPath(base));

        (core.getBaseType(root) === null).should.be.true;
    });
});
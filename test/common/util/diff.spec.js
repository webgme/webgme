/*jshint node:true, mocha:true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('DIFF', function () {
    'use strict';
    var DIFF = testFixture.requirejs('common/util/diff'),
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('diff.spec'),
        projectName = 'DIFF_testing',
        expect = testFixture.expect,
        gmeAuth,
        storage,
        project,
        Core = testFixture.requirejs('common/core/core'),
        core;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.createProject({
                    projectName: projectName,
                    username: gmeConfig.authentication.guestAccount
                });
            })
            .then(function (project_) {
                project = project_;
                core = new Core(project, {globConf: gmeConfig, logger: logger});
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    it('should have the correct forbidden words list', function () {
        expect(DIFF.FORBIDDEN_WORDS).to.eql({
            guid: true,
            hash: true,
            attr: true,
            reg: true,
            pointer: true,
            set: true,
            meta: true,
            removed: true,
            movedFrom: true,
            childrenListChanged: true,
            oGuids: true,
            ooGuids: true,
            oBaseGuids:true,
            ooBaseGuids:true,
            min: true,
            max: true
        });
    });

    it('should reply with the proper attribute value', function () {
        var node = core.createNode();

        core.setAttribute(node, 'something', 'one');

        expect(DIFF.getValueFromNode(core, node, '/attr/something')).to.eql('one');
        expect(DIFF.getValueFromNode(core, node, '/attr/unknown')).to.eql(undefined);
    });

    it('should reply with the proper registry value', function () {
        var node = core.createNode();

        core.setRegistry(node, 'something', 'one');

        expect(DIFF.getValueFromNode(core, node, '/reg/something')).to.eql('one');
        expect(DIFF.getValueFromNode(core, node, '/reg/unknown')).to.eql(undefined);
    });

    it('should reply with the proper pointer value', function () {
        var node = core.createNode();

        core.setPointer(node, 'null', null);
        core.setPointer(node, 'self', node);

        expect(DIFF.getValueFromNode(core, node, '/pointer/null')).to.eql(null);
        expect(DIFF.getValueFromNode(core, node, '/pointer/self')).to.eql('');
        expect(DIFF.getValueFromNode(core, node, '/pointer/unknown')).to.eql(undefined);
    });

    it('should reply with the proper guid', function () {
        var node = core.createNode({guid: '233a98c5-89b7-d489-7f9a-945dda808522'});

        expect(DIFF.getValueFromNode(core, node, '/guid')).to.eql('233a98c5-89b7-d489-7f9a-945dda808522');
    });

    it('should reply with undefined by default', function () {
        expect(DIFF.getValueFromNode(core, null, '/removed')).to.eql(undefined);
    });

    it('should throw an error for invalid subNodePaths', function (done) {
        try {
            DIFF.getValueFromNode(core, null, '/whatever');
            done(new Error('should throw CoreInternalError'));
        } catch (e) {
            expect(e.name).to.eql('CoreInternalError');
            done();
        }
    });

    it('should get correct set attribute value', function () {
        var node = core.createNode();

        core.createSet(node, 'set');
        core.setSetAttribute(node, 'set', 'something', 'one');

        expect(DIFF.getValueFromNode(core, node, '/set/set/attr/something')).to.eql('one');
        expect(DIFF.getValueFromNode(core, node, '/set/set/attr/unknown')).to.eql(undefined);
    });

    it('should get correct set registry value', function () {
        var node = core.createNode();

        core.createSet(node, 'set');
        core.setSetRegistry(node, 'set', 'something', 'one');

        expect(DIFF.getValueFromNode(core, node, '/set/set/reg/something')).to.eql('one');
        expect(DIFF.getValueFromNode(core, node, '/set/set/reg/unknown')).to.eql(undefined);
    });

    it('should get correct set-member attribute value', function () {
        var node = core.createNode();

        core.createSet(node, 'set');
        core.addMember(node, 'set', node);
        core.setMemberAttribute(node, 'set', '', 'something', 'one');

        expect(DIFF.getValueFromNode(core, node, '/set/set////attr/something')).to.eql('one');
        expect(DIFF.getValueFromNode(core, node, '/set/set////attr/unknown')).to.eql(undefined);
    });

    it('should get correct set-member registry value', function () {
        var node = core.createNode();

        core.createSet(node, 'set');
        core.addMember(node, 'set', node);
        core.setMemberRegistry(node, 'set', '', 'something', 'one');

        expect(DIFF.getValueFromNode(core, node, '/set/set////reg/something')).to.eql('one');
        expect(DIFF.getValueFromNode(core, node, '/set/set////reg/unknown')).to.eql(undefined);
    });

    it('should get correct meta children values', function () {
        var node = core.createNode();
        core.setChildrenMetaLimits(node, 10, 20);
        core.setChildMeta(node, node, 5, 6);

        expect(DIFF.getValueFromNode(core, node, '/meta/children/min')).to.eql(10);
        expect(DIFF.getValueFromNode(core, node, '/meta/children/max')).to.eql(20);
        expect(DIFF.getValueFromNode(core, node, '/meta/children/unknown')).to.eql(undefined);
        expect(DIFF.getValueFromNode(core, node, '/meta/children////min')).to.eql(5);
        expect(DIFF.getValueFromNode(core, node, '/meta/children////max')).to.eql(6);
        expect(DIFF.getValueFromNode(core, node, '/meta/children////unknown')).to.eql(undefined);
        expect(DIFF.getValueFromNode(core, node, '/meta/children//unknown/path//min')).to.eql(undefined);
    });

    it('should get correct meta pointer values', function () {
        var node = core.createNode();
        core.setPointerMetaLimits(node, 'ptr', 10, 20);
        core.setPointerMetaTarget(node, 'ptr', node, 5, 6);

        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr/min')).to.eql(10);
        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr/max')).to.eql(20);
        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr/unknown')).to.eql(undefined);
        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr////min')).to.eql(5);
        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr////max')).to.eql(6);
        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr////unknown')).to.eql(undefined);
        expect(DIFF.getValueFromNode(core, node, '/meta/pointers/ptr//unknown/path//min')).to.eql(undefined);
    });

    it('should get correct meta attribute values', function () {
        var node = core.createNode();
        core.setAttributeMeta(node, 'something', {type: 'string', enum: ['one', 'two', 'three']});

        expect(DIFF.getValueFromNode(core, node, '/meta/attributes/something/type')).to.eql('string');
        expect(DIFF.getValueFromNode(core, node, '/meta/attributes/something/enum'))
            .to.have.members(['one', 'two', 'three']);
        expect(DIFF.getValueFromNode(core, node, '/meta/attributes/unknown/type')).to.eql(undefined);
    });

    it('should get correct meta constraint values', function () {
        var node = core.createNode();
        core.setConstraint(node, 'c', {priority: 'p', script: 's', info: 'i'});

        expect(DIFF.getValueFromNode(core, node, '/meta/constraints/c'))
            .to.eql({priority: 'p', script: 's', info: 'i'});
        expect(DIFF.getValueFromNode(core, node, '/meta/constraints/c/priority')).to.eql('p');
        expect(DIFF.getValueFromNode(core, node, '/meta/constraints/c/script')).to.eql('s');
        expect(DIFF.getValueFromNode(core, node, '/meta/constraints/c/info')).to.eql('i');
        expect(DIFF.getValueFromNode(core, node, '/meta/constraints/c/unknown')).to.eql(undefined);
        expect(DIFF.getValueFromNode(core, node, '/meta/constraints/unknown')).to.eql(null);
    });
});


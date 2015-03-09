/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Message', function () {
    'use strict';

    var should = testFixture.should,
        PluginMessage = testFixture.requirejs('plugin/PluginMessage'),
        PluginNodeDescription = testFixture.requirejs('plugin/PluginNodeDescription');

    it('should instantiate PluginConfig and have defined properties', function () {
        var pluginMessage = new PluginMessage();

        should.exist(pluginMessage);
        pluginMessage.should.have.property('serialize');

        pluginMessage.should.have.property('commitHash');
        pluginMessage.should.have.property('activeNode');
        pluginMessage.should.have.property('message');
        pluginMessage.should.have.property('severity');

        // default values
        pluginMessage.commitHash.should.equal('');
        pluginMessage.activeNode.should.be.instanceOf(PluginNodeDescription);
        pluginMessage.message.should.equal('');
        pluginMessage.severity.should.equal('info');
    });

    it('should instantiate PluginMessage with a serialized object', function () {
        var pluginMessage,
            config = {
                commitHash: 'abcdefgth1234',
                activeNode: {
                    id: '123456',
                    name: 'node name'
                },
                message: 'test message',
                severity: 'error'
            };

        pluginMessage = new PluginMessage(config);

        should.exist(pluginMessage);
        pluginMessage.commitHash.should.equal('abcdefgth1234');
        pluginMessage.activeNode.should.be.instanceOf(PluginNodeDescription);
        pluginMessage.message.should.equal('test message');
        pluginMessage.severity.should.equal('error');

        pluginMessage.serialize().should.deep.equal(config);
    });

    it('should instantiate a PluginMessage if active node is a PluginNodeDescription', function () {
        var pluginMessage,
            config = {
                commitHash: 'abcdefgth1234',
                activeNode: new PluginNodeDescription({id: '123456', name: 'node name'}),
                message: 'test message'
            };

        pluginMessage = new PluginMessage(config);

        should.exist(pluginMessage);
        pluginMessage.commitHash.should.equal('abcdefgth1234');
        pluginMessage.activeNode.should.be.instanceOf(PluginNodeDescription);
        pluginMessage.message.should.equal('test message');
        pluginMessage.severity.should.equal('info');

        pluginMessage.serialize().should.deep.equal({
            'activeNode': {
                'id': '123456',
                'name': 'node name'
            },
            'commitHash': 'abcdefgth1234',
            'message': 'test message',
            'severity': 'info'
        });
    });
});
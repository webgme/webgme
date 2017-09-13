/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('webgme', function () {
    'use strict';

    var testFixture = require('./_globals.js'),
        expect = testFixture.expect;

    it('should export public API functions and classes when requiring webgme-engine', function () {
        var webGME = require('webgme-engine');

        expect(webGME).to.have.property('standaloneServer');
        expect(webGME).to.have.property('addToRequireJsPaths');
        expect(webGME).to.have.property('getStorage');
        expect(webGME).to.have.property('getGmeAuth');
        expect(webGME).to.have.property('core');
        expect(webGME).to.have.property('Logger');
        expect(webGME).to.have.property('REGEXP');

        expect(typeof webGME.WorkerManagerBase.prototype.request).to.equal('function');
        expect(typeof webGME.ServerWorkerManager).to.equal('function');
        expect(typeof webGME.AuthorizerBase.prototype.getAccessRights).to.equal('function');

    });

    it('should export public API functions and classes when requiring webgme', function () {
        var webGME = require('../webgme');

        expect(webGME).to.have.property('standaloneServer');
        expect(webGME).to.have.property('addToRequireJsPaths');
        expect(webGME).to.have.property('getStorage');
        expect(webGME).to.have.property('getGmeAuth');
        expect(webGME).to.have.property('core');
        expect(webGME).to.have.property('Logger');
        expect(webGME).to.have.property('REGEXP');

        expect(typeof webGME.WorkerManagerBase.prototype.request).to.equal('function');
        expect(typeof webGME.ServerWorkerManager).to.equal('function');
        expect(typeof webGME.AuthorizerBase.prototype.getAccessRights).to.equal('function');
    });

    it('all webgme-engine/index should be forwarded to webgme.js', function () {
        expect(Object.keys(require('../webgme'))).to.have.members(Object.keys(require('webgme-engine')));
    });

});
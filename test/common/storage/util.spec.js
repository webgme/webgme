/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');

describe('storage util', function () {
    'use strict';
    var StorageUtil = testFixture.requirejs('common/storage/util'),
        gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect;

    it('should get the full name from project Id', function () {
        expect(StorageUtil.getProjectFullNameFromProjectId('ownerId+projectName')).to.equal('ownerId/projectName');
    });

    it('should return undefined if project id is not given for getProjectFullNameFromProjectId', function () {
        expect(StorageUtil.getProjectFullNameFromProjectId()).to.equal(undefined);
    });

    it('should get project displayed name from project id', function () {
        expect(StorageUtil.getProjectDisplayedNameFromProjectId('ownerId+projectName'))
            .to.equal('ownerId / projectName');
    });

    it('should return undefined if project id is not given for getProjectDisplayedNameFromProjectId', function () {
        expect(StorageUtil.getProjectDisplayedNameFromProjectId()).to.equal(undefined);
    });

    it('should get project id from project full name', function () {
        expect(StorageUtil.getProjectIdFromProjectFullName('ownerId/projectName')).to.equal('ownerId+projectName');
    });

    it('should return undefined if project full name is not given for getProjectIdFromProjectFullName', function () {
        expect(StorageUtil.getProjectIdFromProjectFullName()).to.equal(undefined);
    });

    it('should get project id from owner id and project full name', function () {
        expect(StorageUtil.getProjectIdFromOwnerIdAndProjectName('ownerId', 'projectName'))
            .to.equal('ownerId+projectName');
    });

    it('should get projectName projectId', function () {
        expect(StorageUtil.getProjectNameFromProjectId('ownerId+projectName')).to.equal('projectName');
    });

    it('should return undefined if project projectId is not given for getProjectNameFromProjectId', function () {
        expect(StorageUtil.getProjectNameFromProjectId()).to.equal(undefined);
    });

    it('checkHashConsistency should return false if hash does not match object', function () {
        expect(StorageUtil.checkHashConsistency(gmeConfig, {_id: '#somehash', 'atr': {'name': 'FCO'}}), '#hash')
            .to.equal(false);
    });

    it('checkHashConsistency should return true if config.storage.disableHashChecks = true', function () {
        var gmeConfigCopy = JSON.parse(JSON.stringify(gmeConfig));
        gmeConfigCopy.storage.disableHashChecks = true;
        expect(StorageUtil.checkHashConsistency(gmeConfigCopy, {_id: '#somehash', 'atr': {'name': 'FCO'}}), '#hash')
            .to.equal(true);
    });

    it('checkHashConsistency should return true if config.storage.keyType = "rand160Bits"', function () {
        var gmeConfigCopy = JSON.parse(JSON.stringify(gmeConfig));
        gmeConfigCopy.storage.keyType = 'rand160Bits';
        expect(StorageUtil.checkHashConsistency(gmeConfigCopy, {_id: '#somehash', 'atr': {'name': 'FCO'}}), '#hash')
            .to.equal(true);
    });
});
/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');

describe('storage util', function () {
    'use strict';
    var StorageUtil = testFixture.requirejs('common/storage/util'),
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

    it('should patchDataObject leave input intact if non-existing patch patch showing', function () {
        var rootObject = {
                __v: '2.0.0',
                ovr: {
                    firstPath: {
                        base: '/1',
                        'base-inv': 'myself'
                    },
                    secondPath: {
                        otherPtr: '/1',
                        'other-inv': 'somePath'
                    }
                },
                otherField: ['any', 'thing']
            },
            rootCopy = JSON.parse(JSON.stringify(rootObject));

        rootCopy.__v = '1.0.0';
        StorageUtil.patchDataObject(rootObject);
        expect(rootCopy).to.eql(rootObject);
    });

    it('should patchDataObject remove inverse pointer during patch from 0.0.0', function () {
        var rootObject = {
                ovr: {
                    firstPath: {
                        base: '/1',
                        'base-inv': 'myself'
                    },
                    secondPath: {
                        otherPtr: '/1',
                        'other-inv': 'somePath'
                    }
                },
                otherField: ['any', 'thing']
            },
            rootCopy = JSON.parse(JSON.stringify(rootObject));

        StorageUtil.patchDataObject(rootObject);
        expect(rootCopy).not.to.eql(rootObject);
        expect(rootObject.ovr.firstPath).to.have.keys(['base']);
    });
});
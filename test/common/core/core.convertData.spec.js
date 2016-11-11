/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
var testFixture = require('../../_globals.js');

describe('storage util', function () {
    'use strict';
    var convertData = testFixture.requirejs('common/core/convertData'),
        expect = testFixture.expect;


    it('should patchDataObject leave input intact if non-existing patch patch showing', function () {
        var rootObject = {
                __v: '1.5.0',
                ovr: {
                    firstPath: {
                        base: '/1',
                        'base-inv': ['myself']
                    },
                    secondPath: {
                        otherPtr: '/1',
                        'other-inv': ['somePath']
                    }
                },
                otherField: ['any', 'thing']
            },
            newData = convertData(rootObject);

        expect(newData).to.eql(rootObject);
    });

    it('should patchDataObject remove inverse pointer during patch from 0.0.0', function () {
        var rootObject = {
                ovr: {
                    firstPath: {
                        base: '/1',
                        'base-inv': ['myself']
                    },
                    secondPath: {
                        otherPtr: '/1',
                        'other-inv': ['somePath']
                    }
                },
                otherField: ['any', 'thing']
            },
            newData = convertData(rootObject);

        expect(newData).not.to.eql(rootObject);
        expect(newData.ovr.firstPath).to.have.keys(['base']);
    });
});
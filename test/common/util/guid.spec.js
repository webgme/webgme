/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('GUID', function () {
    'use strict';
    var GUID = testFixture.requirejs('common/util/guid'),
        __should = testFixture.should,
        GUID_REGEXP = new RegExp('^[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}$', 'i');

    it('should generate a valid guid format', function () {
        var guid = GUID();
        guid.match(GUID_REGEXP).should.not.be.null;
    });

    it('should generate different guids', function () {
        var guidOne = GUID(),
            guidTwo = GUID();

        guidOne.should.not.equal(guidTwo);
        guidOne.toString().should.not.equal(guidTwo.toString());
    });

});


/*globals require, describe, it, WebGMEGlobal*/
/**
 * @author lattmann / https://github.com/lattmann
 */

require('../../_globals.js');

describe('GUID', function () {
    "use strict";
    var should = require('chai').should(),
        WebGME = require('../../../webgme'),
        requirejs = require('requirejs'),
        config = WebGMEGlobal.getConfig(),

        GUID = requirejs('common/util/guid'),

        GUID_REGEXP = new RegExp('^[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}$', 'i');

    it('should generate a valid guid format', function () {
        var guid = GUID();
        //console.log(guid, guid.match(GUID_REGEXP));
        guid.match(GUID_REGEXP).should.not.be.null;
    });

    it('should generate different guids', function () {
        var guidOne = GUID(),
            guidTwo = GUID();

        guidOne.should.not.equal(guidTwo);
        guidOne.toString().should.not.equal(guidTwo.toString());
    });

});


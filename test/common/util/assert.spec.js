/* globals TESTING */
/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('ASSERT', function () {
    'use strict';
    var ASSERT = testFixture.requirejs('common/util/assert'),
        expect = testFixture.expect,
        OLD_TESTING = TESTING;

    beforeEach(function () {
        TESTING = undefined;
    });

    afterEach(function () {
        TESTING = OLD_TESTING;
    });

    it('should not throw when condition is truthy', function () {
        expect(function () { ASSERT(1); }).to.not.throw();
        expect(function () { ASSERT({}); }).to.not.throw();
        expect(function () { ASSERT(true); }).to.not.throw();
        expect(function () { ASSERT('a'); }).to.not.throw();
        expect(function () { ASSERT([]); }).to.not.throw();
    });

    it('should throw when condition is falsy', function () {
        expect(function () { ASSERT(0); }).to.throw(Error, /ASSERT failed/);
        expect(function () { ASSERT(false); }).to.throw(Error, /ASSERT failed/);
        expect(function () { ASSERT(''); }).to.throw(Error, /ASSERT failed/);
        expect(function () { ASSERT(null); }).to.throw(Error, /ASSERT failed/);
        expect(function () { ASSERT(undefined); }).to.throw(Error, /ASSERT failed/);
    });

    it('should throw when condition is falsy a custom error message', function () {
        expect(function () { ASSERT(false, 'custom error message'); }).to.throw(Error, /custom error message/);
    });

    it('should throw when condition is falsy and TESTING is defined', function () {
        TESTING = OLD_TESTING;
        expect(function () { ASSERT(0); }).to.throw(Error, /ASSERT failed/);
    });

});

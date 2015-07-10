/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('String stream reader', function () {
    'use strict';
    var StringStreamReader = require('../../../src/server/util/StringStreamReader'),
        expect = testFixture.expect;

    it('should create an instance from string', function () {
        var stringStreamReader = new StringStreamReader('test string');
        expect(stringStreamReader).to.not.equal(null);
    });

    it('should serialize to string', function () {
        var stringStreamReader = new StringStreamReader('test string');
        expect(stringStreamReader.toString()).to.equal('test string');
    });


    it('should serialize to JSON', function () {
        var stringStreamReader = new StringStreamReader('{"a": 42}');
        expect(stringStreamReader.toJSON()).to.deep.equal({a: 42});
    });

    it('should read data', function () {
        var stringStreamReader = new StringStreamReader('test string');
        expect(stringStreamReader.read().length).to.equal('test string'.length);
    });
});
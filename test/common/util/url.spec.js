/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 *
 */

var testFixture = require('../../_globals.js');

describe('url', function () {
    'use strict';
    var URL = testFixture.requirejs('common/util/url'),
        expect = testFixture.expect;

    it('should create ref object', function () {
        var result,
            url = 'some/url+is#here&';

        expect(URL.hasOwnProperty('urlToRefObject'), true);

        result = URL.urlToRefObject(url);
        expect(result.hasOwnProperty('$ref'), true);
        expect(result.$ref).to.equal(url);
    });

    it('should parse cookies', function () {
        var result,
            cookie = 'username=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';

        expect(URL.hasOwnProperty('parseCookie'), true);

        result = URL.parseCookie(cookie);

        expect(result.hasOwnProperty('username'), true);
        expect(result.username).to.equal('John Doe');
        expect(result.hasOwnProperty('expires'), true);
        expect(result.expires).to.equal('Thu, 18 Dec 2013 12:00:00 UTC');
        expect(result.hasOwnProperty('path'), true);
        expect(result.path).to.equal('/');
    });
});
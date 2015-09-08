/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');

describe('canon library', function () {
    'use strict';
    var CANON = testFixture.requirejs('common/util/canon'),
        expect = testFixture.expect;

    it('should canonize object with Date, RegExp, Array, and Object', function () {
        var obj = {
                z: 42,
                d: new Date('2015-07-03T16:11:41.974Z'),
                r: new RegExp('^[a-f0-9]{40}$'),
                b: 'test string',
                a: [0, 1, 2],
                c: {
                    h: 'sample'
                }
            },
            expectedResult = '["Object",' +
                             '"a",["Array",0,1,2],' +
                             '"b","test string",' +
                             '"c",["Object","h","sample"],' +
                             '"d",["Date","2015-07-03T16:11:41.974Z"],' +
                             '"r",["RegExp","/^[a-f0-9]{40}$/"],' +
                             '"z",42]';

        expect(CANON.stringify(obj)).to.equal(expectedResult);
    });


    it('should parse serialized object with Date, RegExp, Array, and Object', function () {
        var expectedResult = {
                z: 42,
                d: new Date('2015-07-03T16:11:41.974Z'),
                r: new RegExp('^[a-f0-9]{40}$'),
                b: 'test string',
                a: [0, 1, 2],
                c: {
                    h: 'sample'
                }
            },
            serialized = '["Object",' +
                         '"a",["Array",0,1,2],' +
                         '"b","test string",' +
                         '"c",["Object","h","sample"],' +
                         '"d",["Date","2015-07-03T16:11:41.974Z"],' +
                         '"r",["RegExp","/^[a-f0-9]{40}$/"],' +
                         '"z",42]';

        expect(CANON.parse(serialized)).to.deep.equal(expectedResult);
    });

    it('should throw if object to be serialized has a function', function () {
        var obj = {
            f: function () {
                return 42;
            }
        };

        function tryToSerialize() {
            return CANON.stringify(obj);
        }

        expect(tryToSerialize).to.throw(TypeError, /functions cannot be serialized/);
    });
});
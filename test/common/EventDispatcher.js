/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals.js');

describe('EventDispatcher', function () {
    'use strict';
    var EventDispatcher = testFixture.requirejs('common/EventDispatcher'),
        expect = testFixture.expect;

    it('should add and remove event listener', function () {
        var eventDispatcher = new EventDispatcher();

        function fn() {
            function eventHandler() {

            }
            eventDispatcher.addEventListener('eventName', eventHandler);
            eventDispatcher.removeAllEventListeners('eventName');
        }

        // TODO: we may need more checks here.
        expect(fn).to.not.throw();
    });
});
/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['addon/AddOnBase'], function (AddOnBase) {

    'use strict';
    var TestAddOn = function (Core, storage, gmeConfig) {
        AddOnBase.call(this, Core, storage, gmeConfig);
    };

    // Prototypal inheritance from AddOnBase.
    TestAddOn.prototype = Object.create(AddOnBase.prototype);
    TestAddOn.prototype.constructor = TestAddOn;


    TestAddOn.prototype.getName = function () {
        return 'TestAddOn';
    };

    TestAddOn.prototype.update = function (root) {
        console.log('TestAddOn', new Date().getTime(), 'update', this.core.getGuid(root), this.core.getHash(root));
    };

    TestAddOn.prototype.query = function (parameters, callback) {
        console.log('TestAddOn', new Date().getTime(), 'query', parameters);
        callback(null, parameters);
    };

    TestAddOn.prototype.stop = function (callback) {
        console.log('TestAddOn', new Date().getTime(), 'stop');
        callback(null);
    };

    TestAddOn.prototype.start = function (parameters, callback) {
        console.log('TestAddOn', new Date().getTime(), 'start');
        AddOnBase.prototype.start.call(this, parameters, callback);
    };

    return TestAddOn;
});
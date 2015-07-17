/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['addon/AddOnBase'], function (AddOnBase) {

    'use strict';
    var TestAddOn = function (Core, storage, gmeConfig, logger, userId) {
        AddOnBase.call(this, Core, storage, gmeConfig, logger, userId);

        this.numUpdates = 0;
    };

    // Prototypal inheritance from AddOnBase.
    TestAddOn.prototype = Object.create(AddOnBase.prototype);
    TestAddOn.prototype.constructor = TestAddOn;


    TestAddOn.prototype.getName = function () {
        return 'TestAddOn';
    };

    TestAddOn.prototype.update = function (root, callback) {
        this.logger.info('TestAddOn', new Date().getTime(), 'update', this.core.getGuid(root), this.core.getHash(root));
        this.numUpdates += 1;
        callback(null);
    };

    TestAddOn.prototype.query = function (parameters, callback) {
        this.logger.info('TestAddOn', new Date().getTime(), 'query', parameters);
        callback(null, parameters, this.numUpdates);
    };

    TestAddOn.prototype.stop = function (callback) {
        var self = this;

        AddOnBase.prototype.stop.call(this, function (err) {
            self.logger.info('TestAddOn', new Date().getTime(), 'stop');
            callback(err);
        });
    };

    //TestAddOn.prototype.start = function (parameters, callback) {
    //    AddOnBase.prototype.start.call(this, parameters, callback);
    //    this.logger.info('TestAddOn', new Date().getTime(), 'start');
    //};

    return TestAddOn;
});
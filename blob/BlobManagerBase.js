/**
 * Created by tkecskes on 4/11/2014.
 */
'use strict';
define([], function () {

    var BlobManagerBase = function () {

    };

    BlobManagerBase.prototype.save = function (info, blob, callback) {
        throw new Error('this function needs to be overridden');
    };

    BlobManagerBase.prototype.load = function (id, callback) {
        throw new Error('this function needs to be overridden');
    };
    BlobManagerBase.prototype.loadInfos = function (query, callback) {
        throw new Error('this function needs to be overridden');
    };

    return BlobManagerBase
});

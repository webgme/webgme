/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/storage/client',
    'common/storage/failsafe',
    'common/storage/cache',
    'common/storage/commit'
], function (Client, Failsafe, Cache, Commit) {

    'use strict';

    function client(options) {
        //return  new Log(new Commit(new Cache(new Failsafe(new Client(options),options),options),options),options);
        return new Commit(new Cache(new Failsafe(new Client(options), options), options), options);
    }

    return client;
});



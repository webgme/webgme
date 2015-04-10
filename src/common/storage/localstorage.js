/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/commit', 'common/storage/local'], function (Commit, Local) {
    'use strict';
    function local(options) {
        return new Commit(new Local(options), options);
    }

    return local;
});

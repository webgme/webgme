/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';
    return {
        HASH: new RegExp('^#[0-9a-zA-Z_]*$'),
        BRANCH: new RegExp('^[0-9a-zA-Z_]*$'),
        GUID: new RegExp('[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}', 'i')
    };
});

/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';
    var HASH = new RegExp('^#[0-9a-zA-Z_]*$'),
        BRANCH = new RegExp('^[0-9a-zA-Z_]*$'),
        RAW_BRANCH = new RegExp('^\\*[0-9a-zA-Z_]*$'),// This is how it's stored in mongodb, i.e. with a prefixed *.
        PROJECT = new RegExp('^(?!system\\.)(?!_)[0-9a-zA-Z_]*$'), // project name may not start with system. or _

        GUID = new RegExp('[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}', 'i');

    return {
        HASH: HASH,
        BRANCH: BRANCH,
        RAW_BRANCH: RAW_BRANCH,
        PROJECT: PROJECT,
        GUID: GUID
    };
});

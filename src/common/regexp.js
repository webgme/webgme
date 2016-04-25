/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';
    var HASH = new RegExp('^#[0-9a-zA-Z_]*$'),
        DB_HASH = new RegExp('^#[0-9a-zA-Z_]{40}$'),
        BRANCH = new RegExp('^[0-9a-zA-Z_]*$'),
        TAG = new RegExp('^[0-9a-zA-Z_]*$'),
        RAW_BRANCH = new RegExp('^\\*[0-9a-zA-Z_]*$'),// This is how it's stored in mongodb, i.e. with a prefixed *.
        PROJECT = new RegExp('^(?!system\\.)(?!_)[0-9a-zA-Z_+]*$'), // project name may not start with system. or _
        DOCUMENT_KEY = new RegExp('^[^(\$|\_)\.][^\.]*$'),//based on the MongoDB requirements (no '.' and no leading $)
        PROJECT_NAME = new RegExp('^[0-9a-zA-Z_]+$'),

        INVALID_CSS_CHARS = new RegExp('[!"#$%&\'()\*\+,\./:;<=>\?@\[\\\]^`{\|}~ ]+', 'g'),
        HTML_ELEMENT = new RegExp('<[a-z][\\s\\S]*>', 'i'),
        GUID = new RegExp('[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}', 'i'),
        BLOB_HASH = new RegExp('^[0-9a-f]{40}$');
    return {
        HASH: HASH,
        DB_HASH: DB_HASH,
        BRANCH: BRANCH,
        TAG: TAG,
        RAW_BRANCH: RAW_BRANCH,
        PROJECT: PROJECT,
        DOCUMENT_KEY: DOCUMENT_KEY,
        GUID: GUID,
        INVALID_CSS_CHARS: INVALID_CSS_CHARS,
        HTML_ELEMENT: HTML_ELEMENT,
        PROJECT_NAME: PROJECT_NAME,
        BLOB_HASH: BLOB_HASH
    };
});

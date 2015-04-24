/*globals define*/
/*jshint browser: true, node:true*/

/**
 * Client module for accessing the blob.
 *
 * @author lattmann / https://github.com/lattmann
 */

define([], function () {
    'use strict';
    var BlobConfig = {
        hashMethod: 'sha1', // TODO: in the future we may switch to sha512
        hashRegex: new RegExp('^[0-9a-f]{40}$')
    };

    return BlobConfig;
});
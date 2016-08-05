/*jshint node:true*/
/**
 * Runs the prepublish script if distribution files does not exist.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var prepublish = require('./prepublish'),
    path = require('path'),
    fs = require('fs'),
    fName = path.join(__dirname, '..', 'dist', 'webgme.dist.build.js'),
    exists = true;

try {
    fs.statSync(fName);
} catch (err) {
    if (err.code === 'ENOENT') {
        exists = false;
    } else {
        console.error(err);
    }
}

if (exists === false) {
    console.log('dist files did not exist, calling prepublish');
    prepublish();
} else {
    console.log('dist files existed, will not build from postinstall');
}

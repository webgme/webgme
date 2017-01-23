/*jshint node:true*/
/**
 * Runs the prepublish script if distribution files does not exist.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var prepublish = require('./prepublish'),
    path = require('path'),
    fs = require('fs'),
    webgmeVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version,
    fName = path.join(__dirname, '..', 'dist', 'webgme.' + webgmeVersion + '.dist.build.js'),
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

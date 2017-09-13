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
    fName = path.join(__dirname, '../src/client/dist/webgme.' + webgmeVersion + '.dist.build.js'),
    distFilesExists = true;

try {
    fs.statSync(fName);
} catch (err) {
    if (err.code === 'ENOENT') {
        distFilesExists = false;
    } else {
        console.error(err);
    }
}

if (distFilesExists === false) {
    console.log('dist files did not exist, will call prepublish');
    prepublish();
} else {
    console.log('dist files existed, will not build from postinstall');
}

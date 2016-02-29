/*jshint node:true*/
/**
 * Arguments passed to this script are propagated to jsdoc.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

if (process.env.TEST_FOLDER) {
    console.warn('TEST_FOLDER environment valiable is set, skipping post install script.');
} else {
    var webgmeBuild = require('./build/webgme.classes/build_classes.js'),
        webgmeDist = require('./build/dist/build.js');

    console.log('Generating webgme.classes.build.js ...');

    webgmeBuild(function (err, data) {
        if (err) {
            console.error('Failed generating webgme.classes.build.js!', err);
        } else {
            //console.log(data);
            console.log('Done with webgme.classes.build.js!');
        }
    });

    console.log('Generating webgme.dist.build.js ...');

    webgmeDist(function (err, data) {
        if (err) {
            console.error('Failed generating webgme.dist.build.js!', err);
        } else {
            //console.log(data);
            console.log('Done with webgme.dist.build.js!');
        }
    });

    console.log('Generating webgme docs/source ...');
    require('jsdoc/jsdoc');
    console.log('Done with webgme docs/source!');
}

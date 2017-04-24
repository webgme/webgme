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
    jsdocConfJson = require('../jsdoc_conf.json'),
    distFilesExists = true,
    jsdocConfPath;

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

    // TODO: Path to the template in the jsdoc.json does not match for npm > 3 when webgme
    // TODO: is installed in another repo.
    try {
        fs.statSync(jsdocConfJson.opts.template);
        console.log('jsdoc template from default config exists');
    } catch (err) {
        if (err.code === 'ENOENT') {
            jsdocConfJson.opts.template = path.join(process.cwd(), '../ink-docstrap/template');
            console.log('jsdoc template from default config did NOT exist! Testing alternative location',
                jsdocConfJson.opts.template);

            try {
                fs.statSync(jsdocConfJson.opts.template);
                jsdocConfPath = path.join(process.cwd(), 'jsdoc_alt_conf.json');
                console.log('alternative location existed, generating alternative configuration', jsdocConfPath);
                fs.writeFileSync(jsdocConfPath, JSON.stringify(jsdocConfJson), 'utf8');

            } catch (err2) {
                if (err.code === 'ENOENT') {
                    console.error('Will not generate source code documentation files!');
                    jsdocConfJson = false;
                } else {
                    console.error(err);
                }
            }
        } else {
            console.error(err);
        }
    }

    prepublish(jsdocConfPath);
} else {
    console.log('dist files existed, will not build from postinstall');
}

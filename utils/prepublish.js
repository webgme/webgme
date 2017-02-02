/*jshint node:true*/
/**
 * Arguments passed to this script are propagated to jsdoc.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

function prepublish() {
    var raml2html = require('raml2html'),
        path = require('path'),
        fs = require('fs'),
        configWithDefaultTemplates = raml2html.getDefaultConfig();

    console.log('Generating REST API docs ...');

    raml2html.render(path.join(__dirname, '..', 'src', 'server', 'api', 'webgme-api.raml'), configWithDefaultTemplates)
        .then(function (indexHtml) {
            fs.writeFileSync(path.join(__dirname, '..', 'docs', 'REST', 'index.html'), indexHtml);
            console.log('Done with REST API docs!');
        }, function (err) {
            console.error('Failed generating REST API docs!', err);
        });

    if (process.env.TEST_FOLDER) {
        console.warn('TEST_FOLDER environment variable is set, skipping distribution scripts.');
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

        if (process.env.SKIP_JS_DOC) {
            // TODO: This is a temporary fix since jsdoc doesn't provide a module to load.
            // TODO: Path to the template in the jsdoc.json does not match for npm > 3 when webgme
            // TODO: is installed in another repo. This does not apply when webgme is published on npm.
            console.warn('SKIP_JS_DOC environment variable is set, skipping docs scripts.');
        } else {
            console.log('Generating webgme docs/source ...');
            require('jsdoc/jsdoc');
            console.log('Done with webgme docs/source!');
        }
    }
}

if (require.main === module) {
    prepublish();
}

module.exports = prepublish;

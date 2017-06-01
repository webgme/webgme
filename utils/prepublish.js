/*jshint node:true*/
/**
 * Arguments passed to this script are propagated to jsdoc.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

function prepublish(jsdocConfigPath) {
    var raml2html = require('raml2html'),
        path = require('path'),
        fs = require('fs'),
        childProcess = require('child_process'),
        bower = require('bower'),
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

        console.log('Installing bower components...');
        bower.commands.install(undefined, undefined, {cwd: process.cwd()})
            .on('end', function (/*installed*/) {
                console.log('Done!');
                console.log('Generating webgme.classes.build.js ...');
                webgmeBuild(function (err/*, data*/) {
                    if (err) {
                        console.error('Failed generating webgme.classes.build.js!', err);
                    } else {
                        //console.log(data);
                        console.log('Done!');
                        console.log('Generating webgme.dist.build.js ...');
                        webgmeDist(function (err/*, data*/) {
                            if (err) {
                                console.error('Failed generating webgme.dist.build.js!', err);
                            } else {
                                //console.log(data);
                                console.log('Done!');
                                if (jsdocConfigPath !== false) {
                                    console.log('Generating webgme source code documentation ...');
                                    childProcess.execFile(process.execPath, [
                                        path.join(__dirname, './jsdoc_build.js'),
                                        '-c', jsdocConfigPath || './jsdoc_conf.json']);
                                    console.log('Done!');
                                }
                            }
                        });
                    }
                });
            })
            .on('error', function (err) {
                console.error(err);
            });
    }
}

if (require.main === module) {
    prepublish();
}

module.exports = prepublish;

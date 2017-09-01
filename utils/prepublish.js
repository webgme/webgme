/*jshint node:true*/
/**
 * Arguments passed to this script are propagated to jsdoc.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

function prepublish() {
    var bower = require('bower');

    console.log('Installing bower components...');
    bower.commands.install(undefined, undefined, {cwd: process.cwd()})
        .on('end', function (/*installed*/) {
            console.log('Done with bower components!');

            if (process.env.TEST_FOLDER) {
                console.warn('TEST_FOLDER environment variable is set, skipping distribution scripts.');
            } else {
                var webgmeDist = require('./build/dist/build.js');

                webgmeDist(function (err/*, data*/) {
                    if (err) {
                        console.error('Failed generating webgme.dist.build.js!', err);
                        process.exit(1);
                    } else {
                        //console.log(data);
                        console.log('Done with webgme.dist.build.js!');
                    }
                });
            }
        })
        .on('error', function (err) {
            console.error(err);
            process.exit(1);
        });
}

if (require.main === module) {
    prepublish();
}

module.exports = prepublish;

/*jshint node:true*/
/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var requirejs = require('requirejs'),
    FS = require('fs'),
    path = FS.readdirSync('./node_modules').indexOf('requirejs') === -1 ?
        '../../requirejs/require' : '../node_modules/requirejs/require',
    config = {
        name: 'webgme.classes',
        out: './dist/webgme.classes.build.js',
        baseUrl: './src',
        paths: {
            'webgme.classes': '../utils/build/webgme.classes/webgme.classes',
            blob: './common/blob',
            executor: './common/executor',
            superagent: './client/lib/superagent/superagent',
            debug: './client/bower_components/visionmedia-debug/dist/debug',
            underscore: './client/bower_components/underscore/underscore',
            q: './client/bower_components/q/q',
            js: './client/js/',
            lib: './client/lib/',
            chance: './client/bower_components/chance/chance',
            'js/Dialogs/PluginConfig/PluginConfigDialog': '../utils/build/empty/empty',
            teststorage: '../teststorage'
        },
        optimize: 'none',
        generateSourceMaps: true,
        insertRequire: ['webgme.classes'],
        wrap: {
            startFile: './utils/build/webgme.classes/start.frag',
            endFile: './utils/build/webgme.classes/end.frag'
        },
        include: [path]
    };

function doBuild(callback) {
    requirejs.optimize(config, function (data) {
        callback(null, data);
    }, function (err) {
        callback(err);
    });
}

if (require.main === module) {
    doBuild(function (err, data) {
        if (err) {
            console.error(err);
        } else {
            console.log(data);
        }
    });
}

module.exports = doBuild;

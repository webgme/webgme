/*globals*/
/*jshint node:true, camelcase:false*/
/**
 *
 *
 * node ./node_modules/requirejs/bin/r.js -o ./utils/build/dist/build.js
 *
 * nodemon -i dist ./node_modules/requirejs/bin/r.js -o ./utils/build/dist/build.js
 *
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var requirejs = require('requirejs'),
    path = require('path'),
    config = {
        baseUrl: path.join(__dirname, '../../../src'),
        paths: {
            js: 'client/js',
            decorators: 'client/decorators',

            assets: 'empty:',

            blob: 'common/blob',
            executor: 'common/executor',

            text: 'client/lib/require/require-text/text',
            css: 'client/bower_components/require-css/css',
            // Temporary fix to ensure that the CSS plugins internal modules are loaded correctly.
            // https://github.com/requirejs/r.js/issues/289
            'css-builder': 'client/bower_components/require-css/css-builder',
            normalize: 'client/bower_components/require-css/normalize',

            q: 'client/bower_components/q/q',
            superagent: 'client/lib/superagent/superagent',
            jszip: 'client/bower_components/jszip/dist/jszip.min',
            debug: 'client/bower_components/visionmedia-debug/dist/debug',
            urlparse: 'client/lib/purl/purl.min',
            underscore: 'client/bower_components/underscore/underscore-min',
            backbone: 'client/bower_components/backbone/backbone',
            moment: 'client/bower_components/moment/min/moment.min',
            d3: 'client/bower_components/d3/d3.min',

            AutoRouterActionApplier: 'client/lib/autorouter/action-applier.min',

            jquery: 'client/bower_components/jquery/dist/jquery.min',
            'jquery-ui': 'client/bower_components/jquery-ui/jquery-ui.min',
            'jquery-ui-iPad': 'empty:',
            'jquery-spectrum': 'client/bower_components/spectrum/spectrum',
            'jquery-csszoom': 'empty:',
            'jquery-fancytree': 'empty:',
            'jquery-layout': 'empty:',
            'jquery-contextMenu': 'client/lib/jquery/jquery.contextMenu.min',
            'jquery-gritter': 'client/bower_components/jquery.gritter/js/jquery.gritter.min',

            bootstrap: 'client/bower_components/bootstrap/dist/js/bootstrap.min',
            'bootstrap-multiselect': 'client/bower_components/bootstrap-multiselect/dist/js/bootstrap-multiselect',
            'bootstrap-notify': 'bower_components/remarkable-bootstrap-notify/dist/bootstrap-notify.min',

            raphaeljs: 'empty:',

            angular: 'client/bower_components/angular/angular.min',
            'angular-ui-bootstrap': 'client/bower_components/angular-bootstrap/ui-bootstrap-tpls.min',
            'isis-ui-components': 'client/bower_components/isis-ui-components/dist/isis-ui-components',
            'isis-ui-components-templates': 'client/bower_components/isis-ui-components/dist/isis-ui-components-templates',
        },
        shim: {
            //'jquery-ui': ['jquery'],
            //'jquery-fancytree': ['jquery-ui'],
            //raphael_svg: ['raphael_core'],
            //raphael_vml: ['raphael_core']
        },
        exclude: ['normalize'],
        packages: [{
            name: 'codemirror',
            location: 'client/bower_components/codemirror',
            main: 'lib/codemirror'
        }],
        include: [
            '../utils/build/dist/includes',
        ],
        out: path.join(__dirname, '../../../dist/webgme.dist.build.js'),
        optimize: 'uglify2',
        //optimize: 'none',
        generateSourceMaps: true,
        preserveLicenseComments: false,
        inlineText: true,
        wrap: {
            startFile: path.join(__dirname, '../../../src/client/js/start.js')
        }
    },
    cssConfig = {
        optimizeCss: 'standard',
        cssIn:  path.join(__dirname, '../../../src/client/css/main.css'),
        out: path.join(__dirname, '../../../dist/webgme.dist.main.css'),
    };

function doBuilds(callback) {
    requirejs.optimize(config, function (data) {
        requirejs.optimize(cssConfig, function (/*res*/) {
            callback(null, data);
        }, function (err) {
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
}

if (require.main === module) {
    doBuilds(function (err, data) {
        if (err) {
            console.error(err);
        } else {
            console.log(data);
        }
    });
}

module.exports = doBuilds;
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
    Q = require('q'),
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

            q: 'empty:',
            superagent: 'empty:',
            jszip: 'empty:',
            debug: 'empty:',
            urlparse: 'empty:',
            underscore: 'empty:',
            chance: 'empty:',
            ravenjs: 'empty:',
            backbone: 'empty:',
            moment: 'empty:',
            blockies: 'empty:',
            d3: 'empty:',
            clipboard: 'empty:',

            AutoRouterActionApplier: 'client/lib/autorouter/action-applier',

            jquery: 'empty:',
            'jquery-ui': 'empty:',
            'jquery-ui-iPad': 'empty:',
            'jquery-spectrum': 'empty:',
            'jquery-csszoom': 'empty:',
            'jquery-fancytree': 'empty:',
            'jquery-layout': 'empty:',
            'jquery-contextMenu': 'empty:',

            bootstrap: 'empty:',
            'bootstrap-multiselect': 'empty:',
            'bootstrap-notify': 'empty:',
            'codemirror': 'empty:',

            raphaeljs: 'empty:',
            epiceditor: 'empty:',

            angular: 'empty:',
            'angular-ui-bootstrap': 'empty:',
            'isis-ui-components': 'empty:',
            'isis-ui-components-templates': 'empty:',
        },
        shim: {
            //'jquery-ui': ['jquery'],
            //'jquery-fancytree': ['jquery-ui'],
            //raphael_svg: ['raphael_core'],
            //raphael_vml: ['raphael_core']
        },
        exclude: ['normalize'],
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
        cssIn: path.join(__dirname, '../../../src/client/css/main.css'),
        out: path.join(__dirname, '../../../dist/webgme.dist.main.css'),
    },
    libConfig = {
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
            jszip: 'client/bower_components/jszip/dist/jszip',
            debug: 'client/bower_components/visionmedia-debug/dist/debug',
            urlparse: 'client/lib/purl/purl.min',
            underscore: 'client/bower_components/underscore/underscore',
            chance: 'client/bower_components/chance/chance',
            ravenjs: 'client/bower_components/raven-js/dist/raven',
            backbone: 'client/bower_components/backbone/backbone',
            moment: 'client/bower_components/moment/moment',
            blockies: 'client/lib/blockies/blockies',
            d3: 'client/bower_components/d3/d3',
            epiceditor: 'client/bower_components/EpicEditor/epiceditor/js/epiceditor',
            clipboard: 'client/bower_components/clipboard/dist/clipboard',

            AutoRouterActionApplier: 'empty:',

            jquery: 'client/bower_components/jquery/dist/jquery',
            'jquery-ui': 'client/bower_components/jquery-ui/jquery-ui',
            'jquery-ui-iPad': 'empty:',
            'jquery-spectrum': 'client/bower_components/spectrum/spectrum',
            'jquery-csszoom': 'empty:',
            'jquery-fancytree': 'empty:',
            'jquery-layout': 'empty:',
            'jquery-contextMenu': 'client/bower_components/jQuery-contextMenu/dist/jquery.contextMenu',

            bootstrap: 'client/bower_components/bootstrap/dist/js/bootstrap',
            'bootstrap-multiselect': 'client/bower_components/bootstrap-multiselect/dist/js/bootstrap-multiselect',
            'bootstrap-notify': 'client/bower_components/remarkable-bootstrap-notify/dist/bootstrap-notify',

            raphaeljs: 'empty:',

            angular: 'client/bower_components/angular/angular',
            'angular-ui-bootstrap': 'client/bower_components/angular-bootstrap/ui-bootstrap-tpls',
            'isis-ui-components': 'client/bower_components/isis-ui-components/dist/isis-ui-components',
            'isis-ui-components-templates': 'client/bower_components/isis-ui-components/dist/isis-ui-components-templates',
        },
        include: [
            '../utils/build/dist/libIncludes',
        ],
        packages: [{
            name: 'codemirror',
            location: 'client/bower_components/codemirror',
            main: 'lib/codemirror'
        }],
        exclude: ['normalize'],
        optimize: 'uglify2',
        preserveLicenseComments: false,
        out: path.join(__dirname, '../../../dist/webgme.lib.build.js')
    };

function doBuilds(callback) {
    var start = Date.now();

    function callOptimizer(theConfig) {
        var deferred = Q.defer();
        requirejs.optimize(theConfig, deferred.resolve, deferred.reject);
        return deferred.promise;
    }

    return Q.all([
        callOptimizer(config),
        callOptimizer(cssConfig),
        callOptimizer(libConfig)
    ])
        .then(function (result) {
            console.log('Build time', (Date.now() - start) / 1000, 's');
            return result;
        })
        .nodeify(callback);
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
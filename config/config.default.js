/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var path = require('path'),
    config = require('webgme-engine/config/config.default');

config.authentication.userManagementPage = require.resolve('webgme-user-management-page');

// Overwrite the appDir from webgme-engine (it only provides a dummy app).
config.client.appDir = path.join(__dirname, '../src/client');

// These client options are added by the webgme app
config.client.appVersion = require(path.join(__dirname, '../package.json')).version;
config.client.defaultConnectionRouter = 'basic3'; //'basic', 'basic2', 'basic3'
config.client.errorReporting = {
                enable: false,
                DSN: '',
                // see https://docs.sentry.io/clients/javascript/config/
                ravenOptions: null // defaults to {release: <webgme-version>}
            };

config.client.allowUserDefinedSVG = true;

// The webgme-engine does not populate any of these
config.visualization.svgDirs = [path.join(__dirname, '../src/client/assets/DecoratorSVG')];
config.visualization.decoratorPaths = [path.join(__dirname, '../src/client/decorators')];
config.visualization.visualizerDescriptors = [path.join(__dirname, '../src/client/js/Visualizers.json')];
config.visualization.panelPaths = [path.join(__dirname, '../src/client/js/Panels')];
config.visualization.layout.basePaths = [path.join(__dirname, '../src/client/js/Layouts')];

module.exports = config;

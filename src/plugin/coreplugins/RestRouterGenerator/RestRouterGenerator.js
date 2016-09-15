/*globals define*/
/*jshint node:true, browser:true*/
/**
 * Plugin for generating AddOns.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:AddOnGenerator
 */

define([
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/ejs',
    'text!./RestRouter.ejs',
    'text!./RestRouterTest.ejs'
], function (
    PluginBase,
    pluginMetadata,
    ejs,
    ROUTER_TEMPLATE,
    TEST_TEMPLATE
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function RestRouterGenerator() {
        // Call base class's constructor
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;

        this.currentConfig = null;
        this.outputDir = '';
        this.filesToAdd = {};
    }

    RestRouterGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    RestRouterGenerator.prototype = Object.create(PluginBase.prototype);
    RestRouterGenerator.prototype.constructor = RestRouterGenerator;

    RestRouterGenerator.prototype.main = function (callback) {
        var self = this,
            restRouterFile,
            restRouterTest,
            artifact;

        // Get and log the configuration which will be appended to and used in the templates.
        self.currentConfig = self.getCurrentConfig();
        self.logger.info('Current configuration');
        self.logger.info(JSON.stringify(self.currentConfig, null, 4));

        // Update date, projectName and paths
        self.currentConfig.date = new Date();
        self.currentConfig.projectName = self.projectName;
        self.currentConfig.version = self.getVersion();

        // Add the RestRouterGenerator file.
        restRouterFile = self.outputDir + self.currentConfig.restRouterName + '.js';
        restRouterTest = self.outputDir + self.currentConfig.restRouterName + '.spec.js';

        self.filesToAdd[restRouterFile] = ejs.render(ROUTER_TEMPLATE, self.currentConfig);
        self.filesToAdd[restRouterTest] = ejs.render(TEST_TEMPLATE, self.currentConfig);

        self.logger.debug(JSON.stringify(self.filesToAdd, null, 4));
        artifact = self.blobClient.createArtifact('RestRouterFiles');

        artifact.addFiles(self.filesToAdd, function (err, hashes) {
            if (err) {
                callback(new Error(err), self.result);
                return;
            }

            self.logger.debug(hashes);

            self.blobClient.saveAllArtifacts(function (err, hashes) {
                if (err) {
                    callback(new Error(err), self.result);
                    return;
                }
                self.result.addArtifact(hashes[0]);

                self.createMessage(null, 'Extract the RestRouterFiles.zip in your repository.');
                self.createMessage(null, 'See instructions in the generated file.');

                self.logger.debug('Artifacts are saved here: ' + hashes.toString());

                self.result.setSuccess(true);
                callback(null, self.result);
            });
        });
    };

    return RestRouterGenerator;
});

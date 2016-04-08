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
    'plugin/AddOnGenerator/AddOnGenerator/Templates/Templates'
], function (PluginBase, pluginMetadata, ejs, TEMPLATES) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function AddOnGenerator() {
        // Call base class's constructor
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;

        this.currentConfig = null;
        this.addOnDir = '';
        this.testDir = '';
        this.filesToAdd = {};
    }

    AddOnGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    AddOnGenerator.prototype = Object.create(PluginBase.prototype);
    AddOnGenerator.prototype.constructor = AddOnGenerator;

    AddOnGenerator.prototype.main = function (callback) {
        var self = this,
            addOnFileName,
            dirCommon,
            artifact;

        // Get and log the configuration which will be appended to and used in the templates.
        self.currentConfig = self.getCurrentConfig();
        self.logger.info('Current configuration');
        self.logger.info(JSON.stringify(self.currentConfig, null, 4));

        // Update date, projectName and paths
        self.currentConfig.date = new Date();
        self.currentConfig.projectName = self.projectName;
        self.currentConfig.version = self.getVersion();
        dirCommon = '/addOns/' + self.projectName + '/' + self.currentConfig.addOnId + '/';
        self.addOnDir = 'src' + dirCommon;
        self.testDir = 'test' + dirCommon;

        // Add the addOn file.
        addOnFileName = self.addOnDir + self.currentConfig.addOnId + '.js';
        self.filesToAdd[addOnFileName] = ejs.render(TEMPLATES['addOn.js.ejs'], self.currentConfig);

        self.logger.debug(JSON.stringify(self.filesToAdd, null, 4));
        artifact = self.blobClient.createArtifact('addOnFiles');


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

                self.createMessage(null, 'Extract the addOnFiles.zip in your repository.');
                self.createMessage(null, 'Append "' + './src/addOns/' + self.projectName +
                '" to "addOnBasePaths" in gmeConfig.');
                self.createMessage(self.rootNode, 'Select the root-node and add ' +
                self.currentConfig.addOnId + ' to the usedAddOns registry under the META tab (separate with spaces).');

                if (self.currentConfig.test) {
                    self.createMessage(null, 'For the necessary test setup and more examples of how ' +
                    'to write tests see https://github.com/webgme/webgme-boilerplate.');
                }

                self.logger.debug('Artifacts are saved here: ' + hashes.toString());

                self.result.setSuccess(true);
                callback(null, self.result);
            });
        });
    };

    return AddOnGenerator;
});

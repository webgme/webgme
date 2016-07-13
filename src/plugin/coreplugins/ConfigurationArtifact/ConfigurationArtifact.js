/*globals define*/
/*jshint node: true, browser: true*/

/**
 * Simple plugin illustrating how to configure a configuration for the plugin and how to generate
 * and return artifacts from a plugin.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:ConfigurationArtifact
 */

define([
    'plugin/PluginBase',
    'text!./metadata.json',
    'text!./Damper.xml',
], function (PluginBase, pluginMetadata, xmlContent) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ConfigurationArtifact.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ConfigurationArtifact.
     * @constructor
     */
    function ConfigurationArtifact() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ConfigurationArtifact.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ConfigurationArtifact.prototype = Object.create(PluginBase.prototype);
    ConfigurationArtifact.prototype.constructor = ConfigurationArtifact;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ConfigurationArtifact.prototype.main = function (callback) {
        var self = this,
            currentConfig = self.getCurrentConfig(),
            artifact,
            filesToAdd;

        self.logger.info('Current configuration ' + JSON.stringify(currentConfig, null, 4));
        self.logger.info('Animal Species = ' + currentConfig.species);
        self.logger.info('Age            = ' + currentConfig.age.toString());
        self.logger.info('Carnivore      = ' + currentConfig.carnivore.toString());
        self.logger.info('Classification = ' + currentConfig.classification);
        self.logger.info('Color          = ' + currentConfig.color);
        self.logger.info('File           = ' + currentConfig.file);

        self.createMessage(self.activeNode, 'Links to activeNode unless plugin is invoked from the rootNode');

        artifact = self.blobClient.createArtifact('generatedfiles');
        filesToAdd = {
            'anXMLFile.xml': xmlContent,
            'aJSONFile.json': JSON.stringify({a: 1, b: 2}, null, 4),
            'aTextFile.txt': 'This is a text file.'
        };

        self.sendNotification('Configuration Artifact Running', function (err) {
            if (err) {
                self.logger.error('Failed sending notification');
            }
            self.sendNotification({
                message: 'This will go to everybody watching the branch "' + self.branchName + '"' +
                ' if running on the server.',
                toBranch: true
            }, function (err) {
                if (err) {
                    self.logger.error('Failed sending notification');
                }
                artifact.addFiles(filesToAdd)
                    .then(function (hashes) {
                        self.logger.info('Files (metadata) have hashes: ' + hashes.toString());

                        return artifact.save();
                    })
                    .then(function (artifactHash) {
                        self.logger.info('Artifact (metadata) has hash: ' + artifactHash);
                        self.result.setSuccess(true);
                        self.result.addArtifact(artifactHash);
                        callback(null, self.result);
                    })
                    .catch(function (err) {
                        self.result.setSuccess(false);
                        callback(err, self.result);
                    });
            });
        });
    };

    return ConfigurationArtifact;
});
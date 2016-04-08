/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Plugin for generating layouts.
 * @author brollb / https://github.com/brollb
 * @module CorePlugins:LayoutGenerator
 */

define([
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/ejs',
    'plugin/LayoutGenerator/LayoutGenerator/Templates/Templates'
], function (
    PluginBase,
    pluginMetadata,
    ejs,
    TEMPLATES) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of LayoutGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin LayoutGenerator.
     * @constructor
     */
    function LayoutGenerator() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    LayoutGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    LayoutGenerator.prototype = Object.create(PluginBase.prototype);
    LayoutGenerator.prototype.constructor = LayoutGenerator;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    LayoutGenerator.prototype.main = function (callback) {
        var self = this,
            content,
            artifact,
            count,
            files,
            file,
            filePath,
            getFilePath,
            onAddFile = function (err) {
                if (err) {
                    callback(err, self.result);
                    return;
                }
                if (--count === 0) {
                    self.blobClient.saveAllArtifacts(function (err, hashes) {
                        if (err) {
                            callback(err, self.result);
                            return;
                        }
                        // Layout instructions
                        self.createMessage(null, 'Extract the layoutFiles.zip' +
                            ' in your repository root.');
                        self.createMessage(null, 'Set "config.visualization.layout.default" to "'+content.layoutID+'"');
                        self.createMessage(null, 'Reload the browser and server to use the new layout');

                        self.result.addArtifact(hashes[0]);
                        self.logger.info('Artifacts are saved here: ' + hashes.toString());
                        self.result.setSuccess(true);
                        callback(null, self.result);
                    });
                }
            };

        // Create the content used in the template files
        content = self.getCurrentConfig();
        content.date = new Date();
        content.version = this.getVersion();

        getFilePath = LayoutGenerator.getFilePath.bind(null, content.layoutID);

        files = Object.keys(TEMPLATES);
        count = files.length;
        artifact = self.blobClient.createArtifact('layoutFiles');
        for (var i = files.length; i--;) {
            file = ejs.render(TEMPLATES[files[i]], content);
            filePath = getFilePath(files[i]);
            artifact.addFile(filePath, file, onAddFile);
        }

    };

    LayoutGenerator.getFilePath = function (layoutName, fileName) {
        var baseUrl = 'src/client/js/Layouts/'+layoutName;

        // Create the appropriate file name
        fileName = fileName.replace(/\.ejs$/, '');
        fileName = fileName.replace(/Layout/g, layoutName);

        return [baseUrl, fileName].join('/');
    };

    return LayoutGenerator;
});

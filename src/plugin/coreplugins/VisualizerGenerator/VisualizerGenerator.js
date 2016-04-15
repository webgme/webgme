/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Plugin for generating visualizers.
 * @author brollb / https://github.com/brollb
 * @module CorePlugins:VisualizerGenerator
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/ejs',
    'plugin/VisualizerGenerator/VisualizerGenerator/Templates/Templates'
], function (
    PluginConfig,
    PluginBase,
    pluginMetadata,
    ejs,
    TEMPLATES) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of VisualizerGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin VisualizerGenerator.
     * @constructor
     */
    function VisualizerGenerator() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    VisualizerGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    VisualizerGenerator.prototype = Object.create(PluginBase.prototype);
    VisualizerGenerator.prototype.constructor = VisualizerGenerator;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    VisualizerGenerator.prototype.main = function (callback) {
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
                        // Visualizer instructions
                        self.createMessage(null, 'Extract the visualizerFiles.zip' +
                            ' in your repository root.');
                        self.createMessage(null, 'Add the visualizer entry to ' +
                            'src/client/js/Visualizers.json');
                        self.createMessage(null, 'Set the path of the visualizer ' +
                            'entry to "js/Panels/' + content.visualizerID + '/' + 
                            content.visualizerID + 'Panel"');
                        self.createMessage(self.rootNode, 'Select the root-node and add ' +
                            content.visualizerID + ' to the validVisualizers attribute '+
                            '(separate with spaces) to enable the visualizer for the current ' +
                            'project');
                        self.createMessage(null, 'Refresh the browser to update the ' +
                            'available visualizers');

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
        content.widgetClass = VisualizerGenerator.toDashed(content.visualizerID);

        getFilePath = VisualizerGenerator.getFilePath.bind(null, content.visualizerID);

        files = Object.keys(TEMPLATES);
        count = files.length;
        artifact = self.blobClient.createArtifact('visualizerFiles');
        for (var i = files.length; i--;) {
            file = ejs.render(TEMPLATES[files[i]], content);
            filePath = getFilePath(files[i]);
            artifact.addFile(filePath, file, onAddFile);
        }

    };

    VisualizerGenerator.getFilePath = function (visName, fileName) {
        var fileToDir = {
                Control: 'Panels',
                Panel: 'Panels',
                Widget: 'Widgets'
            },
            baseUrl = 'src/client/js',
            baseName,
            ext,
            extRegex = /\.[\w]+$/,
            path;

        // Get the original extension (second to last)
        ext = fileName.replace(extRegex, '').match(extRegex);

        // Get the base name and capitalize it
        baseName = fileName.match(/^[\w\d_]*/)[0];
        baseName = baseName.substring(0,1).toUpperCase()+baseName.substring(1);

        // Put it in a visName directory then in Panels or Widgets
        if (baseName === 'Styles') {
            fileName = visName+'Widget'+ext;
            path = [baseUrl, 'Widgets', visName, 'styles', fileName].join('/');
        } else {
            fileName = visName+baseName+ext;
            path = [baseUrl, fileToDir[baseName], visName, fileName].join('/');
        }

        return path;
    };

    VisualizerGenerator.toDashed = function(camelCase) {
        var index;

        // Convert first character to lowercase
        camelCase = camelCase.substring(0,1).toLowerCase()+camelCase.substring(1);

        // Convert each capital letter to '-'+\L
        index = camelCase.search(/[A-Z]+/);
        while (index > -1) {
            camelCase = camelCase.substring(0, index) + '-' + 
                camelCase.substring(index, index+1).toLowerCase() + 
                camelCase.substring(index+1);

            index = camelCase.search(/[A-Z]+/);
        }
        return camelCase;
    };

    return VisualizerGenerator;
});

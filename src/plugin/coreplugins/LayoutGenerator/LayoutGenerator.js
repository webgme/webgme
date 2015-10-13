/*globals define*/
/*jshint node:true, browser:true*/

/**
 * @author brollb / https://github.com/brollb
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'common/util/ejs',
    'plugin/LayoutGenerator/LayoutGenerator/Templates/Templates'
], function (
    PluginConfig,
    PluginBase,
    ejs,
    TEMPLATES) {
    'use strict';

    /**
     * Initializes a new instance of LayoutGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin LayoutGenerator.
     * @constructor
     */
    var LayoutGenerator = function () {
        // Call base class' constructor.
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    LayoutGenerator.prototype = Object.create(PluginBase.prototype);
    LayoutGenerator.prototype.constructor = LayoutGenerator;

    /**
     * Gets the name of the LayoutGenerator.
     * @returns {string} The name of the plugin.
     * @public
     */
    LayoutGenerator.prototype.getName = function () {
        return 'Layout Generator';
    };

    /**
     * Gets the semantic version (semver.org) of the LayoutGenerator.
     * @returns {string} The version of the plugin.
     * @public
     */
    LayoutGenerator.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the configuration structure for the LayoutGenerator.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    LayoutGenerator.prototype.getConfigStructure = function () {
        return [
            {
                name: 'layoutID',
                displayName: 'Layout ID',
                regex: '^[a-zA-Z]+$',
                regexMessage: 'Name can only contain English characters (use camelcase)!',
                value: 'MyCustomLayout',
                valueType: 'string',
                readOnly: false
            }
        ];
    };


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

/*globals define*/
/*jshint node:true, browser:true*/
/**
 * Plugin for generating AddOns.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'common/util/ejs',
    'plugin/PluginGenerator/PluginGenerator/Templates/Templates'
], function (PluginConfig, PluginBase, ejs, TEMPLATES) {
    'use strict';

    var AddOnGenerator = function () {
        // Call base class's constructor
        PluginBase.call(this);
        this.currentConfig = null;
        this.pluginDir = '';
        this.testDir = '';
        this.filesToAdd = {};
    };

    AddOnGenerator.prototype = Object.create(PluginBase.prototype);

    AddOnGenerator.prototype.constructor = AddOnGenerator;

    AddOnGenerator.prototype.getName = function () {
        return 'Plugin Generator';
    };

    AddOnGenerator.prototype.getVersion = function () {
        return '1.0.0';
    };

    AddOnGenerator.prototype.getConfigStructure = function () {
        return [
            {
                name: 'addOnId',
                displayName: 'Unique add-on identifier',
                regex: '^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void' +
                '|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|' +
                'static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|' +
                'arguments|interface|protected|implements|instanceof)$)[a-zA-Z_$][0-9a-zA-Z_$]*',
                regexMessage: 'No spaces and special characters allowed. This value is used as the name of the ' +
                'generated add-on class.',
                description: 'Unique ID for the plugin.',
                value: 'NewAddOn',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'addOnName',
                displayName: 'Name',
                description: 'Short readable add-on name; spaces are allowed',
                value: 'New AddOn',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'description',
                displayName: 'Description',
                description: 'Optional description of the addOn.',
                value: '',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'queryParamsStructure',
                displayName: 'Include Query Parameters Structure.',
                description: 'Query Parameters structure will populate the GUI with controls.',
                value: false,
                valueType: 'boolean',
                readOnly: true
            }
        ];
    };

    AddOnGenerator.prototype.main = function (callback) {
        var self = this,
            pluginFileContent,
            pluginFileName,
            dirCommon,
            i,
            nbrOfFiles,
            fileKeys,
            error = '',
            artifact;

        // Get and log the configuration which will be appended to and used in the templates.
        self.currentConfig = self.getCurrentConfig();
        self.logger.info('Current configuration');
        self.logger.info(JSON.stringify(self.currentConfig, null, 4));

        // Update date, projectName and paths
        self.currentConfig.date = new Date();
        self.currentConfig.projectName = self.projectName;
        self.currentConfig.version = self.getVersion();
        dirCommon = '/plugins/' + self.projectName + '/' + self.currentConfig.pluginID + '/';
        self.pluginDir = 'src' + dirCommon;
        self.testDir = 'test' + dirCommon;

        // Add test file if requested.
        if (self.currentConfig.test) {
            self.filesToAdd[self.testDir + self.currentConfig.pluginID + '.spec.js'] =
                ejs.render(TEMPLATES['unit_test.js.ejs'], self.currentConfig);
        }
        self.addTemplateFile();
        if (self.currentConfig.meta) {
            self.addMetaFile();
        }
        // Add the plugin file.
        pluginFileContent = ejs.render(TEMPLATES['plugin.js.ejs'], self.currentConfig);
        pluginFileName = self.pluginDir + self.currentConfig.pluginID + '.js';
        self.filesToAdd[pluginFileName] = pluginFileContent;


        // Add the file at the end.
        self.logger.info(JSON.stringify(self.filesToAdd, null, 4));
        fileKeys = Object.keys(self.filesToAdd);
        nbrOfFiles = fileKeys.length;
        artifact = self.blobClient.createArtifact('pluginFiles');

        function addFileByFile(fileKey, fileToAdd) {
            artifact.addFile(fileKey, fileToAdd, function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                self.logger.debug(fileKey, hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        callback('Something went wrong when adding files: ' + error, self.result);
                        return;
                    }
                    self.blobClient.saveAllArtifacts(function (err, hashes) {
                        if (err) {
                            callback(err, self.result);
                            return;
                        }
                        self.result.addArtifact(hashes[0]);
                        self.createMessage(null, 'Extract the pluginFiles.zip in your repository.');
                        self.createMessage(null, 'Append "' + './src/plugins/' + self.projectName +
                        '" to "pluginBasePaths" in config.js.');
                        self.createMessage(self.rootNode, 'Select the root-node and add ' +
                        self.currentConfig.pluginID + ' to the validPlugins attribute (separate with spaces).');
                        if (self.currentConfig.test) {
                            self.createMessage(null, 'For the necessary test setup and more examples of how ' +
                            'to write tests see https://github.com/webgme/webgme-boilerplate.');
                        }
                        self.logger.info('Artifacts are saved here: ' + hashes.toString());

                        self.result.setSuccess(true);
                        callback(null, self.result);
                    });
                }
            });
        }

        for (i = 0; i < fileKeys.length; i += 1) {
            addFileByFile(fileKeys[i], self.filesToAdd[fileKeys[i]]);
        }
    };

    return AddOnGenerator;
});
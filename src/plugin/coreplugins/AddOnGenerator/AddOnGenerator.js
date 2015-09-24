/*globals define*/
/*jshint node:true, browser:true*/
/**
 * Plugin for generating AddOns.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'plugin/PluginBase',
    'common/util/ejs',
    'plugin/AddOnGenerator/AddOnGenerator/Templates/Templates'
], function (PluginBase, ejs, TEMPLATES) {
    'use strict';

    var AddOnGenerator = function () {
        // Call base class's constructor
        PluginBase.call(this);
        this.currentConfig = null;
        this.addOnDir = '';
        this.testDir = '';
        this.filesToAdd = {};
    };

    AddOnGenerator.prototype = Object.create(PluginBase.prototype);

    AddOnGenerator.prototype.constructor = AddOnGenerator;

    AddOnGenerator.prototype.getName = function () {
        return 'AddOn Generator';
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
                description: 'Unique ID for the add-On.',
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
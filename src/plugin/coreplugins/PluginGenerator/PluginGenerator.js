/*globals define*/
/*jshint node:true, browser:true*/
/**
 * Plugin for generating other plugins.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @author lattmann / https://github.com/lattmann
 * @module CorePlugins:PluginGenerator
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'common/util/ejs',
    'plugin/PluginGenerator/PluginGenerator/Templates/Templates'
], function (PluginConfig, PluginBase, ejs, TEMPLATES) {
    'use strict';

    var PluginGenerator = function () {
        // Call base class's constructor
        PluginBase.call(this);
        this.currentConfig = null;
        this.pluginDir = '';
        this.testDir = '';
        this.filesToAdd = {};
    };

    PluginGenerator.prototype = Object.create(PluginBase.prototype);

    PluginGenerator.prototype.constructor = PluginGenerator;

    PluginGenerator.prototype.getName = function () {
        return 'Plugin Generator';
    };

    PluginGenerator.prototype.getVersion = function () {
        return '0.14.0';
    };

    PluginGenerator.prototype.getConfigStructure = function () {
        return [
            {
                name: 'pluginID',
                displayName: 'Unique plugin identifier',
                regex: '^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void' +
                '|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|' +
                'static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|' +
                'arguments|interface|protected|implements|instanceof)$)[a-zA-Z_$][0-9a-zA-Z_$]*',
                regexMessage: 'No spaces and special characters allowed. This value is used as the name of the ' +
                'generated plugin class.',
                description: 'Unique ID for the plugin.',
                value: 'NewPlugin',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'pluginName',
                displayName: 'Name',
                description: 'Short readable plugin name; spaces are allowed',
                value: 'New Plugin',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'description',
                displayName: 'Description',
                description: 'Optional description of the plugin.',
                value: '',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'test',
                displayName: 'Include testing script',
                description: 'Generate template for unit-tests.',
                value: true,
                valueType: 'boolean',
                readOnly: false
            },
            {
                name: 'templateType',
                displayName: 'Example template',
                description: 'Ejs template for code generation, also illustrates how to save' +
                ' artifacts using the blobClient.',
                value: 'None',
                valueType: 'string',
                valueItems: [
                    'None',
                    'JavaScript',
                    'Python',
                    'CSharp'
                ],
                readOnly: false
            },
            {
                name: 'configStructure',
                displayName: 'Include Configuration Structure.',
                description: 'Configuration structure will populate this GUI with controls.',
                value: false,
                valueType: 'boolean',
                readOnly: false
            },
            {
                name: 'meta',
                displayName: 'Generate META',
                description: 'Generates a static listing of the meta objects to facilitate coding.',
                value: true,
                valueType: 'boolean',
                readOnly: false
            }
        ];
    };

    PluginGenerator.prototype.main = function (callback) {
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
                        self.currentConfig.pluginID + ' to the validPlugins under the META tab (separate with spaces).');
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

    PluginGenerator.prototype.addMetaFile = function () {
        var self = this,
            i,
            metaNodes = [],
            names = Object.keys(self.META),
            nodeData,
            nodeDataType = {
                name: null,
                path: null
            },
            compare = function (a, b) {
                return a.name.localeCompare(b.name);
            };
        // Get all the names and paths for the meta nodes.
        for (i = 0; i < names.length; i += 1) {
            nodeData = Object.create(nodeDataType);
            nodeData.name = names[i];
            nodeData.path = self.core.getPath(self.META[names[i]]);
            metaNodes.push(nodeData);
        }
        // When done sort them by names.
        metaNodes.sort(compare);
        self.filesToAdd[self.pluginDir + 'meta.js'] = ejs.render(TEMPLATES['meta.js.ejs'], {
            metaNodes: metaNodes,
            date: self.currentConfig.date,
            version: self.currentConfig.version
        });
    };

    PluginGenerator.prototype.addTemplateFile = function () {
        var self = this,
            fileName,
            fileContent;

        if (self.currentConfig.templateType === 'Python') {
            self.currentConfig.templateExt = 'py';
            fileName = self.pluginDir + 'Templates/Python.py.ejs';
            fileContent = 'print "<%=a%> and <%=b%> provided."';
        } else if (self.currentConfig.templateType === 'CSharp') {
            self.currentConfig.templateExt = 'cs';
            fileName = self.pluginDir + 'Templates/CSharp.cs.ejs';
            fileContent = 'using System;\nnamespace Hey {\n\tclass Hi {\n\t\tstatic void Main()' +
            ' {\n\t\t\tConsole.WriteLine("<%=a%> and <%=b%> provided.");\n\t\t}\n\t}\n}';
        } else if (self.currentConfig.templateType === 'JavaScript') {
            self.currentConfig.templateExt = 'js';
            fileName = self.pluginDir + 'Templates/JavaScript.js.ejs';
            fileContent = 'console.info("<%=a%> and <%=b%> provided.);"';
        } else {
            self.currentConfig.templateType = null;
        }

        if (self.currentConfig.templateType) {
            self.filesToAdd[fileName] = fileContent;
            self.filesToAdd[self.pluginDir + 'Templates/combine_templates.js'] =
                ejs.render(TEMPLATES['combine_templates.js.ejs'], self.currentConfig);
        }
    };

    return PluginGenerator;
});
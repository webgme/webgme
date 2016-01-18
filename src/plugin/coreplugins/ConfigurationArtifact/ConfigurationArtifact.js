/*globals define*/
/*jshint node: true, browser: true*/

/**
 * Simple plugin illustrating how to configure a configuration for the plugin and how to generate
 * and return artifacts from a plugin.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:ConfigurationArtifact
 */

define(['plugin/PluginConfig', 'plugin/PluginBase'], function (PluginConfig, PluginBase) {
    'use strict';

    /**
     * Initializes a new instance of ConfigurationArtifact.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ConfigurationArtifact.
     * @constructor
     */
    var ConfigurationArtifact = function () {
        // Call base class' constructor.
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    ConfigurationArtifact.prototype = Object.create(PluginBase.prototype);
    ConfigurationArtifact.prototype.constructor = ConfigurationArtifact;

    /**
     * Gets the name of the ConfigurationArtifact.
     * @returns {string} The name of the plugin.
     * @public
     */
    ConfigurationArtifact.prototype.getName = function () {
        return 'Configuration and Artifacts';
    };

    /**
     * Gets the semantic version (semver.org) of the ConfigurationArtifact.
     * @returns {string} The version of the plugin.
     * @public
     */
    ConfigurationArtifact.prototype.getVersion = function () {
        return '1.0.0';
    };

    /**
     * Gets the configuration structure for the ConfigurationArtifact.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    ConfigurationArtifact.prototype.getConfigStructure = function () {
        return [
            {
                'name': 'species',
                'displayName': 'Animal Species',
                'regex': '^[a-zA-Z]+$',
                'regexMessage': 'Name can only contain English characters!',
                'description': 'Which species does the animal belong to.',
                'value': 'Horse',
                'valueType': 'string',
                'readOnly': false
            },
            {
                'name': 'age',
                'displayName': 'Age',
                'description': 'How old is the animal.',
                'value': 3,
                'valueType': 'number',
                'minValue': 0,
                'maxValue': 10000,
                'readOnly': false
            },
            {
                'name': 'carnivore',
                'displayName': 'Carnivore',
                'description': 'Does the animal eat other animals?',
                'value': false,
                'valueType': 'boolean',
                'readOnly': false
            },
            {
                'name': 'classification',
                'displayName': 'Classification',
                'description': '',
                'value': 'Vertebrates',
                'valueType': 'string',
                'valueItems': [
                    'Vertebrates',
                    'Invertebrates',
                    'Unknown'
                ]
            },
            {
                'name': 'color',
                'displayName': 'Color',
                'description': 'The hex color code for the animal.',
                'readOnly': false,
                'value': '#FF0000',
                'regex': '^#([A-Fa-f0-9]{6})$',
                'valueType': 'string'
            },
            {
                'name': 'file',
                'displayName': 'File',
                'description': '',
                'value': '',
                'valueType': 'asset',
                'readOnly': false
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
            'anXMLFile.xml': self.getDefaultXmlString(),
            'aJSONFile.json': JSON.stringify({a: 1, b: 2}, null, 4),
            'aTextFile.txt': 'This is a text file.'
        };

        artifact.addFiles(filesToAdd, function (err, hashes) {
            if (err) {
                self.result.setSuccess(false);
                callback('Could not add files : err' + err.toString(), self.result);
                return;
            }
            self.logger.info('Files (meta-data) have hashes: ' + hashes.toString());
            artifact.save(function (err, hash) {
                if (err) {
                    self.result.setSuccess(false);
                    callback('Could not save artifact : err' + err.toString(), self.result);
                    return;
                }
                self.logger.info('Artifact (meta-data) has hash: ' + hash);
                self.result.setSuccess(true);
                self.result.addArtifact(hash);
                callback(null, self.result);
            });
        });
    };

    /**
     * Returns a simplified adm xml. Used when there is no asset provided or the given xml could not be
     * converted to a json.
     * @returns {string} - an xml string.
     */
    ConfigurationArtifact.prototype.getDefaultXmlString = function () {
        return '<?xml version="1.0"?>' +
            '<Design DesignID="{a5984898-4825-4a99-9323-9c8d50bde534}" Name="Wheel">' +
            '  <RootContainer Name="Wheel">' +
            '    <Property Name="DamperCoeff">' +
            '      <Value DimensionType="Scalar" DataType="String">' +
            '        <ValueExpression type="FixedValue">' +
            '          <Value>2</Value>' +
            '        </ValueExpression>' +
            '      </Value>' +
            '    </Property>' +
            '    <ComponentInstance Name="Inertia" ID="{b2a8a8a7-d528-4bf0-8b09-83775cb339ff}">' +
            '      <PrimitivePropertyInstance IDinComponentModel="id-b59c60e6-cf92-4828-b087-ac9ef4b6aae3">' +
            '        <Value DataType="String" />' +
            '      </PrimitivePropertyInstance>' +
            '      <ConnectorInstance ID="' +
            '{b2a8a8a7-d528-4bf0-8b09-83775cb339ff}-3abe6223-70d3-42ec-815b-f21f3c08c2b3"/>' +
            '    </ComponentInstance>' +
            '    <Connector Name="WheelRotationalInput" ID="2f20ec5e-b1d7-4a0b-9cab-424fb45bb13d"/>' +
            '    <Connector Name="WheelTranslationalOutput" ID="f9f60d89-6f29-4391-a539-82b2841f8107"/>' +
            '  </RootContainer>' +
            '</Design>';
    };

    return ConfigurationArtifact;
});
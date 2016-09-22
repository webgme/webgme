/*globals define*/
/*jshint node:true, browser:true*/

/**
 *
 * Hard Limitations:
 *  - paradigm cannot have an object named FCO
 *  - roles are not imported
 *  - kinds are used all the time instead of roles
 *  - constraints are not imported
 *  - cardinality information is not imported
 *  - if an object is a port in at least one aspect it becomes a port globally in ALL models and in ALL aspects
 *
 *
 * Soft limitations: (could be implemented in a certain extent)
 *  - aspects are not imported
 *  - no visual properties are imported
 *
 * @author lattmann / https://github.com/lattmann
 * @module CorePlugins:MetaGMEParadigmImporter
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/xmljsonconverter',
    'common/util/guid'
], function (PluginConfig, PluginBase, pluginMetadata, Converters, GUID) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of MetaGMEParadigmImporter.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin MetaGMEParadigmImporter.
     * @constructor
     */
    var MetaGMEParadigmImporter = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    MetaGMEParadigmImporter.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    MetaGMEParadigmImporter.prototype = Object.create(PluginBase.prototype);
    MetaGMEParadigmImporter.prototype.constructor = MetaGMEParadigmImporter;


    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    MetaGMEParadigmImporter.prototype.main = function (callback) {
        var self = this,
            config = self.getCurrentConfig(),
            xml2json = new Converters.Xml2json({
                skipWSText: true,
                arrayElements: {
                    attrdef: true,
                    folder: true,
                    atom: true,
                    connection: true,
                    model: true,
                    set: true,
                    reference: true,
                    aspect: true,
                    part: true,
                    role: true,
                    constraint: true,
                    pointerspec: true,
                    pointeritem: true,
                    regnode: true,
                    enumitem: true
                    //TODO: Complete this list
                }
            }),
            xmpData;

        self.logger.debug('Checking configuration');

        if (!config.xmpFile) {
            self.createMessage(null, 'An XMP file must be provided.', 'error');
            callback(null, self.result);
            return;
        }

        self.logger.debug('Getting xmp file content');
        self.sendNotification('Getting xmp file');

        self.blobClient.getObject(config.xmpFile, function (err, xmlArrayBuffer) {
            var error;

            if (err) {
                callback(err, self.result);
                return;
            }

            self.logger.debug('Got xmp file content, converting it to json');
            if (typeof xmlArrayBuffer === 'string') {
                xmpData = xml2json.convertFromString(xmlArrayBuffer);
            } else {
                xmpData = xml2json.convertFromBuffer(xmlArrayBuffer);
            }

            self.sendNotification({message: 'Got xmp file content, processing data...', progress: 10});
            error = self.processParadigm(xmpData);

            if (error) {
                self.result.setSuccess(false);
                self.result.setError(error.message);
                callback(error.stack, self.result);
                return;
            }

            self.sendNotification({message: 'Data processed, saving model', progress: 60});
            self.save('Imported meta model ' + xmpData.paradigm['@name'], function (err) {
                if (err) {
                    self.result.setSuccess(false);
                    self.result.setError(err);
                }
                self.sendNotification({message: 'Model saved, plugin done', progress: 100, severity: 'success'});
                callback(null, self.result);
            });
        });
    };

    MetaGMEParadigmImporter.prototype.processParadigm = function (xmpData) {
        var self = this,
            paradigm,
            rootFolder,
            error,
            i,
            attrdef;

        self.logger.debug('Processing given xmp', {metadata: xmpData});

        self.result.setSuccess(true);

        self.cache = {
            languageNode: null, // reference to the language node in webgme
            nodes: {},          // references by name to the node objects
            xmpMetaNode: {},    // references by name to xmp descriptors
            attributes: {},     // references by name to xmp attribute definitions
            roles: {}           // map roles to kind
        };

        self.logger.debug('Checking for important key values in xmp');
        if (xmpData.hasOwnProperty('paradigm')) {
            // create Language object in root
            paradigm = xmpData.paradigm;
            error = self.createLanguageNode(paradigm);
            if (error) {
                return error;
            }
        } else {
            return new Error('Invalid xmpData: paradigm key does not exist.');
        }


        if (paradigm.hasOwnProperty('folder') === false) {
            return new Error('Invalid xmpData.paradigm: folder key does not exist.');
        }

        if (typeof paradigm.folder[0] === 'object') {
            rootFolder = paradigm.folder[0];
        } else {
            return new Error('Invalid xmpData.paradigm.folder: does not have a valid first element in the array.');
        }

        if (typeof rootFolder.hasOwnProperty('attrdef') === false) {
            return new Error('Invalid xmpData.paradigm.folder[0]: attrdef key does not exist.');
        }

        // cache attributes
        self.logger.debug('Caching attributes ...');
        for (i = 0; i < rootFolder.attrdef.length; i += 1) {
            attrdef = rootFolder.attrdef[i];
            self.cache.attributes[attrdef['@name']] = attrdef;
            self.logger.debug('Cached: ' + attrdef['@name'], {metadata: attrdef});
        }
        self.logger.debug('Caching attributes done.');

        // add objects to the language object including attributes
        error = self.createNodes(rootFolder);
        if (error) {
            return error;
        }

        // add meta rules
        error = self.createMetaRules(paradigm['@name']);
        if (error) {
            return error;
        }
    };


    MetaGMEParadigmImporter.prototype.createLanguageNode = function (paradigm) {
        var self = this,
            languageNode;

        self.logger.debug('Creating language node ...');

        languageNode = self.core.createNode({
            parent: self.rootNode,
            base: self.META.FCO
        });

        self.core.setAttribute(languageNode, 'name', 'Language [' + paradigm['@name'] + ']');
        self.core.setAttributeMeta(languageNode, 'xmp', {type: 'asset', default: ''});
        self.core.setAttribute(languageNode, 'xmp', self.getCurrentConfig().xmpFile);
        self.core.setAttributeMeta(languageNode, 'metaguid', {type: 'string', default: ''});
        self.core.setAttribute(languageNode, 'metaguid', paradigm['@guid']);
        self.core.setAttributeMeta(languageNode, 'cdate', {type: 'string', default: ''});
        self.core.setAttribute(languageNode, 'cdate', paradigm['@cdate']);
        self.core.setAttributeMeta(languageNode, 'mdate', {type: 'string', default: ''});
        self.core.setAttribute(languageNode, 'mdate', paradigm['@mdate']);

        self.core.setAttributeMeta(languageNode, 'author', {type: 'string', default: ''});
        if (paradigm.author.hasOwnProperty('#text')) {
            self.core.setAttribute(languageNode, 'author', paradigm.author['#text']);
        }
        self.core.setAttributeMeta(languageNode, 'comment', {type: 'string', default: ''});
        if (paradigm.comment.hasOwnProperty('#text')) {
            self.core.setAttribute(languageNode, 'comment', paradigm.comment['#text']);
        }

        // TODO: set default view to META

        self.core.setRegistry(languageNode, 'position', {x: 100, y: 200});
        self.core.setRegistry(languageNode, 'decorator', 'DefaultDecorator');


        self.cache.languageNode = languageNode;

        self.logger.debug('Created language node: ' + self.core.getPath(languageNode));
    };

    MetaGMEParadigmImporter.prototype.createNodes = function (rootFolder) {
        var self = this,
            i,
            j,
            type,
            types = ['atom', 'folder', 'model', 'set', 'connection', 'reference'];

        self.logger.debug('Creating nodes ...');

        self.createNode(rootFolder);

        for (j = 0; j < types.length; j += 1) {
            type = types[j];
            if (rootFolder.hasOwnProperty(type)) {
                for (i = 0; i < rootFolder[type].length; i += 1) {
                    self.createNode(rootFolder[type][i]);
                }
            }
        }

        self.logger.debug('Created ' + Object.keys(self.cache.nodes).length + ' nodes.');
    };

    MetaGMEParadigmImporter.prototype.createNode = function (xmpMetaNode) {
        var self = this,
            node,
            name = xmpMetaNode['@name'],
            x,
            y,
            attributeNames,
            attributeName,
            attributeDescriptor,
            xmpAttribute,
            xmpLocalAttributes = {},
            i,
            j;

        self.logger.debug('Creating node: ' + name);

        node = self.core.createNode({
            parent: self.cache.languageNode,
            base: self.META.FCO
        });

        if (xmpMetaNode.hasOwnProperty('@attributes')) {
            // add attributes
            attributeNames = xmpMetaNode['@attributes'].split(' ');
            if (xmpMetaNode.hasOwnProperty('attrdef')) {
                for (i = 0; i < xmpMetaNode.attrdef.length; i += 1) {
                    xmpLocalAttributes[xmpMetaNode.attrdef[i]['@name']] = xmpMetaNode.attrdef[i];
                }
            }

            for (i = 0; i < attributeNames.length; i += 1) {
                attributeName = attributeNames[i];
                xmpAttribute = null; // clear previous value
                xmpAttribute = self.cache.attributes[attributeName]; // get it from the global cache first
                xmpAttribute = xmpAttribute || xmpLocalAttributes[attributeName]; // use local if not found in global
                if (xmpAttribute) {
                    attributeDescriptor = {
                        type: 'string',
                        default: xmpAttribute['@defvalue']
                    };

                    if (xmpAttribute['@valuetype'] === 'enum') {
                        attributeDescriptor.enum = [];
                        for (j = 0; j < xmpAttribute.enumitem.length; j += 1) {
                            attributeDescriptor.enum.push(xmpAttribute.enumitem[j]['@value']);
                        }
                    } else if (xmpAttribute['@valuetype'] === 'boolean') {
                        attributeDescriptor.type = 'boolean';
                        attributeDescriptor.default = xmpAttribute['@defvalue'] === 'true';
                    } else if (xmpAttribute['@valuetype'] === 'integer') {
                        attributeDescriptor.type = 'integer';
                        attributeDescriptor.default = parseInt(xmpAttribute['@defvalue']);
                    } else if (xmpAttribute['@valuetype'] === 'double') {
                        attributeDescriptor.type = 'float';
                        attributeDescriptor.default = parseFloat(xmpAttribute['@defvalue']);
                    }

                    self.core.setAttributeMeta(node, xmpAttribute['@name'], attributeDescriptor);
                    // Since default was passed, the value was already set.
                    //self.core.setAttribute(node, xmpAttribute['@name'], attributeDescriptor.default);

                } else {
                    self.logger.error('Attribute was not found in global or local cache: ',
                        {metadata: {attrName: attributeName, xmpMetaNode: xmpMetaNode}});
                }
            }
        }

        if (xmpMetaNode.hasOwnProperty('role')) {
            for (i = 0; i < xmpMetaNode.role.length; i += 1) {
                // FIXME: check if role already exists and maps to a different kind
                self.cache.roles[xmpMetaNode.role[i]['@name']] = xmpMetaNode.role[i]['@kind'];
            }
        }

        self.core.setAttribute(node, 'name', name);
        //self.core.setAttributeMeta(node, 'metaref', {type: 'string', default: '0'});
        //self.core.setAttribute(node, 'metaref', xmpMetaNode['@metaref']);

        // FIXME: improve the auto layout of the nodes
        x = 100;
        y = Object.keys(self.cache.nodes).length * 80 + 80;

        self.core.setRegistry(node, 'position', {x: x, y: y});

        // TODO: import properties, colors, etc.

        self.cache.nodes[name] = node;
        self.cache.xmpMetaNode[name] = xmpMetaNode;

        self.logger.debug('Created node: ' + name + ' - ' + self.core.getPath(node));

        return node;
    };

    MetaGMEParadigmImporter.prototype.createMetaRules = function (paradigmName) {
        var self = this,
            xmpMetaNames = Object.keys(self.cache.xmpMetaNode),
            xmpMetaName,
            xmpNode,
            node,
            childObjectNames,
            i,
            j,
            k,
            aspect,
            part,
            isPort,
            childNode,
            position,
            x,
            y,
            sheetsRegistry,
            setGuid,
            sheetId,
            maxAttrInThisRow,
            maxAttr = 0,
            numElementsInARow = 10;

        //xmpMetaNames.sort(); // maybe we should sort by name? or something else?

        // use cache to create meta rules
        self.logger.debug('Creating meta rules ...');

        setGuid = GUID();
        sheetId = 'MetaAspectSet_' + setGuid;
        self.logger.debug('Creating meta sheet ' + sheetId);

        sheetsRegistry = self.core.getRegistry(self.rootNode, 'MetaSheets');
        sheetsRegistry = JSON.parse(JSON.stringify(sheetsRegistry));
        sheetsRegistry.push({
            SetID: sheetId,
            order: sheetsRegistry.length,
            title: paradigmName
        });
        self.core.setRegistry(self.rootNode, 'MetaSheets', sheetsRegistry);
        self.core.createSet(self.rootNode, sheetId);

        self.logger.debug('Created meta sheet ' + sheetId);

        for (i = 0; i < xmpMetaNames.length; i += 1) {
            xmpMetaName = xmpMetaNames[i];
            node = self.cache.nodes[xmpMetaName];
            xmpNode = self.cache.xmpMetaNode[xmpMetaName];

            if (xmpNode.hasOwnProperty('@subfolders')) {
                childObjectNames = xmpNode['@subfolders'].split(' ');
                self.addValidChildren(node, childObjectNames);
            }

            if (xmpNode.hasOwnProperty('@rootobjects')) {
                childObjectNames = xmpNode['@rootobjects'].split(' ');
                self.addValidChildren(node, childObjectNames);
            }

            if (xmpNode.hasOwnProperty('role')) {
                childObjectNames = [];
                for (j = 0; j < xmpNode.role.length; j += 1) {
                    childObjectNames.push(xmpNode.role[j]['@kind']);
                }
                self.addValidChildren(node, childObjectNames);
            }

            if (xmpNode.hasOwnProperty('aspect')) {
                for (j = 0; j < xmpNode.aspect.length; j += 1) {
                    aspect = xmpNode.aspect[j];
                    if (aspect.hasOwnProperty('part')) {
                        for (k = 0; k < aspect.part.length; k += 1) {
                            part = aspect.part[k];
                            childNode = self.cache.nodes[part['@role']];
                            childNode = childNode || self.cache.nodes[self.cache.roles[part['@role']]];
                            isPort = self.core.getRegistry(childNode, 'isPort') || false;
                            isPort = isPort || part['@linked'] === 'yes';
                            self.core.setRegistry(childNode, 'isPort', isPort);
                        }
                    } else {
                        // TODO: generate an error message? or warning?
                    }
                }
            }

            if (xmpNode.hasOwnProperty('connjoint')) {
                // add possible connection rules
                self.addValidPointerSpecs(node, xmpNode.connjoint);
            }

            if (xmpNode.hasOwnProperty('pointerspec')) {
                // references and sets
                self.addValidPointerSpecs(node, xmpNode);
            }


            if (i % numElementsInARow === 0) {
                // first element
                maxAttrInThisRow = 0;
            }

            if (xmpNode.hasOwnProperty('@attributes')) {
                maxAttrInThisRow = Math.max(maxAttrInThisRow, xmpNode['@attributes'].split(' ').length);
            }

            x = 100 + (i % numElementsInARow) * 150;
            y = 100 + maxAttr * 16 /* attr height */ + Math.floor(i / numElementsInARow) * (60 /* box height */ + 20 /* gap */);

            if (i % numElementsInARow === numElementsInARow - 1) {
                // last element
                maxAttr = maxAttr + maxAttrInThisRow;
            }

            position = {
                x: x,
                y: y
            };

            // add element to one meta sheet
            self.core.addMember(self.rootNode, 'MetaAspectSet', node);
            self.core.addMember(self.rootNode, sheetId, node);
            self.core.setMemberRegistry(self.rootNode,
                sheetId,
                self.core.getPath(node),
                'position',
                position);
        }

        self.logger.debug('Created meta rules.');
    };

    MetaGMEParadigmImporter.prototype.addValidChildren = function (parentNode, childObjectNames) {
        var self = this,
            childNode,
            i;

        for (i = 0; i < childObjectNames.length; i += 1) {
            childNode = self.cache.nodes[childObjectNames[i]];
            self.core.setChildMeta(parentNode, childNode);
            self.logger.debug(self.core.getAttribute(parentNode, 'name') + ' can contain ' + childObjectNames[i]);
        }
    };

    MetaGMEParadigmImporter.prototype.addValidPointerSpecs = function (node, hasPointerSpecsObject) {
        var self = this,
            i,
            j,
            pointerSpec,
            pointerName,
            targetNames,
            targetName,
            pointerItem,
            targetNode;

        for (i = 0; i < hasPointerSpecsObject.pointerspec.length; i += 1) {
            pointerSpec = hasPointerSpecsObject.pointerspec[i];
            pointerName = pointerSpec['@name'];
            if (pointerSpec.hasOwnProperty('pointeritem')) {
                for (j = 0; j < pointerSpec.pointeritem.length; j += 1) {
                    pointerItem = pointerSpec.pointeritem[j];
                    targetNames = pointerItem['@desc'].split(' ');
                    // get the last element from the list
                    targetName = targetNames[targetNames.length - 1];

                    if (self.cache.nodes.hasOwnProperty(targetName)) {
                        targetNode = self.cache.nodes[targetName];
                    } else {
                        targetNode = self.cache.nodes[self.cache.roles[targetName]];
                    }

                    // 'node' can have a pointer named 'pointerName' to a target object type 'targetNode'
                    self.core.setPointerMetaTarget(node, pointerName, targetNode);
                    if (pointerName === 'set') {
                        self.core.createSet(node, pointerName);
                    } else {
                        self.core.setPointer(node, pointerName, null);
                    }
                }
            } else {
                // TODO: generate an error message? or warning?
            }
        }
    };

    return MetaGMEParadigmImporter;
});

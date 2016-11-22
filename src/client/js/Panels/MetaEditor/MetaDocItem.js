/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['./MetaEditorConstants', 'common/util/random'], function (META_EDITOR_CONSTANTS, RANDOM) {
    'use strict';

    var DEFAULT_NAME = 'Documentation',
        DEFAULT_COLOR = '#ececec', // Gray like any decorator.
        DEFAULT_DOCUMENTATION = 'Edit documentation ...';

    function MetaDocItem(client, nodeId, setName, id) {
        this._id = id;
        this._setName = setName;
        this._nodeId = nodeId;
        this._client = client;

        this.update();
    }

    MetaDocItem.addNew = function (client, nodeId, setName, position) {
        var nodeObj = client.getNode(nodeId),
            currentIds = nodeObj.getSetRegistryNames(setName),
            excludeList = {},
            newId;

        currentIds.forEach(function (id) {
            if (id.indexOf(META_EDITOR_CONSTANTS.META_DOC_REGISTRY_PREFIX) === 0) {
                excludeList[id.replace(META_EDITOR_CONSTANTS.META_DOC_REGISTRY_PREFIX, '')] = true;
            }
        });

        newId = META_EDITOR_CONSTANTS.META_DOC_REGISTRY_PREFIX + RANDOM.generateRelid(excludeList);

        position = position || {};

        position.x = typeof position.x === 'number' ? position.x : 100;
        position.y = typeof position.y === 'number' ? position.y : 100;

        client.setSetRegistry(nodeId, setName, newId, {
            name: DEFAULT_NAME,
            position: position,
            color: DEFAULT_COLOR,
            documentation: DEFAULT_DOCUMENTATION
        });
    };

    MetaDocItem.delete = function (client, nodeId, setName, id) {
        client.delSetRegistry(nodeId, setName, id);
    };

    MetaDocItem.prototype.update = function () {
        var nodeObj = this._client.getNode(this._nodeId),
            data = nodeObj.getSetRegistry(this._setName, this._id);

        this.name = data.name;
        this.documentation = data.documentation;
        this.position = {};
        this.position.x = (data.position && typeof data.position.x === 'number') ? data.position.x : 100;
        this.position.y = (data.position && typeof data.position.y === 'number') ? data.position.y : 100;
        this.color = data.color;
        this.borderColor = data.borderColor;
        this.textColor = data.textColor;
    };

    MetaDocItem.prototype.getObjectDescriptor = function (decoratorClass) {
        var self = this,
            result = {
                position: this.position,
                decoratorClass: decoratorClass,
                metaInfo: {},
                control: {
                    _client: {
                        getNode: function () {
                            return {
                                getAttribute: function (name) {
                                    return self[name];
                                },
                                getRegistry: function (name) {
                                    return self[name];
                                }
                            };
                        },
                        setAttribute: function (_id, name, value) {
                            if (name === 'documentation' || name === 'name') {
                                self.setProperty(name, value);
                            }
                        }
                    }
                },
                preferencesHelper: {
                    getRegistry: function (_, name) {
                        return self[name];
                    },
                    setRegistry: function () {

                    },
                    delRegistry: function () {

                    }
                }
            };

        return result;
    };

    MetaDocItem.prototype.getPersistEntry = function () {
        var result = {},
            key;

        for (key in this) {
            if (this.hasOwnProperty(key) && key.indexOf('_') !== 0 && typeof this[key] !== 'undefined') {
                result[key] = this[key];
            }
        }

        return result;
    };

    MetaDocItem.prototype.setProperty = function (name, value) {
        this[name] = value;

        var regValue = this.getPersistEntry();
        this._client.setSetRegistry(this._nodeId, this._setName, this._id, regValue);
    };

    MetaDocItem.prototype.deleteProperty = function (name) {
        delete this[name];

        var regValue = this.getPersistEntry();
        this._client.setSetRegistry(this._nodeId, this._setName, this._id, regValue);
    };

    MetaDocItem.prototype.deleteItem = function () {
        this._client.delSetRegistry(this._nodeId, this._setName, this._id);
    };

    return MetaDocItem;
});
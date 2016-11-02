/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['./MetaEditorConstants'], function (META_EDITOR_CONSTANTS) {
    'use strict';

    function MetaDocItem(client, nodeId, setName, id, data) {
        this._id = id;
        this._setName = setName;
        this._nodeId = nodeId;
        this._client = client;

        this.name = data.name;
        this.documentation = data.documentation;
        this.position = {};
        this.position.x = (data.position && typeof data.position.x === 'number') ? data.position.x : 100;
        this.position.y = (data.position && typeof data.position.y === 'number') ? data.position.y : 100;
        this.color = data.color;
        this.borderColor = data.borderColor;
        this.textColor = data.textColor;
    }

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
                            } else {
                                console.warn('unexpected attribute in MetaDocItem', name, value);
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
        console.log('setSetRegistry', this._nodeId, this._setName, this._id, regValue);
        this._client.setSetRegistry(this._nodeId, this._setName, this._id, regValue);
    };

    MetaDocItem.prototype.deleteProperty = function (name) {
        delete this[name];

        var regValue = this.getPersistEntry();
        console.log('setSetRegistry', this._nodeId, this._setName, this._id, regValue);
        this._client.setSetRegistry(this._nodeId, this._setName, this._id, regValue);
    };

    MetaDocItem.prototype.deleteItem = function () {
        this._client.delSetRegistry(this._nodeId, this._setName, this._id);
    };

    return MetaDocItem;
});
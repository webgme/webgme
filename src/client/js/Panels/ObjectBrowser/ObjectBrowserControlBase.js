/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/RegistryKeys', 'js/Constants',], function (REGISTRY_KEYS, CONSTANTS) {
    'use strict';

    function ObjectBrowserControlBase(client, treeBrowser, logger) {
        var self = this;
        this._client = client;
        this._treeBrowser = treeBrowser;

        this._treeBrowser.onMakeNodeSelected = this._makeNodeSelected;

        this._treeBrowser.getDragEffects = function (/*el*/) {
            var nodeIds = self._treeBrowser.getSelectedIDs(),
                node,
                hasLibraryRoot = false,
                hasLibraryElement = false,
                i;

            for (i = 0; i < nodeIds.length; i += 1) {
                node = self._client.getNode(nodeIds[i]);
                if (node) {
                    if (node.isLibraryRoot()) {
                        hasLibraryRoot = true;
                    }
                    if (node.isLibraryElement()) {
                        hasLibraryElement = true;
                    }
                }
            }

            if (hasLibraryRoot) {
                return [];
            } else if (hasLibraryElement) {
                return [self._treeBrowser.DRAG_EFFECTS.DRAG_COPY,
                    self._treeBrowser.DRAG_EFFECTS.DRAG_CREATE_POINTER,
                    self._treeBrowser.DRAG_EFFECTS.DRAG_CREATE_INSTANCE,
                    self._treeBrowser.DRAG_EFFECTS.DRAG_SET_REPLACEABLE
                ];
            }
            return [self._treeBrowser.DRAG_EFFECTS.DRAG_COPY,
                self._treeBrowser.DRAG_EFFECTS.DRAG_MOVE,
                self._treeBrowser.DRAG_EFFECTS.DRAG_CREATE_POINTER,
                self._treeBrowser.DRAG_EFFECTS.DRAG_CREATE_INSTANCE,
                self._treeBrowser.DRAG_EFFECTS.DRAG_SET_REPLACEABLE,
            ];
        };

        this._treeBrowser.getDragItems = function (/*el*/) {
            return self._treeBrowser.getSelectedIDs();
        };

        this._treeBrowser.onExtendMenuItems = function (nodeId, menuItems) {
            var nodeObj = self._client.getNode(nodeId);

            if (!nodeObj || nodeObj.isReadOnly() || nodeId === CONSTANTS.PROJECT_ROOT_ID) {
                delete menuItems.delete;
                delete menuItems.rename;
                delete menuItems.separatorOperationsStart;
            }
        };

        //called from the TreeBrowserWidget when a node has been renamed
        this._treeBrowser.onNodeTitleChanged = function (nodeId, oldText, newText) {

            //send name update to the server
            client.setAttributes(nodeId, 'name', newText);

            //reject name change on client side - need server roundtrip to notify about the name change
            return false;
        };

        //called from the TreeBrowserWidget when a node has been marked to "delete this"
        this._treeBrowser.onNodeDelete = function (selectedIds) {
            var i = selectedIds.length,
                node;
            //temporary fix to not allow deleting ROOT AND FCO
            while (i--) {
                node = client.getNode(selectedIds[i]);
                if (node && node.getBaseId() === null) {
                    logger.warn('Can not delete item with ID: ' +
                        selectedIds[i] + '. Possibly it is the ROOT or FCO');
                    selectedIds.splice(i, 1);
                }
            }

            client.delMoreNodes(selectedIds);
        };
    }

    ObjectBrowserControlBase.prototype.getIcon = function (nodeOrId, expanded) {
        var node,
            iconName;

        if (typeof nodeOrId === 'string') {
            node = this._client.getNode(nodeOrId);
        } else {
            node = nodeOrId;
        }

        if (node) {
            if (expanded) {
                iconName = node.getRegistry(REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON) ||
                    node.getRegistry(REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON);
            } else {
                iconName = node.getRegistry(REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON) ||
                    node.getRegistry(REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON);
            }
        }

        return iconName ?  '/assets/DecoratorSVG/' + iconName : null;
    };

    ObjectBrowserControlBase.prototype.getMetaInfo = function (nodeObj) {
        var metaId = nodeObj.getMetaTypeId(),
            result = {
                name: '',
                isMetaNode: nodeObj.isMetaNode()
            };

        if (metaId && this._client.getNode(metaId)) {
            result.name = this._client.getNode(metaId).getFullyQualifiedName();
        }

        return result;
    };

    ObjectBrowserControlBase.prototype._makeNodeSelected = function (nodeId) {
        WebGMEGlobal.State.registerActiveSelection([nodeId]);
    };

    return ObjectBrowserControlBase;
});
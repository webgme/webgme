/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/RegistryKeys'], function (REGISTRY_KEYS) {
    'use strict';

    function ObjectBrowserControlBase(client, treeBrowser) {
        this._client = client;
        this._treeBrowser = treeBrowser;

        this._treeBrowser.onMakeNodeSelected = this._makeNodeSelected;
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

    ObjectBrowserControlBase.prototype._makeNodeSelected = function (nodeId) {
        WebGMEGlobal.State.registerActiveSelection([nodeId]);
    };


    return ObjectBrowserControlBase;
});
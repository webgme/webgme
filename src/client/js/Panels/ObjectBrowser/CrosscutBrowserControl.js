/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames',
    'js/Constants',
    './ObjectBrowserControlBase',
], function (Logger,
             GMEConcepts,
             nodePropertyNames,
             CONSTANTS,
             ObjectBrowserControlBase) {
    'use strict';

    var NODE_PROGRESS_CLASS = 'node-progress',
        GME_MODEL_CLASS = 'gme-model',
        GME_ATOM_CLASS = 'gme-atom',
        PROJECT_ROOT_ID = CONSTANTS.PROJECT_ROOT_ID,
        DEFAULT_VISUALIZER = 'Crosscut',
        REG_NAME = 'CrossCuts';

    var CrosscutBrowserControl = function (client, treeBrowser) {
        var self = this;

        this._logger = Logger.create('gme:Panels:ObjectBrowser:CrosscutBrowserControl',
            WebGMEGlobal.gmeConfig.client.log);

        ObjectBrowserControlBase.call(this, client, treeBrowser, this._logger);

        setTimeout(function () {
            self._initialize();
        }, 250);
    };

    // Prototypical inheritance
    CrosscutBrowserControl.prototype = Object.create(ObjectBrowserControlBase.prototype);
    CrosscutBrowserControl.prototype.constructor = CrosscutBrowserControl;

    CrosscutBrowserControl.prototype.destroy = function () {
    };

    CrosscutBrowserControl.prototype.reLaunch = function () {
        this._logger.debug('reLaunch from client...');

        //forget the old territory
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._territoryId = undefined;
        }

        this._treeBrowser.deleteNode(this._treeNodes[PROJECT_ROOT_ID]);

        this._initialize();
    };

    CrosscutBrowserControl.prototype._initialize = function () {
        var self = this;

        this._selfPatterns = {};
        this._nodes = {};
        this._crosscuts = {};
        this._treeNodes = {};
        this._crosscutTreeNodes = {};

        //set up event handlers for the treebrowser
        this._treeBrowser.onNodeOpen = function (nodeId) {
            self._onNodeOpen(nodeId);
        };

        this._treeBrowser.onNodeClose = function (nodeId) {
            self._onNodeClose(nodeId);
        };

        this._treeBrowser.onNodeDoubleClicked = function (nodeId) {
            self._onNodeDoubleClicked(nodeId);
        };

        //create territory
        this._territoryId = this._client.addUI(this, function (events) {
            self._territoryCallback(events);
        });

        //create a new loading node for root in the tree
        this._treeNodes[PROJECT_ROOT_ID] = this._treeBrowser.createNode(null, {
            id: PROJECT_ROOT_ID,
            name: 'Initializing tree...',
            hasChildren: false,
            class: NODE_PROGRESS_CLASS
        });

        //add the root to the query
        this._selfPatterns[PROJECT_ROOT_ID] = {children: 1};
        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    CrosscutBrowserControl.prototype._getNodeDescBase = function () {
        return {
            children: [],
            crosscuts: []
        };
    };

    CrosscutBrowserControl.prototype._territoryCallback = function (events) {
        var i,
            len = events.length;

        //this._treeBrowser.enableUpdate(false);
        for (i = 0; i < len; i += 1) {
            switch (events[i].etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._insertOrUpdate(events[i].eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._insertOrUpdate(events[i].eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    this._removeTreeNode(events[i].eid);
                    break;
            }
        }
        //this._treeBrowser.enableUpdate(true);
    };

    CrosscutBrowserControl.prototype._insertOrUpdate = function (nodeId, parentExpanding) {
        var displayItemInTree = this._needsToBeInTree(nodeId),
            inserted = false;

        //it needs to be displayed in the tree
        if (displayItemInTree) {
            if (!this._treeNodes[nodeId]) {
                //not in the tree yet
                inserted = this._createTreeNode(nodeId, parentExpanding);
            } else {
                this._updateTreeNode(nodeId);
            }
        } else {
            //does not need to be present in the tree
            //if already there, remove
            if (this._treeNodes[nodeId]) {
                //not in the tree yet
                this._removeTreeNode(nodeId);
            }
        }

        return inserted;
    };

    CrosscutBrowserControl.prototype._createTreeNode = function (nodeId, parentExpanding) {
        var nodeObj = this._client.getNode(nodeId),
            parentId = nodeObj.getParentId(),
            parentTreeNode,
            created = false;

        //only matters if parent is in the tree already and expanded
        if (this._treeNodes[parentId] &&
            (this._treeNodes[parentId].isExpanded() || parentExpanding === true)) {
            parentTreeNode = this._treeNodes[parentId];

            //parent is in the tree now, we can create this node
            this._treeNodes[nodeId] = this._treeBrowser.createNode(parentTreeNode, {
                id: nodeId,
                name: 'Loading...',
                hasChildren: false,
                class: NODE_PROGRESS_CLASS
            });

            this._updateTreeNode(nodeId);

            created = true;
        }

        return created;
    };

    CrosscutBrowserControl.prototype._updateTreeNode = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            nodeDescriptor;

        //create the node's descriptor for the tree-browser widget
        nodeDescriptor = {
            name: nodeObj.getFullyQualifiedName(),
            hasChildren: this._isExpandable(nodeId),
            class: GME_MODEL_CLASS
        };

        if (this._treeNodes[nodeId].isExpanded()) {
            nodeDescriptor.icon = this.getIcon(nodeId, true);
            this._treeBrowser.updateNode(this._treeNodes[nodeId], nodeDescriptor);
            this._updateExpandedTreeNode(nodeId);
        } else {
            nodeDescriptor.icon = this.getIcon(nodeId);
            this._treeBrowser.updateNode(this._treeNodes[nodeId], nodeDescriptor);
        }
    };

    CrosscutBrowserControl.prototype._updateExpandedTreeNode = function (nodeId) {
        //a treenode is expanded, need to update the crosscut list
        var crosscuts = GMEConcepts.getCrosscuts(nodeId),
            newCrossCutIDs = [],
            oldCrossCutIDs = this._nodes[nodeId].crosscuts.slice(0),
            diff,
            len,
            cc,
            i;

        _.each(crosscuts, function (cc) {
            newCrossCutIDs.push(cc.SetID);
        });

        //figure out the added/deleted/updated crosscuts

        //deleted ones
        diff = _.difference(oldCrossCutIDs, newCrossCutIDs);
        len = diff.length;
        while (len--) {
            this._removeXCutTreeNode(nodeId, diff[len]);
        }

        //added ones
        diff = _.difference(newCrossCutIDs, oldCrossCutIDs);
        len = diff.length;
        while (len--) {
            i = crosscuts.length;
            cc = undefined;
            while (i--) {
                if (crosscuts[i].SetID === diff[len]) {
                    cc = crosscuts[i];
                    break;
                }
            }
            this._createXCutTreeNode(nodeId, cc);
        }

        //already there but might have been changed (name)
        diff = _.intersection(oldCrossCutIDs, newCrossCutIDs);
        len = diff.length;
        while (len--) {
            i = crosscuts.length;
            cc = undefined;
            while (i--) {
                if (crosscuts[i].SetID === diff[len]) {
                    cc = crosscuts[i];
                    break;
                }
            }
            this._updateXCutTreeNode(nodeId, cc);
        }

        //update accounting
        this._nodes[nodeId].crosscuts = newCrossCutIDs.slice(0);
    };

    CrosscutBrowserControl.prototype._needsToBeInTree = function (nodeId) {
        var result = false,
            nodeObj = this._client.getNode(nodeId);

        //it is either the ROOT object,
        //or has children
        //or has crosscuts
        if (nodeId === PROJECT_ROOT_ID) {
            result = true;
        } else if (nodeObj) {
            result = nodeObj.getChildrenIds().length > 0 || GMEConcepts.getCrosscuts(nodeId).length > 0;
        }

        return result;
    };

    //called from the TreeBrowserWidget when a node is expanded by its expand icon
    CrosscutBrowserControl.prototype._onNodeOpen = function (nodeId) {
        //first create dummy elements under the parent representing the children being loaded
        var nodeObj = this._client.getNode(nodeId),
            childrenIDs,
            i,
            currentChildId,
            self = this;

        if (nodeObj) {
            //get the treenode representing the parent in the tree
            this._nodes[nodeId] = this._getNodeDescBase();

            //this._treeBrowser.enableUpdate(false);

            //get the children IDs of this node and create a node for them in the tree if necessary
            childrenIDs = nodeObj.getChildrenIds();
            for (i = 0; i < childrenIDs.length; i += 1) {
                currentChildId = childrenIDs[i];
                if (this._insertOrUpdate(currentChildId, true)) {
                    this._selfPatterns[currentChildId] = {children: 1};
                    this._nodes[nodeId].children.push(currentChildId);
                }
            }

            //get all the crosscuts of this node and create a node for them in the tree

            _.each(GMEConcepts.getCrosscuts(nodeId), function (crosscut) {
                self._createXCutTreeNode(nodeId, crosscut, true);
            });
            this._treeBrowser.updateNode(this._treeNodes[nodeId], {icon: this.getIcon(nodeObj, true)});
            //this._treeBrowser.enableUpdate(true);
        }

        //need to expand the territory
        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    CrosscutBrowserControl.prototype._createXCutTreeNode = function (nodeId, crosscut, parentExpanding) {
        var parentTreeNode,
            crossCutID = crosscut.SetID,
            fqCrosscutID = this._getFullCrosscutID(nodeId, crossCutID);

        //only matters if parent is in the tree already and expanded
        if (this._treeNodes[nodeId] &&
            (this._treeNodes[nodeId].isExpanded() || parentExpanding === true)) {

            parentTreeNode = this._treeNodes[nodeId];

            //update accounting of the node
            this._nodes[nodeId].crosscuts.push(crossCutID);

            this._crosscutTreeNodes[fqCrosscutID] = this._treeBrowser.createNode(parentTreeNode, {
                id: fqCrosscutID,
                name: crosscut.title,
                hasChildren: false,
                class: GME_ATOM_CLASS
            });

            this._crosscuts[fqCrosscutID] = nodeId;
        }
    };

    CrosscutBrowserControl.prototype._getFullCrosscutID = function (nodeId, crosscutID) {
        return nodeId + '_' + crosscutID;
    };

    CrosscutBrowserControl.prototype._getCrosscutID = function (fqCrosscutID, nodeId) {
        return fqCrosscutID.substr(nodeId.length + 1);
    };

    //called from the TreeBrowserWidget when a node has been closed by its collapse icon
    CrosscutBrowserControl.prototype._onNodeClose = function (nodeId) {
        var removeFromTerritory = [],
            deleteNodeAndChildrenFromLocalHash,
            self = this,
            selfPatterns = this._selfPatterns;

        //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened this._nodes's info
        deleteNodeAndChildrenFromLocalHash = function (childNodeId, deleteSelf) {
            var xx,
                fqCrosscutID;

            //if the given node is in this hashmap itself, go forward with its children's ID recursively
            if (self._nodes[childNodeId]) {
                for (xx = 0; xx < self._nodes[childNodeId].children.length; xx += 1) {
                    deleteNodeAndChildrenFromLocalHash(self._nodes[childNodeId].children[xx], true);
                }

                //delete the node's crosscuts
                for (xx = 0; xx < self._nodes[childNodeId].crosscuts.length; xx += 1) {
                    fqCrosscutID = self._getFullCrosscutID(childNodeId, self._nodes[childNodeId].crosscuts[xx]);
                    delete self._crosscuts[fqCrosscutID];
                    delete self._crosscutTreeNodes[fqCrosscutID];
                }
            }

            //finally delete the node itself (if needed)
            if (deleteSelf === true) {
                delete self._nodes[childNodeId];
                delete self._treeNodes[childNodeId];

                //and collect the nodeId from territory removal
                removeFromTerritory.push(childNodeId);
                delete selfPatterns[childNodeId];
            }
        };

        //call the cleanup recursively and mark this node (being closed)
        // as non removable (from local hashmap neither from territory)
        deleteNodeAndChildrenFromLocalHash(nodeId, false);
        this._nodes[nodeId].crosscuts = [];
        this._nodes[nodeId].children = [];
        this._treeBrowser.updateNode(this._treeNodes[nodeId], {icon: this.getIcon(nodeId)});

        //if there is anything to remove from the territory, do it
        if (removeFromTerritory.length > 0) {
            this._client.updateTerritory(this._territoryId, selfPatterns);
        }
    };

    CrosscutBrowserControl.prototype._onNodeDoubleClicked = function (nodeId) {
        this._logger.debug('_onNodeDoubleClicked with nodeId: ' + nodeId);
        var settings = {},
            self = this,
            getTabId = function () {
                var node = self._client.getNode(self._crosscuts[nodeId]),
                    crosscuts,
                    i;

                if (node) {
                    crosscuts = node.getRegistry(REG_NAME);
                    if (crosscuts && crosscuts.length > 0) {
                        for (i = 0; i < crosscuts.length; i += 1) {
                            if (crosscuts[i].SetID === self._getCrosscutID(nodeId, self._crosscuts[nodeId])) {
                                return crosscuts[i].order;
                            }
                        }
                    }
                }

                return 0;
            };

        if (this._crosscuts.hasOwnProperty(nodeId)) {
            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = this._crosscuts[nodeId];
            settings[CONSTANTS.STATE_ACTIVE_TAB] = getTabId();
        } else {
            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
            settings[CONSTANTS.STATE_ACTIVE_TAB] = 0;
        }

        settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = DEFAULT_VISUALIZER;

        WebGMEGlobal.State.set(settings);
    };

    CrosscutBrowserControl.prototype._isExpandable = function (objectId) {
        var result = false,
            nodeObj = this._client.getNode(objectId);

        //expandable if it has children in the hierarchy
        //or has crosscuts
        if (nodeObj) {
            result = nodeObj.getChildrenIds().length > 0 || GMEConcepts.getCrosscuts(objectId).length > 0;
        }

        return result;
    };

    CrosscutBrowserControl.prototype._removeTreeNode = function (nodeId) {
        var treeNode = this._treeNodes[nodeId];

        //only matters if parent is in the tree already and expanded
        if (treeNode) {
            if (treeNode.isExpanded()) {
                this._onNodeClose(nodeId);
            }

            this._treeBrowser.deleteNode(treeNode);

            delete this._nodes[nodeId];
            delete this._treeNodes[nodeId];
            delete this._selfPatterns[nodeId];
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    CrosscutBrowserControl.prototype._removeXCutTreeNode = function (nodeId, crossCutID) {
        var fqCrosscutID = this._getFullCrosscutID(nodeId, crossCutID),
            idx;

        //only matters if it's already in the tree
        if (this._crosscutTreeNodes[fqCrosscutID]) {

            //update accounting of the node
            idx = this._nodes[nodeId].crosscuts.indexOf(crossCutID);
            this._nodes[nodeId].crosscuts.splice(idx, 1);

            this._treeBrowser.deleteNode(this._crosscutTreeNodes[fqCrosscutID]);

            delete this._crosscutTreeNodes[fqCrosscutID];
            delete this._crosscuts[fqCrosscutID];
        }
    };

    CrosscutBrowserControl.prototype._updateXCutTreeNode = function (nodeId, crosscut) {
        var crossCutID = crosscut.SetID,
            fqCrosscutID = this._getFullCrosscutID(nodeId, crossCutID);

        //only matters if it's already in the tree
        if (this._crosscutTreeNodes[fqCrosscutID]) {
            this._treeBrowser.updateNode(this._crosscutTreeNodes[fqCrosscutID], {
                id: fqCrosscutID,
                name: crosscut.title
            });
        }
    };

    return CrosscutBrowserControl;
});

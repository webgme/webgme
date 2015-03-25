/*globals define, Raphael, window, WebGMEGlobal, _, alert*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

/*
 * WIDGET TreeBrowserWidget based on DynaTree
 */
define(['js/logger',
    'js/Constants',
    './TreeBrowserWidget.Keyboard',
    'js/DragDrop/DragSource',
    'lib/jquery/jquery.dynatree-1.2.5.min',
    'lib/jquery/jquery.contextMenu',
    'css!./styles/TreeBrowserWidget.css'], function (Logger, CONSTANTS, TreeBrowserWidgetKeyboard, dragSource) {

    "use strict";

    var NODE_PROGRESS_CLASS = 'node-progress',
        TREE_BROWSER_CLASS = "tree-browser";

    var TreeBrowserWidget = function (container/*, params*/) {
        //get this._logger instance for this component
        this._logger = Logger.create('gme:Widgets:TreeBrowser:TreeBrowserWidget', WebGMEGlobal.gmeConfig.client.log);

        //save parent control
        this._el =  container;

        this._initialize();

        this._logger.debug('Ctor finished...');
    };

    TreeBrowserWidget.prototype._initialize = function () {
        var self = this,  //save this for later use
            lastSelection = { "nodeId" :  null, "time" : null },
            lastDblClicked,
            dynamicContextMenuCreate;

        //clear container content
        this._el.html("");

        //set Widget title
        this._el.addClass(TREE_BROWSER_CLASS);

        //by default use visual animations to reflect changes in the tree
        this._animation = true;

        this._enableNodeRename = true;

        //generate control dynamically
        this._treeEl = $('<div/>', {});

        //add control to parent
        this._el.append(this._treeEl);

        dynamicContextMenuCreate = function ($trigger) {
            return self._createContextMenu($trigger);
        };

        //hook up jquery.contextMenu
        this._treeEl.contextMenu({
            selector: '.dynatree-node',
            position: function(selector/*, x, y*/) {
                var _offset = selector.$trigger.find('.dynatree-title').offset();
                selector.$menu.css({top: _offset.top + 10, left: _offset.left - 10});
            },
            build: function($trigger/*, e*/) {
                // this callback is executed every time the menu is to be shown
                // its results are destroyed every time the menu is hidden
                // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
                return {
                    callback: function(key, options) {
                        var node = $.ui.dynatree.getNode(options.$trigger),
                            m = "clicked: '" + key + "' on '" + node.data.title + " (" + node.data.key + ")'";
                        alert(m);
                    },
                    items: dynamicContextMenuCreate($trigger)
                };
            }
        });

        //create tree using DynaTree
        this._treeEl.dynatree({
            checkbox: false,
            selectMode: 2,
            keyboard: false,
            imagePath : "/",
            debugLevel: 0,
            onLazyRead : function (node) {
                self._logger.debug("onLazyRead node:" + node.data.key);
                self.onNodeOpen.call(self, node.data.key);

                return false;
            },

            onQueryExpand: function (expand, node) {
                if (expand === false) {
                    self._logger.debug("Collapsing node:" + node.data.key);

                    //remove all children from DOM
                    node.removeChildren();

                    //call onNodeClose if exist
                    self.onNodeClose.call(self, node.data.key);
                }
            },

            onClick: function (node, event) {
                //override just to prevent default dynatree behavior
                //onClick: null, // null: generate focus, expand, activate, select events.
                self._registerKeyboardListener();
            },

            onFocus: function (node) {
                //override just to prevent default dynatree behavior
                //onFocus: null, // null: set focus to node.
                var tnFocused = this.tnFocused;
                //NOTE: in WebGMEGlobal.KeyboardManager.captureFocus(); the tnFocused will be cleared out
                //since the original control looses focus
                //need to save it back
                self._registerKeyboardListener();
                this.tnFocused = tnFocused;
            },

            onDblClick: function (node, event) {
                var editNoteTitle = false;

                self._logger.debug("Node double-click: " + node.data.key);

                //if Ctrl or Meta pressed for whatever reason (accidentally dblclick with modifier keys, just ignore)
                if (event.ctrlKey === true || event.metaKey === true) {
                    return false;// Prevent default processing
                }

                //deselect everyone and select the dblclicked one
                self._deselectSelectedNodes();
                node.select(true);

                //check if the node is already focused and the title is clicked --> edit title
                if (node.getEventTargetType(event) === "title" &&
                    node.isFocused() === true &&
                    lastDblClicked === node) {
                    editNoteTitle = true;
                }

                //check what mode should be activated
                if (editNoteTitle === true) {
                    self._nodeEdit(node);
                } else {
                    lastDblClicked = node;
                    if ($.isFunction(self.onNodeDoubleClicked)) {
                        self._logger.debug("default double-click handler: " + node.data.key);
                        self.onNodeDoubleClicked.call(self, node.data.key);
                    }
                }
            },

            //we don't need an activation here, it just messes up the UI
            onQueryActivate: function () {
                return false;
            },

            onCreate: function (node/*, span*/) {
                self._makeNodeDraggable(node);
            }
        });

        this._treeInstance = this._treeEl.dynatree("getTree");

        //register keyboard handling whenever user clicks on widget
        this._el.on('mousedown', function (event) {
           self._registerKeyboardListener(self);
        });

        this._treeEl.on('mousedown', 'span.dynatree-node', function (event) {
            self._onNodeMouseDown($.ui.dynatree.getNode(this), event);
        });
    };

    TreeBrowserWidget.prototype.enableUpdate = function (enable) {
        this._treeEl.dynatree("getTree").enableUpdate(enable);
    };

    /**
     * Creates a new node in the tree under parentNode with the given parameters
     * @param parentNode
     * @param objDescriptor
     */
    TreeBrowserWidget.prototype.createNode = function (parentNode, objDescriptor) {
        objDescriptor.name = objDescriptor.name || "";
        //check if the parentNode is null or not
        //when null, the new node belongs to the root
        if (parentNode === null) {
            // Now get the root node object
            parentNode = this._treeEl.dynatree("getRoot");
        }

        //find the new node's place in ABC order
        var beforeNode = null;

        var existingChildren = parentNode.getChildren();
        if (existingChildren) {
            var i;

            for (i = existingChildren.length - 1; i >= 0; i -= 1) {
                if (objDescriptor.name.toLowerCase() < existingChildren[i].data.title.toLowerCase()) {
                    beforeNode = existingChildren[i];
                } else {
                    break;
                }
            }
        }

        // Call the DynaTreeNode.addChild() member function and pass options for the new node
        var newNode = parentNode.addChild({
            "title": objDescriptor.name,
            "tooltip": objDescriptor.name,
            "key": objDescriptor.id,
            "isFolder": false,
            "isLazy": objDescriptor.hasChildren,
            "addClass": objDescriptor["class"] || "",
            "icon" : objDescriptor.icon || null
        }, beforeNode);

        //log
        this._logger.debug("New node created: " + newNode.data.key);

        //a bit of visual effect
        //this._animateNode(newNode);

        //return the newly created node
        return newNode;
    };

    /* Deletes the node from the tree
     * @param node
     */
    TreeBrowserWidget.prototype.deleteNode = function (node) {
        //if no valid node, return
        //otherwise delete node
        if (!node) {
            return;
        }

        node.remove();

        //log
        this._logger.debug("Node deleted: " + node.data.key);
    };

    /*
     * Resets the given nodes text tp the given value
     * @param node
     * @param text
     */
    TreeBrowserWidget.prototype.updateNode = function (node, objDescriptor) {

        //by default we say there is nothing to update
        var nodeDataChanged = false,
            nodeNameChanged = false,
            nodeName;


        //check if valid node
        if (!node) {
            return;
        }

        //set new text value (if any)
        if (node.data.title !== objDescriptor.name) {


            nodeName = objDescriptor.name;

            node.data.title = nodeName;
            node.data.tooltip = nodeName;

            //mark that change happened
            nodeDataChanged = true;
            nodeNameChanged = true;

        }

        //set new children value (if any)
        if (objDescriptor.hasChildren === true || objDescriptor.hasChildren === false) {
            if (objDescriptor.hasChildren !== node.data.isLazy) {
                node.data.isLazy = objDescriptor.hasChildren;

                //furthermore if it has no more childrend, collapse node
                if (objDescriptor.hasChildren === false) {
                    this.collapse(node);
                }

                //mark that change happened
                nodeDataChanged = true;
            }
        }

        //set new class (if any)
        if (objDescriptor["class"]) {
            if (node.data.addClass !== objDescriptor["class"]) {
                node.data.addClass = objDescriptor["class"];
                //mark that change happened
                nodeDataChanged = true;
            }
        }

        if (objDescriptor.icon) {
            if (node.data.icon !== objDescriptor.icon) {
                node.data.icon = objDescriptor.icon;

                //mark that change happened
                nodeDataChanged = true;
            }
        }

        if (nodeNameChanged === true) {
            //find it's new place based on alphabetical order
            var parentNode = node.getParent();

            if (parentNode) {
                parentNode.sortChildren();
            }
        }

        //if there were any change related to this node
        if (nodeDataChanged === true) {
            node.render();

            //a bit of visual effect
            this._animateNode(node);

            //log
            this._logger.debug("Node updated: " + node.data.key);
        }
    };


    /**
     * Called when a node is opened in the tree
     * PLEASE OVERRIDE TO FILL THE NODES CHILDREN
     * @param nodeId
     */
    TreeBrowserWidget.prototype.onNodeOpen = function (nodeId) {
        this._logger.warning("Default onNodeOpen for node " + nodeId + " called, doing nothing. Please override onNodeOpen(nodeId)");
    };

    /**
     * Called when a node is closed in the tree
     * PLEASE OVERRIDE TO HANDLE NODE CLOSE
     * DOM children will be cleared out from the tree
     * @param nodeId
     */
    TreeBrowserWidget.prototype.onNodeClose = function (nodeId) {
        this._logger.warning("Default onNodeClose for node " + nodeId + " called, doing nothing. Please override onNodeClose(nodeId)");
    };

    /*
     * Called when a node's title is changed in the reeview
     * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
     */
    TreeBrowserWidget.prototype.onNodeTitleChanged = function (nodeId, oldText, newText) {
        this._logger.warning("Default onNodeTitleChanged for node " + nodeId + " called, doing nothing. Please override onNodeTitleChanged(nodeId, oldText, newText)");
        return true;
    };

    /*
     * Collapses the given node
     */
    TreeBrowserWidget.prototype.collapse = function (node) {
        node.expand(false);
    };

    /*
     * Expands the given node
     */
    TreeBrowserWidget.prototype.expand = function (node) {
        node.expand(true);
    };

    TreeBrowserWidget.prototype.isExpanded = function (node) {
        //if the node is null its most propably represents the root
        //and the root is always expanded (since is not shown in the tree)
        if (node === null) {
            return true;
        }

        return node.isExpanded();
    };


    TreeBrowserWidget.prototype._animateNode = function (node) {

        //if animation is enabled for the widget
        if (this._animation === true) {
            //force rendering of the node otherwise may happen that its DOM representation is not ready
            node.render();

            var jQureyNode = $(node.span.children[2]);
            jQureyNode.hide();
            jQureyNode.fadeIn('fast');
        }
    };

    TreeBrowserWidget.prototype._onNodeMouseDown = function (node, event) {
        var self = this,
            modifierKey = event.ctrlKey === true || event.metaKey === true;

        if (modifierKey) {
            //modifier key pressed
            //handle multi selection/deselection
            this._logger.debug("_onNodeMouseDown: " + node.data.title + " --> toggleSelect");
            node.toggleSelect();
        } else {
            //no modifier key pressed
            //check if the current node is selected or not
            //if selected already, don't do anything
            //if not yet selected, deselect all and select this one only
            if (!node.isSelected()) {
                //deselect everyone and select the clicked one
                this._logger.debug("_onNodeMouseDown: " + node.data.title + " --> select this one only");
                this._deselectSelectedNodes();
                node.select(true);
            } else {
                this._logger.debug("_onNodeMouseDown: " + node.data.title + " --> already selected, noop");
            }
        }
    };

    TreeBrowserWidget.prototype._makeNodeDraggable = function (node) {
        var nodeEl = $(node.span),
            self = this;

        dragSource.makeDraggable(nodeEl, {
            'helper': function (event) {
                return self._dragHelper(this, event);
            },
            'dragItems': function (el) {
                return self.getDragItems(el);
            },
            'dragEffects': function (el) {
                return self.getDragEffects(el);
            },
            'dragParams': function (el) {
                return self.getDragParams(el);
            }
        });
    };

    /* OVERWRITE DragSource.prototype.dragHelper */
    TreeBrowserWidget.prototype._dragHelper = function (el, event) {
        var helperEl = el.clone(),
            wrapper = $('<div class="' + TREE_BROWSER_CLASS + '"><ul class="dynatree-container"><li></li></ul></div>'),
            selectedIds,
            selNodes,
            i,
            removeClasses = ['dynatree-selected',
            'dynatree-focus',
            'dynatree-has-children',
            'dynatree-lazy',
            'dynatree-lastsib',
            'dynatree-exp-cdl',
            'dynatree-ico-c'];

        //trim down unnecessary DOM elements from it
        helperEl.children().first().remove();
        helperEl.removeClass(removeClasses.join(' '));

        wrapper.find('li').append(helperEl);

        helperEl = wrapper;

        selectedIds = [];
        selNodes = this._treeEl.dynatree("getTree").getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            if (selNodes[i].data.addClass !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].data.key);
            }
        }

        if (selectedIds.length > 1) {
            var t = helperEl.find('.dynatree-title').text();
            helperEl.find('.dynatree-title').text(t + ' (+' + (selectedIds.length - 1) + ')');
        }

        return helperEl;
    };

    TreeBrowserWidget.prototype.getDragItems = function (el) {
        this._logger.warning("TreeBrowserWidget.getDragItems is not overridden in the controller!!!");
        return [];
    };

    TreeBrowserWidget.prototype.getDragEffects = function (el) {
        this._logger.warning("TreeBrowserWidget.getDragEffects is not overridden in the controller!!!");
        return [];
    };

    TreeBrowserWidget.prototype.getDragParams = function (el) {
        this._logger.debug("TreeBrowserWidget.getDragParams is not overridden in the controller!!!");
        return undefined;
    };

    TreeBrowserWidget.prototype.DRAG_EFFECTS = dragSource.DRAG_EFFECTS;

    TreeBrowserWidget.prototype._nodeEdit = function (nodeToEdit) {
        var self = this;

        //can not edit 'loading...' node
        if (nodeToEdit.data.addClass === NODE_PROGRESS_CLASS) {
            return;
        }

        if (this._enableNodeRename !== true) {
            return;
        }

        this._logger.debug("Edit node: " + nodeToEdit.data.key);

        $(nodeToEdit.span).find('a').editInPlace({"class": "",
            "onChange": function (oldValue, newValue) {
                self.onNodeTitleChanged.call(self, nodeToEdit.data.key, oldValue, newValue);
            }
        });
    };

    TreeBrowserWidget.prototype._nodeCopy = function () {
        var selectedIds = [],
            selNodes,
            i;

        selNodes = this._treeEl.dynatree("getTree").getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            //can not copy 'loading...' node
            if (selNodes[i].data.addClass !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].data.key);
            }
        }

        this._logger.debug("Copy " +  selectedIds);
        if ($.isFunction(this.onNodeCopy)) {
            this.onNodeCopy(selectedIds);
        }
    };

    TreeBrowserWidget.prototype._nodePaste = function (node) {
        //can not paste to 'loading...' node
        if (node.data.addClass === NODE_PROGRESS_CLASS) {
            return;
        }
        this._logger.debug("Paste " +  node.data.key);
        if ($.isFunction(this.onNodePaste)) {
            this.onNodePaste(node.data.key);
        }
    };

    TreeBrowserWidget.prototype._nodeDelete = function (node) {
        var selectedIds,
            selNodes,
            i;

        //can not delete 'loading...' node
        if (node.data.addClass === NODE_PROGRESS_CLASS) {
            return;
        }

        selectedIds = [];

        selNodes = this._treeEl.dynatree("getTree").getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            if (selNodes[i].data.addClass !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].data.key);
            }
        }

        this._logger.debug("Delete " +  selectedIds);
        if ($.isFunction(this.onNodeDelete)) {
            this.onNodeDelete(selectedIds);
        }
    };

    /*
     * Deselect all the selected nodes in the tree
     */
    TreeBrowserWidget.prototype._deselectSelectedNodes = function () {
        var i,
            selNodes;

        //deselect everyone else
        selNodes = this._treeEl.dynatree("getTree").getSelectedNodes();

        for (i = 0; i < selNodes.length; i += 1) {
            selNodes[i].select(false);
        }
        this._dropSelectionStateWithShift();
    };


    TreeBrowserWidget.prototype._createContextMenu = function($trigger) {
        var node = $.ui.dynatree.getNode($trigger),
            menuItems = {},
            self = this,
            contextMenuOptions = {'rename': this._enableNodeRename,
                                  'delete': true};

        //context menu is available for nodes that are not currently in 'loading' state
        if ($trigger.hasClass(NODE_PROGRESS_CLASS) !== true) {

            self.onCreatingContextMenu(node.data.key, contextMenuOptions);
            contextMenuOptions.rename = this._enableNodeRename;

            // The default set of available items :  Rename, Create, Copy, Paste, Delete
            menuItems = {
                "toggleNode":  { // The "open/close" menu item
                    "name": "Open",
                    callback: function(/*key, options*/) {
                        node.toggleExpand();
                    },
                    "icon": false
                },
                "openInVisualizer": { // The "select (aka double-click)" menu item
                    "name": "Open in visualizer",
                    callback: function(/*key, options*/) {
                        self.onNodeDoubleClicked.call(self, node.data.key);
                    },
                    "icon": false
                }
            };

            if (contextMenuOptions.rename === true) {
                menuItems.separatorRename = "-";
                menuItems.rename = { // The "rename" menu item
                    "name": "Rename",
                        callback: function(/*key, options*/) {
                        self._nodeEdit(node);
                    },
                    "icon": "edit"
                };
            }

            if (contextMenuOptions.delete === true) {
                menuItems.separatorDelete = "-";
                menuItems.delete = { // The "delete" menu item
                    "name": "Delete",
                        callback: function(/*key, options*/) {
                        self._nodeDelete(node);
                    },
                    "icon": "delete"
                };
            }

            if ($trigger.hasClass('dynatree-has-children') === true) {
                if(node.isExpanded()) {
                    menuItems["toggleNode"].name = "Close";
                }
            } else {
                delete menuItems["toggleNode"];
            }

            self.onExtendMenuItems(node.data.key ,menuItems);
        }

        //return the complete action set for this node
        return menuItems;
    };

    TreeBrowserWidget.prototype.getSelectedIDs = function () {
        var selectedIds = [],
            selNodes,
            i;

        selNodes = this._treeEl.dynatree("getTree").getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            if (selNodes[i].data.addClass !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].data.key);
            }
        }

        return selectedIds;
    };


    TreeBrowserWidget.prototype.onExtendMenuItems = function (nodeId, menuItems) {
        this._logger.debug('onExtendMenuItems is not overridden for node with ID: "' + nodeId + '".');
    };

    TreeBrowserWidget.prototype.onCreatingContextMenu = function (nodeId, contextMenuOptions) {
        this._logger.debug('onCreatingContextMenu is not overridden for node with ID: "' + nodeId + '", contextMenuOptions: ' + JSON.stringify(contextMenuOptions));
    };

    _.extend(TreeBrowserWidget.prototype, TreeBrowserWidgetKeyboard.prototype);

    return TreeBrowserWidget;
});
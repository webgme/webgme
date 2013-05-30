/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";
/*
 * WIDGET TreeBrowserWidget based on DynaTree
 */
define(['logManager',
    'js/Constants',
    'lib/jquery/jquery.dynatree-1.2.4.min',
    'lib/jquery/jquery.contextMenu',
    'css!/css/Widgets/TreeBrowser/TreeBrowserWidget'], function (logManager, CONSTANTS) {

    var NODE_PROGRESS_CLASS = 'node-progress',
        TREE_BROWSER_CLASS = "tree-browser";

    var TreeBrowserWidget = function (container/*, params*/) {
        //get this._logger instance for this component
        this._logger = logManager.create("TreeBrowserWidget");

        //save parent control
        this._el =  container;

        this._initialize();

        this._logger.debug('Ctor finished...');
    };

    TreeBrowserWidget.prototype._initialize = function () {
        var self = this,  //save this for later use
            lastSelection = { "nodeId" :  null, "time" : null };

        //clear container content
        this._el.html("");

        //set Widget title
        this._el.addClass(TREE_BROWSER_CLASS);

        //by default use visual animations to reflect changes in the tree
        this._animation = true;

        //generate control dynamically
        this._treeEl = $('<div/>', {});

        //add control to parent
        this._el.append(this._treeEl);

        //hook up jquery.contextMenu
        $.contextMenu({
            selector: '.dynatree-node',
            position: function(selector/*, x, y*/) {
                var _offset = selector.$trigger.find('.dynatree-icon').offset();
                selector.$menu.css({top: _offset.top + 10, left: _offset.left + 10});
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
                    items: self._createContextMenu($trigger)
                };
            }
        });

        //create tree using DynaTree
        this._treeEl.dynatree({
            checkbox: false,
            selectMode: 2,
            keyboard: true,
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
                var currentSelectionTime,
                    delta;

                //single click on the title means rename if the node is already selected
                if (node.getEventTargetType(event) === "title") {

                    //if node was already selected and
                    // if Ctrl is pressed, alter range selection, toggle this node's selection status
                    if (event.ctrlKey === true) {
                        node.toggleSelect();
                        node.focus();
                        lastSelection = { "nodeId" :  null, "time" : null };
                        return false;// Prevent default processing
                    } else {
                        //if node is already selected and clicked again, enter edit mode
                        //if node was not selected, then select it and deselect everyone else
                        if (node.isSelected() === true) {
                            currentSelectionTime = new Date();
                            delta = currentSelectionTime - lastSelection.time;
                            if (delta <= 500) {
                                //consider as double click and propagate node selection to upper contorol
                                if ($.isFunction(self.onNodeDoubleClicked)) {
                                    self._logger.debug("Node double-click: " + node.data.key);
                                    self.onNodeDoubleClicked.call(self, node.data.key);
                                }
                            } else if ((delta > 500) && (delta <= 1000)) {
                                editNode(node);
                                lastSelection = { "nodeId" :  null, "time" : null };
                            } else {
                                lastSelection.time = new Date();
                            }
                            event.preventDefault();
                            return false; // Prevent default processing
                        } else {
                            self._deselectSelectedNodes();
                            //finally select this node
                            node.select(true);
                            node.focus();
                            lastSelection = { "nodeId" :  node.data.key, "time" : new Date() };
                            event.preventDefault();
                            return false;
                        }
                    }
                } else {
                    //if the click does not happen on the title or expander, don't handle it
                    if (node.getEventTargetType(event) !== "expander") {
                        return false;
                    }
                }
            },

            //onSelect: function (select, node) {
            // Display list of selected nodes
            /* var selNodes = node.tree.getSelectedNodes();
             // convert to title/key array
             var selKeys = $.map(selNodes, function (node) {
             return "[" + node.data.key + "]: '" + node.data.title + "'";
             });
             this._logger.debug(selKeys.join(", "));*/
            //},

            //we don't need an activation here, it just messes up the UI
            onQueryActivate: function () {
                return false;
            },

            onKeydown: function (node, event) {
                var sib = null,
                    parents,
                    i;

                switch (event.which) {
                    case 46:    // DEL
                        self._nodeDelete(node);
                        return false;
                        break;
                    // Handle Ctrl-C, -X and -V
                    case 67:
                        if (event.ctrlKey) { // Ctrl-C
                            self._nodeCopy(node);
                            return false;
                        }
                        break;
                    case 86:
                        if (event.ctrlKey) { // Ctrl-V
                            self._nodePaste(node);
                            return false;
                        }
                        break;
                    case 113: //F2
                        self._nodeEdit(node);
                        return false;
                    case 13: //ENTER
                        self.onNodeDoubleClicked.call(self, node.data.key);
                        return false;
                    case 37: // <left>
                        if (node.bExpanded) {
                            node.toggleExpand();
                            node.focus();
                            node.select(true);
                        }
                        return false;
                    case 39: // <right>
                        if (!node.bExpanded && (node.childList || node.data.isLazy)) {
                            node.toggleExpand();
                            node.focus();
                            node.select(true);
                        }
                        return false;
                    case 38: // <up>
                        if (event.shiftKey !== true) {
                            self._deselectSelectedNodes();
                        }
                        sib = node.getPrevSibling();
                        while (sib && sib.bExpanded && sib.childList) {
                            sib = sib.childList[sib.childList.length - 1];
                        }
                        if (!sib && node.parent && node.parent.parent) {
                            sib = node.parent;
                        }
                        if (sib) {
                            sib.focus();
                            sib.select(true);
                        }
                        return false;
                    case 40: // <down>
                        if (event.shiftKey !== true) {
                            self._deselectSelectedNodes();
                        }
                        if (node.bExpanded && node.childList) {
                            sib = node.childList[0];
                        } else {
                            parents = node._parentList(false, true);
                            for (i = parents.length - 1; i >= 0; i -= 1) {
                                sib = parents[i].getNextSibling();
                                if (sib) {
                                    break;
                                }
                            }
                        }
                        if (sib) {
                            sib.focus();
                            sib.select(true);
                        }
                        return false;
                }

                return true;
            },

            onCreate: function (node/*, span*/) {
                self._makeNodeDraggable(node);
            }
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
                if (objDescriptor.name < existingChildren[i].data.title) {
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

        //check if valid node
        if (!node) {
            return;
        }

        //by default we say there is nothing to update
        var nodeDataChanged = false;

        //set new text value (if any)
        if (objDescriptor.text && node.data.title !== objDescriptor.text) {
            node.data.title = objDescriptor.text;
            node.data.tooltip = objDescriptor.text;

            //mark that change happened
            nodeDataChanged = true;
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


    TreeBrowserWidget.prototype._makeNodeDraggable = function (node) {
        var nodeEl = $(node.span),
            removeClasses = ['dynatree-selected',
            'dynatree-focus',
            'dynatree-has-children',
            'dynatree-lazy',
            'dynatree-lastsib',
            'dynatree-exp-cdl',
            'dynatree-ico-c'];

        nodeEl.draggable({
            zIndex: 100000,
            appendTo: $(CONSTANTS.ALL_OVER_THE_SCREEN_DRAGGABLE_PARENT_ID).first(),
            cursorAt: { left: 0, top: -2 },
            helper: function (/*event*/) {
                var helperEl = nodeEl.clone(),
                    wrapper = $('<div class="' + TREE_BROWSER_CLASS + '"><ul class="dynatree-container"><li></li></ul></div>'),
                    metaInfo;

                //trim down unnecessary DOM elements from it
                helperEl.children().first().remove();
                helperEl.removeClass(removeClasses.join(' '));

                wrapper.find('li').append(helperEl);

                helperEl = wrapper;

                //add extra GME related drag info
                metaInfo = {};
                metaInfo[CONSTANTS.GME_ID] =  node.data.key;
                helperEl.data("metaInfo", metaInfo);

                return helperEl;
            }
        });
    };

    TreeBrowserWidget.prototype._nodeCreate = function (nodeToEdit) {

        //can not edit 'loading...' node
        if (nodeToEdit.data.addClass === NODE_PROGRESS_CLASS) {
            return;
        }

        this._logger.debug("Create child for " + nodeToEdit.data.key);
        this.onNodeCreate(nodeToEdit.data.key);
    };

    TreeBrowserWidget.prototype._nodeEdit = function (nodeToEdit) {
        var self = this;

        //can not edit 'loading...' node
        if (nodeToEdit.data.addClass === NODE_PROGRESS_CLASS) {
            return;
        }

        $(nodeToEdit.span).find('a').editInPlace({"class": "",
            "onChange": function (oldValue, newValue) {
                self.onNodeTitleChanged.call(self, nodeToEdit.data.key, oldValue, newValue);
            }
        });
    };

    TreeBrowserWidget.prototype._nodeCopy = function (node) {
        var selectedIds,
            selNodes,
            i;

        //can not copy 'loading...' node
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
    };


    TreeBrowserWidget.prototype._createContextMenu = function($trigger) {
        var node = $.ui.dynatree.getNode($trigger),
            menuItems = {},
            self = this;

        //context menu is available for nodes that are not currently in 'loading' state
        if ($trigger.hasClass(NODE_PROGRESS_CLASS) !== true) {

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
                },
                "separator1": "-",
                "rename": { // The "rename" menu item
                    "name": "Rename",
                    callback: function(/*key, options*/) {
                        self._nodeEdit(node);
                    },
                    "icon": "edit"
                },
                "separator2": "-",
                "addChild": { // The "create" menu item
                    "name": "Create",
                    callback: function(/*key, options*/) {
                        self._nodeCreate(node);
                    },
                    "icon": "add"
                },
                "separator3": "-",
                "copy": { // The "copy" menu item
                    "name": "Copy",
                    callback: function(/*key, options*/) {
                        self._nodeCopy(node);
                    },
                    "icon": "copy"
                },
                "paste": { // The "paste" menu item
                    "name": "Paste",
                    callback: function(/*key, options*/) {
                        self._nodePaste(node);
                    },
                    "icon": "paste"
                },
                "separator4": "-",
                "delete": { // The "delete" menu item
                    "name": "Delete",
                    callback: function(/*key, options*/) {
                        self._nodeDelete(node);
                    },
                    "icon": "delete"
                }
            };

            if ($trigger.hasClass('dynatree-has-children') === true) {
                if(node.isExpanded()) {
                    menuItems["toggleNode"].name = "Close";
                }
            } else {
                delete menuItems["toggleNode"];
            }
        }

        //return the complete action set for this node
        return menuItems;
    };



    return TreeBrowserWidget;
});
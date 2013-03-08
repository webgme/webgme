"use strict";
/*
 * WIDGET TreeBrowserWidget based on JSTree
 */
define(['clientUtil',
        'logManager',
        'commonUtil',
        'js/Constants',
        'lib/jquery/jquery.hotkeys',
        'lib/jquery/jquery.jstree',
        'css!/css/JSTreeBrowserWidget'], function (util, logManager, commonUtil, CONSTANTS) {

    var JSTreeBrowserWidget = function (containerId) {
        //save this for later use
        var self = this,
            logger,
            animation = true, //by default use visual animation to reflect changes in the tree
            containerControl,
            guid,
            treeViewE,
            getSelectedNodeIds,
            copyNode,
            pasteNode,
            deleteNode,
            editNode,
            createNode,
            customContextMenu,
            animateNode,
            focusNode,
            lastSelection,
            openInVisualizer;

        //get logger instance for this component
        logger = logManager.create("JSTreeBrowserWidget");

        //save parent control
        containerControl = $("#" + containerId);

        if (containerControl.length === 0) {
            logger.error("JSTreeBrowserWidget's container control with id:'" + containerId + "' could not be found");
            return undefined;
        }

        //clear container content
        containerControl.html("");

        //generate unique id for control
        guid = commonUtil.guid();

        //generate control dynamically
        treeViewE = $('<div/>', {
            "id": "jstree_" + guid
        });

        //add control to parent
        containerControl.append(treeViewE);

        //returns the ID of each selected node in the tree
        getSelectedNodeIds = function () {
            var selectedIds = [];

            treeViewE.jstree("get_selected").each(function () {
                //only interested in nodes that have been fully loaded and displayed
                if ($(this).hasClass("gme-loading") !== true) {
                    selectedIds.push($(this).attr("nId"));
                }
            });

            return selectedIds;
        };


        //Called when the ContexMenu's 'Copy' action is selected for the node
        copyNode = function () {
            var selectedIds = getSelectedNodeIds();
            if (selectedIds.length > 0) {
                logger.debug("Copy " + selectedIds);
                if ($.isFunction(self.onNodeCopy)) {
                    self.onNodeCopy.call(self, selectedIds);
                }
            }
        };

        //Called when the ContexMenu's 'Paste' action is selected for the node
        pasteNode = function (nodeId) {
            logger.debug("Paste " + nodeId);
            if ($.isFunction(self.onNodePaste)) {
                self.onNodePaste.call(self, nodeId);
            }
        };

        //Called when the ContexMenu's 'Delete' action is selected for the node
        deleteNode = function () {
            var selectedIds = getSelectedNodeIds();
            if (selectedIds.length > 0) {
                logger.debug("Delete " + selectedIds);
                if ($.isFunction(self.onNodeDelete)) {
                    self.onNodeDelete.call(self, selectedIds);
                }
            }
        };

        //Called when the ContexMenu's 'Rename' action is selected for the node
        editNode = function (nodeId) {
            logger.debug("Edit " + nodeId);
            treeViewE.jstree("rename", null);
        };

        //Called when the ContexMenu's 'Create' action is selected for the node
        createNode = function (nodeId) {
            logger.debug("Create child for " + nodeId);
            if ($.isFunction(self.onNodeCreate)) {
                self.onNodeCreate.call(self, nodeId);
            }
        };

        //Called when the ContexMenu's 'Open in Visualizer' action is selected for the node
        openInVisualizer = function (nodeId) {
            logger.debug("OpenInVisualizer for " + nodeId);
            if ($.isFunction(self.onNodeDoubleClicked)) {
                self.onNodeDoubleClicked.call(self, nodeId);
            }
        };

        //Called when the user right-clicks on a node and
        //the customized context menu has to be displayed
        customContextMenu = function (node) {
            //the object will hold the available context menu actions
            var items = {};

            //context menu is available for nodes that are not currently in 'loading' state
            if (node.hasClass("gme-loading") !== true) {

                // The default set of available items :  Rename, Create, Copy, Paste, Delete
                items = {
                    "toggleNode":  { // The "open/close" menu item
                        "label": "Open",
                        "separator_before": true,
                        "action": function (obj) {
                            $.jstree._reference(treeViewE).toggle_node(node);
                        },
                        "icon": false
                    },
                    "openInVisualizer": { // The "rename" menu item
                        "label": "Open in visualizer",
                        "action": function (obj) {
                            openInVisualizer(obj.attr("nId"));
                        },
                        "icon": false
                    },
                    "renameItem": { // The "rename" menu item
                        "label": "Rename",
                        "separator_before": true,
                        "action": function (obj) {
                            editNode(obj.attr("nId"));
                        },
                        "icon": "img/edit.png"
                    },
                    "addChildItem": { // The "create" menu item
                        "label": "Create",
                        "separator_before": true,
                        "action": function (obj) {
                            createNode(obj.attr("nId"));
                        },
                        "icon": "img/create.png"
                    },
                    "copyItem": { // The "delete" menu item
                        "label": "Copy",
                        "separator_before": true,
                        "action": function (obj) {
                            copyNode(obj.attr("nId"));
                        },
                        "icon": "img/copy.png"
                    },
                    "pasteItem": { // The "delete" menu item
                        "label": "Paste",
                        "action": function (obj) {
                            pasteNode(obj.attr("nId"));
                        },
                        "icon": "img/paste.png"
                    },
                    "deleteItem": { // The "delete" menu item
                        "label": "Delete",
                        "separator_before": true,
                        "action": function (obj) {
                            deleteNode(obj.attr("nId"));
                        },
                        "icon": "img/delete.png"
                    }
                };

                if ($.jstree._reference(treeViewE).is_leaf(node) === false) {
                    if($.jstree._reference(treeViewE).is_open(node)) {
                        items["toggleNode"].label = "Close";
                    }
                } else {
                    delete items["toggleNode"];
                }
            }

            //return the complete action set for this node
            return items;
        };

        /*
         * Applies a visual animation to the specfied node to get user's attention
         */
        animateNode = function (node) {
            //if animation is enabled for the widget
            if (animation === true) {
                var nodePartToAnimate = $(node[0].children[1]);
                nodePartToAnimate.hide();
                nodePartToAnimate.fadeIn('fast');
            }
        };

        /*
         * set's focus on the given node's 'a' tag (if any)
         */
        focusNode = function (node) {
            //find the 'a' tag in it and set focus on that
            var aTag = node[0].children[1];
            if (aTag) {
                aTag.focus();
            }
        };

        /*
         * local variale for the last selected node (node double click for edit node handler helper)
         */
        lastSelection = { "nodeId" :  null, "time" : null };

        //construct the tree itself using jsTree
        treeViewE.jstree({
            "plugins": ["themes", "html_data", "contextmenu", "ui", "crrm"],
            "open_parents": false,
            "contextmenu": {
                "select_node": "true",
                "show_at_node": "true",
                "items": function (node) {
                    return customContextMenu(node);
                }
            },
            "themes" : {
                "dots" : false,
                "url": "css/jstree/style.css"
            }
        });

        this.treeInstance = jQuery.jstree._reference(treeViewE);

        //hook up 'node opened' EventHandler
        treeViewE.bind("open_node.jstree", function (e, data) {
            //get the node which is about to open
            var nodeOpening = data.args[0];

            //call event handler if exist
            if ($.isFunction(self.onNodeOpen)) {
                self.onNodeOpen.call(self, nodeOpening.attr("nId"));
            }
        });

        //hook up close open eventhandler
        treeViewE.bind("close_node.jstree", function (e, data) {
            //get the node which is about to open
            var nodeClosing = data.args[0];

            //delete children
            treeViewE.jstree("delete_node", nodeClosing.find('> ul > li'));

            //hack tree to show the node as an closed but openable treenode
            nodeClosing.removeClass('jstree-leaf').addClass('jstree-closed');

            if ($.isFunction(self.onNodeClose)) {
                self.onNodeClose.call(self, nodeClosing.attr("nId"));
            }
        });

        //hook up close open eventhandler
        treeViewE.bind("rename.jstree", function (e, data) {
            //get the node which is about to open
            var renamedNode = data.rslt.obj,
                oldName = data.rslt.old_name,
                newName = data.rslt.new_name;

            if (oldName !== newName) {
                if ($.isFunction(self.onNodeTitleChanged)) {
                    self.onNodeTitleChanged.call(self, renamedNode.attr("nId"), oldName, newName);
                }
            }

            //set focus back to the renamed node
            focusNode(renamedNode);
        });

        //hook up node selection event handler to properly set focus on selected node
        treeViewE.bind("select_node.jstree", function (e, data) {
            var delta,
                currentSelection;

            if (data.rslt.obj.hasClass("gme-loading") === true) {
                return;
            }

            //fisrt focus the node
            focusNode(data.rslt.obj);

            //save current selection
            currentSelection = { "nodeId" : data.rslt.obj.attr("nId"), "time" : new Date() };

            //compare with saved last selection info to see if edit node criteria is met or not
            if (lastSelection.nodeId === currentSelection.nodeId) {
                delta = currentSelection.time - lastSelection.time;

                if (delta <= 500) {
                    //consider as double click and propagate node selection to upper contorol
                    if ($.isFunction(self.onNodeDoubleClicked)) {
                        logger.debug("Node double-click: " + currentSelection.nodeId);
                        self.onNodeDoubleClicked.call(self, currentSelection.nodeId);
                        e.stopPropagation();
                        e.preventDefault();
                    }
                } else if ((delta > 500) && (delta <= 1000)) {
                    //consider as two slow click --> edit node

                    //edit node
                    editNode(lastSelection.nodeId);

                    //clear last selection
                    lastSelection = { "nodeId" :  null, "time" : null };
                } else {
                    lastSelection.time = new Date();
                }
            } else {
                //save this selection as last
                lastSelection = { "nodeId" :  currentSelection.nodeId, "time" : currentSelection.time };
            }

            e.preventDefault();
        });

        //hook up node selection event handler to properly set focus on last selected node (if any)
        treeViewE.bind("deselect_node.jstree", function () {
            //find the a tag in is and set focus on that
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            if (o && o.length > 0) {
                focusNode(o);
            }
        });


        //hook up keyboard handlers
        //CTRL+C -- copy selected node(s)
        treeViewE.bind('keydown', 'Ctrl+c', function () {
            var o = $.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ($(o).hasClass("gme-loading") !== true) {
                copyNode(o.attr("nId"));
            }
            return false;
        });

        //CTRL+V -- paste clipboard under selected node
        treeViewE.bind('keydown', 'Ctrl+v', function () {
            var o = $.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ($(o).hasClass("gme-loading") !== true) {
                pasteNode(o.attr("nId"));
            }
            return false;
        });

        //DELETE -- delete selected node(s)
        treeViewE.bind('keydown', 'del', function () {
            var o = $.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ($(o).hasClass("gme-loading") !== true) {
                deleteNode(o.attr("nId"));
            }
            return false;
        });

        //F2 -- rename selected node
        treeViewE.bind('keydown', 'f2', function () {
            var o = $.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ($(o).hasClass("gme-loading") !== true) {
                editNode(o.attr("nId"));
            }
            return false;
        });

        //UP -- move selection to previous node
        treeViewE.bind('keydown', 'up', function () {
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            treeViewE.jstree("get_selected").each(function () {
                $.jstree._reference(treeViewE).deselect_node(this);
            });
            $.jstree._reference(treeViewE).select_node($.jstree._reference(treeViewE)._get_prev(o));
            return false;
        });

        //SHIFT+UP -- move to previous node and add it to the selection range
        treeViewE.bind('keydown', 'shift+up', function () {
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            $.jstree._reference(treeViewE).select_node($.jstree._reference(treeViewE)._get_prev(o));
            return false;
        });

        //DOWN -- move to next node
        treeViewE.bind('keydown', 'down', function () {
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            //deselect all selected
            treeViewE.jstree("get_selected").each(function () {
                $.jstree._reference(treeViewE).deselect_node(this);
            });
            $.jstree._reference(treeViewE).select_node($.jstree._reference(treeViewE)._get_next(o));
            return false;
        });

        //SHIFT+DOWN -- move to next node and add it to the selection range
        treeViewE.bind('keydown', 'shift+down', function () {
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            $.jstree._reference(treeViewE).select_node($.jstree._reference(treeViewE)._get_next(o));
            return false;
        });

        //LEFT -- close node if it was open
        treeViewE.bind('keydown', 'left', function () {
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            //open if closed or go to next
            if (o.hasClass("jstree-open")) {
                $.jstree._reference(treeViewE).close_node(o);
            }
            return false;
        });

        //RIGHT -- open node if it was closed
        treeViewE.bind('keydown', 'right', function () {
            var o = $.jstree._reference(treeViewE).data.ui.last_selected;
            //close if opened or go to prev
            if (o.hasClass("jstree-closed")) {
                $.jstree._reference(treeViewE).open_node(o);
            }
            return false;
        });

        treeViewE.bind("dblclick.jstree", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        /*
         * PUBLIC METHODS
         */

        /*
         * Creates a node in the tree with the given parameters
         */
        this.createNode = function (parentNode, objDescriptor) {
            var newNode,
                newNodeData,
                existingChildren,
                i,
                insertPos = -1,
                makeNodeDraggable;

            //check if the parentNode is null or not
            //when null, the new node belongs to the root
            if (parentNode === null) {
                // Now get the root node object
                parentNode = -1;
            }

            newNodeData = {
                "data": { title : objDescriptor.name },
                "attr": { "nId": objDescriptor.id }
            };

            if (objDescriptor.icon) {
                newNodeData.data.icon = objDescriptor.icon;
            }

            if (objDescriptor["class"]) {
                newNodeData.attr["class"] = objDescriptor["class"];
            }

            if (objDescriptor.hasChildren === true) {
                newNodeData.state = "closed";
            }

            //figure out its place in the tree
            existingChildren = this.treeInstance._get_children(parentNode);

            for (i = 0; i < existingChildren.length; i += 1) {
                if (newNodeData.data.title < this.treeInstance.get_text(existingChildren[i])) {
                    /*if (insertPos !== -1) {
                        if (this.treeInstance.get_text(existingChildren[i]) < this.treeInstance.get_text(existingChildren[insertPos])) {
                            insertPos = i;
                        }
                    } else {
                        insertPos = i;
                    }*/
                    insertPos = i;
                    break;
                }
            }

            if (insertPos === -1) {
                insertPos = "last";
            }

            //using core module
            newNode = treeViewE.jstree("create_node", parentNode, insertPos, newNodeData, false);

            if (objDescriptor.icon) {
                $(newNode[0].children[1].children[0]).css("background-image", "url(" + objDescriptor.icon + ")");
                $(newNode[0].children[1].children[0]).css("background-position", "0 0");
            }

            //log
            logger.debug("New node created: " + objDescriptor.id);

            //hook up draggable
            makeNodeDraggable = function (node) {
                var nodeEl = node;

                nodeEl.draggable({
                    zIndex: 100000,
                    appendTo: $("body").find("#" + CONSTANTS.ALL_OVER_THE_SCREEN_DRAGGABLE_PARENT_ID).first(),
                    cursorAt: { left: 0, top: 5 },
                    helper: function (event) {
                        var helperEl = nodeEl.clone(),
                            wrapper = $('<div class="jstree jstree-default"><ul class="jstree-no-dots"></ul></div>'),
                            metaInfo;

                        //trim down unnecessary DOM elements from it
                        helperEl.children().first().remove();
                        helperEl.find("ul").remove();
                        helperEl.find(".jstree-hovered").removeClass("jstree-hovered");
                        helperEl.find(".jstree-clicked").removeClass("jstree-clicked");

                        wrapper.find('ul').append(helperEl);

                        helperEl = wrapper;

                        //add extra GME related drag info
                        metaInfo = {};
                        metaInfo[CONSTANTS.GME_ID] =  node.attr("nId");
                        helperEl.data("metaInfo", metaInfo);

                        helperEl[0].GMEDragData = { "type": "simple-drag",
                                             "id": node.attr("nId")};

                        return helperEl;
                    },
                    start: function (event, ui) {
                    },
                    stop: function (event, ui) {
                    },
                    drag: function (event, ui) {
                    }
                });
            };

            makeNodeDraggable(newNode);

            //a bit of visual effect
            animateNode(newNode);

            //return the newly created node
            return newNode;
        };

        /*
         * Updates a node in the tree with the given parameters
         */
        this.updateNode = function (node, objDescriptor) {
            var currentIcon,
                currentlyHasChildren,
                currentText,
                nodeDataChanged = false, //by default there is nothing to update
                existingChildren,
                i,
                parentNode,
                selfIndex,
                childNode,
                insertPos = -1;

            //check if valid node
            if (!node) {
                return;
            }

            parentNode = this.treeInstance._get_parent(node);

            //set new text value (if any)
            if (objDescriptor.text) {

                currentText = treeViewE.jstree("get_text", node);

                if (currentText !== objDescriptor.text) {
                    treeViewE.jstree("set_text", node, objDescriptor.text);

                    if (parentNode && parentNode !== -1) {
                        //figure out its place in the tree
                        existingChildren = this.treeInstance._get_children(parentNode);

                        for (i = 0; i < existingChildren.length; i += 1) {
                            childNode = this.treeInstance._get_node(existingChildren[i]);
                            if (childNode.attr("nId") !== node.attr("nId")) {
                                if (objDescriptor.text < this.treeInstance.get_text(existingChildren[i])) {
                                    insertPos = i;
                                    break;
                                }
                            } else {
                                selfIndex = i;
                            }
                        }

                        if (insertPos === -1) {
                            insertPos = "last";
                        } else {
                            if (insertPos === selfIndex + 1) {
                                //no place change needed
                                insertPos = -1;
                            }
                        }

                        if (insertPos !== -1) {
                            //need to replace it
                            this.treeInstance.move_node(node, parentNode, insertPos, false, false, false);
                        }
                    }

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            if (objDescriptor.hasChildren === true || objDescriptor.hasChildren === false) {

                //set new children value (if any)
                //check if parent has any children
                currentlyHasChildren = !treeViewE.jstree("is_leaf", node);

                if (objDescriptor.hasChildren !== currentlyHasChildren) {

                    if (objDescriptor.hasChildren === true) {
                        //hack tree to show the node as an closed but openable treenode
                        node.removeClass('jstree-leaf').addClass('jstree-closed');
                    } else {
                        treeViewE.jstree("close_node", node);
                        //hack tree to show the node as an closed but openable treenode
                        node.removeClass('jstree-closed').addClass('jstree-leaf');
                    }

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            //remove loading if it was there
            if (node.hasClass("gme-loading") === true) {
                node.removeClass("gme-loading");
            }

            //set new class definition (if any)
            if (objDescriptor["class"]) {
                if (node.hasClass(objDescriptor["class"]) !== true) {

                    //add new class
                    node.addClass(objDescriptor["class"]);

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            if (objDescriptor.icon) {
                currentIcon = $(node[0].children[1].children[0]).css("background-image");

                if (currentIcon) {
                    if (currentIcon !== "url(" + objDescriptor.icon + ")") {

                        $(node[0].children[1].children[0]).css("background-image", "url(" + objDescriptor.icon + ")");
                        $(node[0].children[1].children[0]).css("background-position", "0 0");

                        //mark that change happened
                        nodeDataChanged = true;
                    }
                }
            } else {
                // icon set directly to null means 'remove'
                if (objDescriptor.icon === null) {
                    $(node[0].children[1].children[0]).css("background-image", "");
                    $(node[0].children[1].children[0]).css("background-position", "");

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            if (nodeDataChanged === true) {

                //a bit of visual effect
                animateNode(node);

                //log
                logger.debug("Node updated: " + node.attr("nId"));
            }
        };

        /*
         * Deletes the node from the tree
         */
        this.deleteNode = function (node) {
            //if no valid node, return
            //otherwise delete node
            if (!node) {
                return;
            }

            //delete the given node
            $.jstree._reference(treeViewE).delete_node(node);

            //log
            logger.debug("Node removed: " + node.attr("nId"));
        };

        /**
         * Called when a node is opened in the tree
         * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
         * @param node
         */
        this.onNodeOpen = function (node) {
            logger.warning("Default onNodeOpen called, doing nothing. Please override onNodeOpen(node)");
        };

        /*
         * Called when a node's title is changed in the reeview
         * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
         */
        this.onNodeTitleChanged = function (node, oldText, newText) {
            logger.warning("Default onNodeTitleChanged called, doing nothing. Please override onNodeTitleChanged(node, oldText, newText)");
            return true;
        };

        /*
         * Returns if the node is expanded or collapsed in the tree. True if expanded, false if collapsed
         */
        this.isExpanded = function (node) {
            //if the node is null its most propably represents the root
            //and the root is always expanded (since is not shown in the tree)
            if (node === null) {
                return true;
            }

            return treeViewE.jstree("is_open", node);
        };
    };

    return JSTreeBrowserWidget;
});
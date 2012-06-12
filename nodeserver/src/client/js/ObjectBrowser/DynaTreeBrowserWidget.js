"use strict";
/*
 * WIDGET TreeBrowserWidget based on DynaTree
 */
define(['./../util.js',
        './../../../common/LogManager.js',
        './../../../common/CommonUtil.js',
        'jquery.dynatree',
        'jquery.contextMenu'], function (util, logManager, commonUtil) {

    //load its own CSS file (css/DynaTreeBrowserWidget.css)
    util.loadCSS('css/DynaTreeBrowserWidget.css');

    var DynaTreeBrowserWidget = function (containerId) {
        var logger,
            self = this,  //save this for later use
            contextMenuId,
            myContextMenu,
            contextMenuEdit,
            contextMenuCopy,
            contextMenuPaste,
            contextMenuDelete,
            editNode,
            copyNode,
            pasteNode,
            deleteNode,
            deselectSelectedNodes,
            lastSelection = { "nodeId" :  null, "time" : null };

        //get logger instance for this component
        logger = logManager.create("DynaTreeBrowserWidget");

        //save parent control
        this.containerControl =  $("#" + containerId);

        if (this.containerControl.length === 0) {
            logger.error("DynaTreeBrowserWidget's container control with id:'" + containerId + "' could not be found");
            return;
        }

        //clear container content
        this.containerControl.html("");

        //generate unique id for control
        this.guid = commonUtil.guid();

        //by default use visual animations to reflect changes in the tree
        this._animation = true;

        //generate control dynamically
        this.treeViewE = $('<div/>', {
            id: "dynatree_" + this.guid
        });

        //add control to parent
        this.containerControl.append(this.treeViewE);

        //create context menu dinamically
        contextMenuId = this.guid + "contextMenu";
        myContextMenu = $('<ul/>', {
            id : contextMenuId,
            "class" : "contextMenu"
        });

        //Context menu EDIT option
        contextMenuEdit = $('<li/>', {
            "class" : "edit"
        }).html("<a href='#edit'>Edit</a>");
        myContextMenu.append(contextMenuEdit);

        //Context menu COPY option
        contextMenuCopy = $('<li/>', {
            "class" : "copy separator"
        }).html("<a href='#copy'>Copy</a>");
        myContextMenu.append(contextMenuCopy);

        //Context menu PASTE option
        contextMenuPaste = $('<li/>', {
            "class" : "paste"
        }).html("<a href='#paste'>Paste</a>");
        myContextMenu.append(contextMenuPaste);

        //Context menu DELETE option
        contextMenuDelete = $('<li/>', {
            "class" : "delete separator"
        }).html("<a href='#delete'>Delete</a>");
        myContextMenu.append(contextMenuDelete);

        //finally add the context menu container to the current control
        this.containerControl.append(myContextMenu);

        editNode = function (nodeToEdit) {

            //can not edit 'loading...' node
            if (nodeToEdit.data.addClass === "gme-loading") {
                return;
            }

            var prevTitle = nodeToEdit.data.title,
                tree = nodeToEdit.tree;
            // Disable dynatree mouse- and key handling
            tree.$widget.unbind();
            // Replace node with <input>
            $(nodeToEdit.span).find(".dynatree-title").html("<input id='editNode' value='" + prevTitle + "'  size='10' />");
            // Focus <input> and bind keyboard handler
            $("input#editNode")
                .focus()
                .keydown(
                    function (event) {
                        switch (event.which) {
                        case 27: // [esc]
                            // discard changes on [esc]
                            $("input#editNode").val(prevTitle);
                            event.preventDefault();
                            $(this).blur();
                            break;
                        case 13: // [enter]
                            // simulate blur to accept new value
                            event.preventDefault();
                            $(this).blur();
                            break;
                        }
                    }
                ).blur(function (event) {
                    // Accept new value, when user leaves <input>
                    var changeAllowed = true,
                        title = $("input#editNode").val();

                    $(nodeToEdit.span).find(".dynatree-title").html(prevTitle);
                    if (prevTitle !== title) {
                        if ($.isFunction(self.onNodeTitleChanged)) {
                            changeAllowed = self.onNodeTitleChanged.call(self, nodeToEdit.data.key, prevTitle, title);
                        }

                        if (changeAllowed === true) {
                            setTimeout(function () {
                                self.updateNode(nodeToEdit, { "text" : title });
                            }, 1);
                        } else {
                            nodeToEdit.setTitle(prevTitle);
                            logger.debug("TreeBrowserWidget.onNodeTitleChanged returned false, title change not alloweed");
                        }
                    } else {
                        nodeToEdit.setTitle(title);
                    }
                    // Re-enable mouse and keyboard handling
                    tree.$widget.bind();
                    nodeToEdit.select(true);
                    nodeToEdit.focus();
                });
        };

        copyNode = function (node) {
            var selectedIds,
                selNodes,
                i;

            //can not copy 'loading...' node
            if (node.data.addClass === "gme-loading") {
                return;
            }

            selectedIds = [];

            selNodes = self.treeViewE.dynatree("getTree").getSelectedNodes();
            for (i = 0; i < selNodes.length; i += 1) {
                if (selNodes[i].data.addClass !== "gme-loading") {
                    selectedIds.push(selNodes[i].data.key);
                }
            }

            logger.debug("Copy " +  selectedIds);
            if ($.isFunction(self.onNodeCopy)) {
                self.onNodeCopy.call(self, selectedIds);
            }
        };

        pasteNode = function (node) {
            //can not paste to 'loading...' node
            if (node.data.addClass === "gme-loading") {
                return;
            }
            logger.debug("Paste " +  node.data.key);
            if ($.isFunction(self.onNodePaste)) {
                self.onNodePaste.call(self, node.data.key);
            }
        };

        deleteNode = function (node) {
            var selectedIds,
                selNodes,
                i;

            //can not delete 'loading...' node
            if (node.data.addClass === "gme-loading") {
                return;
            }

            selectedIds = [];

            selNodes = self.treeViewE.dynatree("getTree").getSelectedNodes();
            for (i = 0; i < selNodes.length; i += 1) {
                if (selNodes[i].data.addClass !== "gme-loading") {
                    selectedIds.push(selNodes[i].data.key);
                }
            }

            logger.debug("Delete " +  selectedIds);
            if ($.isFunction(self.onNodeDelete)) {
                self.onNodeDelete.call(self, selectedIds);
            }
        };

        /*
         * Deselect all the selected nodes in the tree
         */
        deselectSelectedNodes = function () {
            var i,
                selNodes;

            //deselect everyone else
            selNodes = self.treeViewE.dynatree("getTree").getSelectedNodes();

            for (i = 0; i < selNodes.length; i += 1) {
                selNodes[i].select(false);
            }
        };

        //create tree using DynaTree
        this.treeViewE.dynatree({
            checkbox: false,
            selectMode: 2,
            imagePath : "../",
            debugLevel: 0,
            onLazyRead : function (node) {
                logger.debug("Expanding node:" + node.data.key);
                if ($.isFunction(self.onNodeOpen)) {
                    self.onNodeOpen.call(self, node.data.key);
                }

                return false;
            },

            onQueryExpand: function (expand, node) {
                if (expand === false) {
                    logger.debug("Collapsing node:" + node.data.key);
                    //remove all children from DOM
                    node.removeChildren();

                    //call onNodeClose if exist
                    if ($.isFunction(self.onNodeClose)) {
                        self.onNodeClose.call(self, node.data.key);
                    }
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
                                    logger.debug("Node double-click: " + node.data.key);
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
                            deselectSelectedNodes();
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
                 logger.debug(selKeys.join(", "));*/
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
                    deleteNode(node);
                    break;
                // Handle Ctrl-C, -X and -V
                case 67:
                    if (event.ctrlKey) { // Ctrl-C
                        copyNode(node);
                        return false;
                    }
                    break;
                case 86:
                    if (event.ctrlKey) { // Ctrl-V
                        pasteNode(node);
                        return false;
                    }
                    break;
                case 113: //F2
                    editNode(node);
                    return false;
                case 13: //ENTER
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
                        deselectSelectedNodes();
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
                        deselectSelectedNodes();
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
            },

            onCreate: function (node, span) {
                // --- Contextmenu helper --------------------------------------------------
                var bindContextMenu = function (span) {
                    // Add context menu to this node:
                    $(span).contextMenu({menu: contextMenuId }, function (action, el, pos) {
                        // The event was bound to the <span> tag, but the node object
                        // is stored in the parent <li> tag
                        var node = $.ui.dynatree.getNode(el);
                        switch (action) {
                        case "edit":
                            editNode(node);
                            break;
                        case "copy":
                            copyNode(node);
                            break;
                        case "paste":
                            pasteNode(node);
                            break;
                        case "delete":
                            deleteNode(node);
                            break;
                        }
                    });
                };

                bindContextMenu(span);
            }
        });

        /**
         * Creates a new node in the treebrowser under parentNode with the given parameters
         * @param parentNode
         * @param objDescriptor
         */
        this.createNode = function (parentNode, objDescriptor) {
            //check if the parentNode is null or not
            //when null, the new node belongs to the root
            if (parentNode === null) {
                // Now get the root node object
                parentNode = this.treeViewE.dynatree("getRoot");
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
            });

            //log
            logger.debug("New node created: " + newNode.data.key);

            //a bit of visual effect
            this.animateNode(newNode);

            //return the newly created node
            return newNode;
        };

        this.animateNode = function (node) {

            //if animation is enabled for the widget
            if (this._animation === true) {
                //force rendering of the node otherwise may happen that its DOM representation is not ready
                node.render();

                var jQureyNode = $(node.span.children[2]);
                jQureyNode.hide();
                jQureyNode.fadeIn('fast');
            }
        };

        /* Deletes the node from the tree
        * @param node
        */
        this.deleteNode = function (node) {
            //if no valid node, return
            //otherwise delete node
            if (!node) {
                return;
            }

            node.remove();

            //log
            logger.debug("Node deleted: " + node.data.key);
        };

        /*
         * Resets the given nodes text tp the given value
         * @param node
         * @param text
         */
        this.updateNode = function (node, objDescriptor) {

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

            //set new childrend value (if any)
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
                this.animateNode(node);

                //log
                logger.debug("Node updated: " + node.data.key);
            }
        };

        /**
         * Called when a node is opened in the tree
         * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
         * @param nodeId
         */
        this.onNodeOpen = function (nodeId) {
            logger.warning("Default onNodeOpen for node " + nodeId + " called, doing nothing. Please override onNodeOpen(nodeId)");
        };

        /*
         * Called when a node's title is changed in the reeview
         * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
         */
        this.onNodeTitleChanged = function (nodeId, oldText, newText) {
            logger.warning("Default onNodeTitleChanged for node " + nodeId + " called, doing nothing. Please override onNodeTitleChanged(nodeId, oldText, newText)");
            return true;
        };

        /*
         * Collapses the given node
         */
        this.collapse = function (node) {
            node.expand(false);
        };

        /*
         * Expands the given node
         */
        this.expand = function (node) {
            node.expand(true);
        };

        this.isExpanded = function (node) {
            //if the node is null its most propably represents the root
            //and the root is always expanded (since is not shown in the tree)
            if (node === null) {
                return true;
            }

            return node.isExpanded();
        };
    };

    return DynaTreeBrowserWidget;
});
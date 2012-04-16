/*
 * WIDGET TreeBrowserWidget based on JSTree
 */
define( [ 'jquery.hotkeys', 'jquery.jstree' ], function() {

    //load its own CSS file (css/JSTreeBrowserWidget.css)
    var css	= document.createElement('link');
    css.rel		= 'stylesheet';
    css.type	= 'text/css';
    css.media	= 'all';
    css.href	= 'css/JSTreeBrowserWidget.css';
    document.getElementsByTagName("head")[0].appendChild(css);

    var JSTreeBrowserWidget = function (containerId) {
        //save this for later use
        var self = this;

        //by default use visual animation to reflect changes in the three
        var animation = true;

        //save parentcontrol
        var containerControl = $("#" + containerId);

        if (containerControl.length === 0) {
            alert("JSTreeBrowserWidget's container control with id:'" + containerId + "' could not be found");
            return undefined;
        }

        //generate unique id for control
        var guid = "TreeBrowserWidgetjsTree";

        //generate control dynamically
        var treeViewE = $('<div/>', {
            id:"jstree_" + guid
        });

        //add control to parent
        containerControl.append(treeViewE);

        //returns the ID of each selected node in the tree
        var getSelectedNodeIds = function() {
            var selectedIds = [];

            treeViewE.jstree("get_selected").each( function() {
                //only interested in nodes that have been fully loaded and displayed
                if ( $(this).hasClass( "gme-loading" ) !== true ) {
                    selectedIds.push( $(this).attr("nId") );
                }
            } );

            return selectedIds;
        };


        //Called when the ContexMenu's 'Copy' action is selected for the node
        var copyNode = function (nodeId) {
            var selectedIds = getSelectedNodeIds();
            if ( selectedIds.length > 0 ) {
                console.log("TreeBrowser copy " + selectedIds);
                if ($.isFunction(self.onNodeCopy)) {
                    self.onNodeCopy.call(self, selectedIds);
                }
            }
        };

        //Called when the ContexMenu's 'Paste' action is selected for the node
        var pasteNode = function (nodeId) {
            console.log("TreeBrowser paste " + nodeId);
            if ($.isFunction(self.onNodePaste)) {
                self.onNodePaste.call(self, nodeId);
            }
        };

        //Called when the ContexMenu's 'Delete' action is selected for the node
        var deleteNode = function (nodeId) {
            var selectedIds = getSelectedNodeIds();
            if ( selectedIds.length > 0 ) {
                console.log("TreeBrowser delete " + selectedIds);
                if ($.isFunction(self.onNodeDelete)) {
                    self.onNodeDelete.call(self, selectedIds);
                }
            }
        };

        //Called when the ContexMenu's 'Rename' action is selected for the node
        var editNode = function (nodeId) {
            console.log("TreeBrowser edit " + nodeId);
            treeViewE.jstree("rename", null);
        };

        //Called when the user right-clicks on a node and
        //the customized context menu has to be displayed
        var customContextMenu = function (node) {
            //the object will hold the available context menu actions
            var items = {};

            //context menu is available for nodes that are not currently in 'loading' state
            if (node.hasClass("gme-loading") !== true) {

                // The default set of available items :  Rename, Copy, Paste, Delete
                items = {
                    "renameItem":{ // The "rename" menu item
                        "label":"Rename",
                        "action":function (obj) {
                            editNode(obj.attr("nId"));
                        },
                        "icon":"img/edit.png"
                    },
                    "copyItem":{ // The "delete" menu item
                        "label":"Copy",
                        "separator_before":true,
                        "action":function (obj) {
                            copyNode(obj.attr("nId"));
                        },
                        "icon":"img/copy.png"
                    },
                    "pasteItem":{ // The "delete" menu item
                        "label":"Paste",
                        "action":function (obj) {
                            pasteNode(obj.attr("nId"));
                        },
                        "icon":"img/paste.png"
                    },
                    "deleteItem":{ // The "delete" menu item
                        "label":"Delete",
                        "separator_before":true,
                        "action":function (obj) {
                            deleteNode(obj.attr("nId"));
                        },
                        "icon":"img/delete.png"
                    }
                };
            }

            //return the complete action set for this node
            return items;
        };

        /*
         * Applies a visual animation to the specfied node to get user's attention
         */
        var animateNode = function (node) {
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
        var focusNode = function(node) {
            //find the 'a' tag in it and set focus on that
            var aTag = node[0].children[1];
            if ( aTag ) {
                aTag.focus();
            }
        };

        /*
         * local variale for the last selected node (node double click for edit node handler helper)
         */
        var lastSelection = { "nodeId" :  null, "time" : null };

        //contruct the tree itself using jsTree
        treeViewE.jstree({
            "plugins":[ "themes", "html_data", "contextmenu", "ui", "crrm" ],
            "open_parents":false,
            "contextmenu":{
                "select_node":"true",
                "show_at_node":"true",
                "items":function (node) {
                    return customContextMenu(node);
                }
            },
            "themes" : {
                "dots" : false
            }
        });

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
            var renamedNode = data.rslt.obj;
            var oldName = data.rslt.old_name;
            var newName = data.rslt.new_name;

            if (oldName !== newName) {
                var changeAllowed = true;

                if ($.isFunction(self.onNodeTitleChanged)) {
                    changeAllowed = self.onNodeTitleChanged.call(self, renamedNode.attr("nId"), oldName, newName);
                }

                if (changeAllowed !== true) {
                    self.updateNode(renamedNode, { "text":oldName });
                    console.log("JSTreeBrowserWidget.onNodeTitleChanged returned false, title change not alloweed");
                }
            }

            //set focus back to the renamed node
            focusNode( renamedNode );
        });

        //hook up node selection event handler to properly set focus on selected node
        treeViewE.bind("select_node.jstree", function (e, data) {
            //fisrt focus the node
            focusNode( data.rslt.obj );

            //save current selection
            var currentSelection = { "nodeId" : data.rslt.obj.attr("nId"), "time" : new Date() };

            //compare with saved last selection info to see if edit node criteria is met or not
            if ( ( lastSelection.nodeId === currentSelection.nodeId ) && ( currentSelection.time - lastSelection.time <= 500 ) ) {
                //edit node
                editNode( lastSelection.nodeId );

                //clear last selection
                lastSelection = { "nodeId" :  null, "time" : null };
            } else {
                //save this selection as last
                lastSelection = { "nodeId" :  currentSelection.nodeId, "time" : currentSelection.time };
            }

        });

        //hook up node selection event handler to properly set focus on last selected node (if any)
        treeViewE.bind("deselect_node.jstree", function (e, data) {
            //find the a tag in is and set focus on that
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            if ( o && o.length > 0 ) {
                focusNode( o );
            }
        });


        //hook up keyboard handlers
        //CTRL+C -- copy selected node(s)
        treeViewE.bind('keydown', 'Ctrl+c', function() {
            var o = jQuery.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ( $(o).hasClass( "gme-loading" ) !== true ) {
                copyNode( o.attr("nId") );
            }
            return false;
        } );

        //CTRL+V -- paste clipboard under selected node
        treeViewE.bind('keydown', 'Ctrl+v', function() {
            var o = jQuery.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ( $(o).hasClass( "gme-loading" ) !== true ) {
                pasteNode( o.attr("nId") );
            }
            return false;
        } );

        //DELETE -- delete selected node(s)
        treeViewE.bind('keydown', 'del', function() {
            var o = jQuery.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ( $(o).hasClass( "gme-loading" ) !== true ) {
                deleteNode( o.attr("nId") );
            }
            return false;
        } );

        //F2 -- rename selected node
        treeViewE.bind('keydown', 'f2', function() {
            var o = jQuery.jstree._reference(treeViewE)._get_node();
            //we can paste if the selected node is not in 'Loading...' state
            if ( $(o).hasClass( "gme-loading" ) !== true ) {
                editNode( o.attr("nId") );
            }
            return false;
        } );

        //UP -- move selection to previous node
        treeViewE.bind('keydown', 'up', function() {
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            treeViewE.jstree("get_selected").each( function() {
                jQuery.jstree._reference(treeViewE).deselect_node(this);
            } );
            jQuery.jstree._reference(treeViewE).select_node(jQuery.jstree._reference(treeViewE)._get_prev(o));
            return false;
        } );

        //SHIFT+UP -- move to previous node and add it to the selection range
        treeViewE.bind('keydown', 'shift+up', function() {
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            jQuery.jstree._reference(treeViewE).select_node(jQuery.jstree._reference(treeViewE)._get_prev(o));
            return false;
        } );

        //DOWN -- move to next node
        treeViewE.bind('keydown', 'down', function() {
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            //deselect all selected
            treeViewE.jstree("get_selected").each( function() {
                jQuery.jstree._reference(treeViewE).deselect_node(this);
            } );
            jQuery.jstree._reference(treeViewE).select_node(jQuery.jstree._reference(treeViewE)._get_next(o));
            return false;
        } );

        //SHIFT+DOWN -- move to next node and add it to the selection range
        treeViewE.bind('keydown', 'shift+down', function() {
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            jQuery.jstree._reference(treeViewE).select_node(jQuery.jstree._reference(treeViewE)._get_next(o));
            return false;
        } );

        //LEFT -- close node if it was open
        treeViewE.bind('keydown', 'left', function() {
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            //open if closed or go to next
            if( o.hasClass("jstree-open") ) {
                jQuery.jstree._reference(treeViewE).close_node(o);
            }
            return false;
        } );

        //RIGHT -- open node if it was closed
        treeViewE.bind('keydown', 'right', function() {
            var o = jQuery.jstree._reference(treeViewE).data.ui.last_selected;
            //close if opened or go to prev
            if( o.hasClass("jstree-closed") ) {
                jQuery.jstree._reference(treeViewE).open_node(o);
            }
            return false;
        } );

        /*
         * PUBLIC METHODS
         */

        /*
         * Creates a node in the tree with the given parameters
         */
        this.createNode = function (parentNode, objDescriptor) {

            //check if the parentNode is null or not
            //when null, the new node belongs to the root
            if (parentNode === null) {
                // Now get the root node object
                parentNode = -1;
            }

            var newNodeData = {
                "data": { title : objDescriptor.name },
                "attr":{ "nId":objDescriptor.id/*,
                    "class":objDescriptor.objectType || "gme-folder"*/
                }
            };

            if ( objDescriptor.icon ) {
                newNodeData[ "data" ]["icon"] = objDescriptor.icon;
            }

            if ( objDescriptor["class"] ) {
                newNodeData[ "attr" ]["class"] =  objDescriptor["class"];
            }

            if (objDescriptor.hasChildren === true) {
                newNodeData[ "state" ] = "closed";
            }

            //using core module
            var newNode = treeViewE.jstree("create_node", parentNode, "last", newNodeData, false);

            if (objDescriptor.icon) {
                    $(newNode[0].children[1].children[0]).css("background-image", "url(" + objDescriptor.icon + ")" );
                    $(newNode[0].children[1].children[0]).css("background-position", "0 0");
            }

            //log
            console.log("New node created: " + objDescriptor.id);

            //a bit of visual effect
            animateNode(newNode);

            //return the newly created node
            return newNode;
        };

        /*
         * Updates a node in the tree with the given parameters
         */
        this.updateNode = function (node, objDescriptor) {
            //check if valid node
            if (!node)
                return;

            //by default we say there is nothing to update
            var nodeDataChanged = false;

            //set new text value (if any)
            if (objDescriptor.text) {

                var currentText = treeViewE.jstree("get_text", node);

                if (currentText !== objDescriptor.text) {
                    treeViewE.jstree("set_text", node, objDescriptor.text);

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            if (objDescriptor.hasChildren === true || objDescriptor.hasChildren === false) {

                //set new childrend value (if any)
                //check if parent has any children
                var currentlyHasChildren = !treeViewE.jstree("is_leaf", node);

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
                var currentIcon = $(node[0].children[1].children[0]).css("background-image");

                if ( currentIcon ) {
                    if ( currentIcon !== "url(" + objDescriptor.icon + ")" ) {

                        $(node[0].children[1].children[0]).css("background-image", "url(" + objDescriptor.icon + ")" );
                        $(node[0].children[1].children[0]).css("background-position", "0 0");

                        //mark that change happened
                        nodeDataChanged = true;
                    }
                }
            } else {
                // icon set directly to null means 'remove'
                if ( objDescriptor.icon === null ) {
                    $(node[0].children[1].children[0]).css("background-image", "" );
                    $(node[0].children[1].children[0]).css("background-position", "");

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            if (nodeDataChanged === true) {

                //a bit of visual effect
                animateNode(node);

                //log
                console.log("Node updated: " + node.attr("nId"));
            }
        };

        /*
         * Deletes the node from the tree
         */
        this.deleteNode = function (node) {
            //if no valid node, return
            //otherwise delete node
            if (!node)
                return;

            //delete the given node
            jQuery.jstree._reference(treeViewE).delete_node(node);

            //log
            console.log("Node removed: " + node.attr("nId"));
        };

        /**
         * Called when a node is opened in the tree
         * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
         * @param node
         */
        this.onNodeOpen = function (node) {
            console.log("Default onNodeOpen called, doing nothing. Please override onNodeOpen(node)");
        };

        /*
         * Called when a node's title is changed in the reeview
         * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
         */
        this.onNodeTitleChanged = function (node, oldText, newText) {
            console.log("Default onNodeTitleChanged called, doing nothing. Please override onNodeTitleChanged(node, oldText, newText)");
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
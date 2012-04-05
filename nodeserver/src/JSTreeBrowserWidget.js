/*
 * TreeViewWidget JSTree WIDGET
 */
function JSTreeBrowserWidget( containerId ){

    //save parentcontrol
    this.containerControl =  $("#" + containerId );

    if ( this.containerControl.length === 0 ) {
        alert( "JSTreeBrowserWidget's container control with id:'" + containerId + "' could not be found" );
        return;
    }

    //generate unique id for control
    this.guid = "jsTreeGuidBla";

    //generate control dynamically
    this.treeViewE = $('<div/>', {
        id: "jstree_" + this.guid
    });

    //add control to parent
    this.containerControl.append( this.treeViewE );

    //save this for later use
    var self = this;


    var copyNode = function( nodeId ) {
        console.log( "TreeBrowser copy " + nodeId );
        if ($.isFunction(self.onNodeCopy)){
            self.onNodeCopy.call(self, nodeId );
        }
    };

    var pasteNode = function( nodeId ) {
        console.log( "TreeBrowser paste " + nodeId );
        if ($.isFunction(self.onNodePaste)){
            self.onNodePaste.call(self, nodeId );
        }
    };

    var deleteNode = function( nodeId ) {
        console.log( "TreeBrowser delete " +  nodeId );
        if ($.isFunction(self.onNodeDelete)){
            self.onNodeDelete.call(self, nodeId );
        }
    };

    var editNode = function (nodeId) {
        console.log( "TreeBrowser edit " +  nodeId );
        var result = self.treeViewE.jstree("rename",null );
    };

    var customContextMenu = function (node) {

        // The default set of all items
        var items = {
            renameItem: { // The "rename" menu item
                label: "Rename",
                action: function (obj) {
                    editNode( obj.attr("nId") );
                },
                icon : "css/contextmenu/page_white_edit.png"
            },
            copyItem: { // The "delete" menu item
                label: "Copy",
                separator_before : true,
                action: function ( obj ) {
                    copyNode( obj.attr("nId") );
                },
                icon : "css/contextmenu/page_white_copy.png"
            },
            pasteItem: { // The "delete" menu item
                label: "Paste",
                action: function ( obj ) {
                    pasteNode( obj.attr("nId") );
                },
                icon : "css/contextmenu/page_white_paste.png"
            },
            deleteItem: { // The "delete" menu item
             label: "Delete",
             separator_before : true,
             action: function ( obj ) {
                 deleteNode( obj.attr("nId") );
             },
             icon : "css/contextmenu/page_white_delete.png"
            }
        };

        return items;
    };

    //contruct the tree itself using jsTree
    this.treeViewE.jstree({
        "plugins" : [ "themes", "html_data", "contextmenu", "ui", "crrm" ],
        "open_parents" : false,
        "contextmenu" : {
            "select_node" : "true",
            "show_at_node" : "true",
            "items": function(node) {
                        return customContextMenu( node );
                    }
        }
    });

    //hook up node open eventhandler
    this.treeViewE.bind("open_node.jstree", function (e, data) {
        //get the node which is about to open
        var nodeOpening = data.args[0];

        //check if parent has any children
        var nodes = jQuery.jstree._reference ( self.treeViewE )._get_children( nodeOpening );

        if ( nodes.length === 0 ) {
            //it has no children, call external function to get children
            nodeOpening = $(nodeOpening);
            window.logMessage( "onLazyRead node:" + nodeOpening.attr("nId") );

            //icon set either via type or css
            //nodeOpening.addClass('jstree-openProgress');

            if ($.isFunction(self.onNodeOpen)){
                self.onNodeOpen.call(self,  nodeOpening.attr("nId"));
            }
        }
    });

    //hook up close open eventhandler
    this.treeViewE.bind("close_node.jstree", function (e, data) {
        //get the node which is about to open
        var nodeClosing = data.args[0];

        //delete children
        self.treeViewE.jstree("delete_node", nodeClosing.find('> ul > li') );

        //hack tree to show the node as an closed but openable treenode
        nodeClosing.removeClass('jstree-leaf').addClass('jstree-closed');

        if ($.isFunction(self.onNodeClose)){
            self.onNodeClose.call(self,  nodeClosing.attr("nId") );
        }
    });

    //hook up close open eventhandler
    this.treeViewE.bind("rename.jstree", function (e, data) {
        //get the node which is about to open
        var renamedNode = data.rslt.obj;
        var oldName = data.rslt.old_name;
        var newName = data.rslt.new_name;

        if ( oldName !== newName ) {
            var changeAllowed = true;

            if ($.isFunction(self.onNodeTitleChanged)) {
                changeAllowed = self.onNodeTitleChanged.call(self, renamedNode.attr("nId"), oldName, newName);
            }

            if (changeAllowed !== true) {
                self.updateNode( renamedNode, oldName, null, false );
                console.log("JSTreeBrowserWidget.onNodeTitleChanged returned false, title change not alloweed");
            }
        }
    });
}

JSTreeBrowserWidget.prototype = {

    /**
     * Creates a new node in the treebrowser under parentNode with the given parameters
     * @param parentNode
     * @param objDescriptor
     */
    createNode : function ( parentNode, objDescriptor ) {

        var parentExpanded = false;

        //check if the parentNode is null or not
        //when null, the new node belongs to the root
        if ( parentNode === null ) {
            // Now get the root node object
            parentNode = -1;
        }

        var newNodeData = {
            "data" :  objDescriptor.name,
            "attr" : { "nId" : objDescriptor.id,
                        "class" : objDescriptor.objectType ? "gme-" + objDescriptor.objectType : "gme-folder"
                    }
        };

        if ( objDescriptor.hasChildren === true ) {
            newNodeData[ "state" ] = "closed";
        }

        //using core module
        var newNode = this.treeViewE.jstree("create_node", parentNode, "last", newNodeData, false );

        //log
        window.logMessage( "New node created: " + objDescriptor.id );

        //a bit of visual effect
        var needVisualEffect = true;
        if ( parentNode !== -1 ) {
            if ( this.treeViewE.jstree("is_open", parentNode ) !== true ) {
                needVisualEffect = false;
            }
        }

        if ( needVisualEffect === true ) {
            newNode.hide();
            newNode.fadeIn();
        }

        //return the newly created node
        return newNode;
    },

    /**
     * Deletes the node from the tree
     * @param node
     */
    deleteNode: function( node ) {
        //if no valid node, return
        //otherwise delete node
        if ( ! node )
            return;

        //delete the given node
        jQuery.jstree._reference( this.treeViewE ).delete_node( node );

        //log
        window.logMessage( "Node removed: " + node.attr("nId") );
    },

    updateNode:function (node, text, hasChildren, useVisualEffect) {
        //check if valid node
        if (!node)
            return;

        //by default we say there is nothing to update
        var nodeDataChanged = false;

        //set new text value (if any)
        if ( text ) {

            var currentText = this.treeViewE.jstree("get_text", node );

            if (currentText !== text) {
                this.treeViewE.jstree("set_text", node, text );

                //mark that change happened
                nodeDataChanged = true;

            }
        }

        if (hasChildren === true || hasChildren === false) {

            //set new childrend value (if any)
            //check if parent has any children
            var currentlyHasChildren = !this.treeViewE.jstree("is_leaf", node );

            if ( hasChildren !== currentlyHasChildren ) {

                if ( hasChildren === true ) {
                    //hack tree to show the node as an closed but openable treenode
                    node.removeClass('jstree-leaf').addClass('jstree-closed');
                } else {
                    this.treeViewE.jstree("close_node", node );
                    //hack tree to show the node as an closed but openable treenode
                    node.removeClass('jstree-closed').addClass('jstree-leaf');
                }

                //mark that change happened
                nodeDataChanged = true;
            }
        }

        if (nodeDataChanged === true) {

            if (useVisualEffect === true) {
                node.hide();
                node.fadeIn();
            }

            //log
            console.log("Node updated: " + node.attr("nId"));
        }
    },

    /**
     * Called when a node is opened in the tree
     * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
     * @param node
     */
    onNodeOpen : function( node ) {
        window.logMessage( "Default onNodeOpen called, doing nothing. Please override onNodeOpen(node) and at the end call lazyLoadFinished(node, false)" );
        this.lazyLoadFinished( node, true );
    },

    /*
     * Called when a node's title is changed in the reeview
     * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
     */
    onNodeTitleChanged : function( node, oldText, newText ) {
        window.logMessage( "Default onNodeTitleChanged called, doing nothing. Please override onNodeTitleChanged(node, newText)" );
        return true;
    },

    /*
     * Enables or disables the rendering for the tree (very helpful for bulk edit, can speed up things)
     */
    enableUpdate:function (enabled) {
        //this.treeViewE.dynatree("getTree").enableUpdate(enabled);
    }

}
/*
 * TREEVIEW WIDGET
 */
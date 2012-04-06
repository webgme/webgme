/*
 * TreeViewWidget JSTree WIDGET
 */
function JSTreeBrowserWidget( containerId ) {
    //save this for later use
    var self = this;

    //save parentcontrol
    this.containerControl =  $("#" + containerId );

    if ( this.containerControl.length === 0 ) {
        alert( "JSTreeBrowserWidget's container control with id:'" + containerId + "' could not be found" );
        return undefined;
    }

    //generate unique id for control
    this.guid = "TreeBrowserWidgetjsTree";

    //generate control dynamically
    this.treeViewE = $('<div/>', {
        id: "jstree_" + this.guid
    });

    //add control to parent
    this.containerControl.append( this.treeViewE );

    //by default use visual animations to reflect changes in the three
    this._animation = true;

    //Called when the ContexMenu's 'Copy' action is selected for the node
    var copyNode = function( nodeId ) {
        console.log( "TreeBrowser copy " + nodeId );
        if ($.isFunction(self.onNodeCopy)){
            self.onNodeCopy.call(self, nodeId );
        }
    };

    //Called when the ContexMenu's 'Paste' action is selected for the node
    var pasteNode = function( nodeId ) {
        console.log( "TreeBrowser paste " + nodeId );
        if ($.isFunction(self.onNodePaste)){
            self.onNodePaste.call(self, nodeId );
        }
    };

    //Called when the ContexMenu's 'Delete' action is selected for the node
    var deleteNode = function( nodeId ) {
        console.log( "TreeBrowser delete " +  nodeId );
        if ($.isFunction(self.onNodeDelete)){
            self.onNodeDelete.call(self, nodeId );
        }
    };

    //Called when the ContexMenu's 'Rename' action is selected for the node
    var editNode = function (nodeId) {
        console.log( "TreeBrowser edit " +  nodeId );
        self.treeViewE.jstree("rename",null );
    };

    //Called when the user right-clicks on a node and
    //the customized context menu has to be displayed
    var customContextMenu = function (node) {
        //the object will hold the available context menu actions
        var items = {};

        //context menu is available for nodes that are not currently in 'loading' state
        if ( node.hasClass("gme-loading") !== true ) {

            // The default set of available items :  Rename, Copy, Paste, Delete
            items = {
                "renameItem": { // The "rename" menu item
                    "label": "Rename",
                    "action": function (obj) {
                        editNode( obj.attr("nId") );
                    },
                    "icon" : "css/contextmenu/page_white_edit.png"
                },
                "copyItem": { // The "delete" menu item
                    "label": "Copy",
                    "separator_before" : true,
                    "action": function ( obj ) {
                        copyNode( obj.attr("nId") );
                    },
                    "icon" : "css/contextmenu/page_white_copy.png"
                },
                "pasteItem": { // The "delete" menu item
                    "label": "Paste",
                    "action": function ( obj ) {
                        pasteNode( obj.attr("nId") );
                    },
                    "icon" : "css/contextmenu/page_white_paste.png"
                },
                "deleteItem": { // The "delete" menu item
                 "label": "Delete",
                 "separator_before" : true,
                 "action": function ( obj ) {
                     deleteNode( obj.attr("nId") );
                 },
                 "icon" : "css/contextmenu/page_white_delete.png"
                }
            };
        }

        //return the complete action set for this node
        return items;
    };

    //contruct the tree itself using jsTree
    this.treeViewE.jstree({
        "plugins" : [ "themes", "html_data", "contextmenu", "ui", "crrm" ],
        "open_parents" : false,
        "contextmenu" : {
            "select_node" : "true",
            "show_at_node" : "true",
            "items": function(node) { return customContextMenu( node ); }
        }
    });

    //hook up 'node opened' EventHandler
    this.treeViewE.bind("open_node.jstree", function (e, data) {
        //get the node which is about to open
        var nodeOpening = data.args[0];

        //call event handler if exist
        if ($.isFunction(self.onNodeOpen)){
            self.onNodeOpen.call(self,  nodeOpening.attr("nId"));
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
                self.updateNode( renamedNode, { "text" : oldName } );
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

        //check if the parentNode is null or not
        //when null, the new node belongs to the root
        if ( parentNode === null ) {
            // Now get the root node object
            parentNode = -1;
        }

        var newNodeData = {
            "data" :  objDescriptor.name,
            "attr" : { "nId" : objDescriptor.id,
                        "class" : objDescriptor.objectType || "gme-folder"
                    }
        };

        if ( objDescriptor.hasChildren === true ) {
            newNodeData[ "state" ] = "closed";
        }

        //using core module
        var newNode = this.treeViewE.jstree("create_node", parentNode, "last", newNodeData, false );

        //log
        console.log( "New node created: " + objDescriptor.id );

        //a bit of visual effect
        this.animateNode( newNode );

        //return the newly created node
        return newNode;
    },


    /*
     * Applies a visual animation to the specfied node to get user's attention
     */
    animateNode : function(node) {
        //if animation is enabled for the widget
        if (this._animation === true) {
            var nodePartToAnimate = $( node[0].children[1] );
            nodePartToAnimate.hide();
            nodePartToAnimate.fadeIn( 'fast' );
        }
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
        console.log( "Node removed: " + node.attr("nId") );
    },

    updateNode:function (node, objDescriptor) {
        //check if valid node
        if (!node)
            return;

        //by default we say there is nothing to update
        var nodeDataChanged = false;

        //set new text value (if any)
        if ( objDescriptor.text ) {

            var currentText = this.treeViewE.jstree("get_text", node );

            if (currentText !== objDescriptor.text) {
                this.treeViewE.jstree("set_text", node, objDescriptor.text );

                //mark that change happened
                nodeDataChanged = true;

            }
        }

        if ( objDescriptor.hasChildren === true || objDescriptor.hasChildren === false) {

            //set new childrend value (if any)
            //check if parent has any children
            var currentlyHasChildren = !this.treeViewE.jstree("is_leaf", node );

            if ( objDescriptor.hasChildren !== currentlyHasChildren ) {

                if ( objDescriptor.hasChildren === true ) {
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

        //set new icon (if any)
        if ( objDescriptor.objType ) {
            if ( node.hasClass( objDescriptor.objType ) !== true ) {

                //remove loading if it was there
                if ( node.hasClass( "gme-loading" ) === true ) {
                    node.removeClass( "gme-loading" );
                }

                //add new class
                node.addClass( objDescriptor.objType );

                //mark that change happened
                nodeDataChanged = true;
            }
        }

        if (nodeDataChanged === true) {

            //a bit of visual effect
            this.animateNode( node );

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
        console.log( "Default onNodeOpen called, doing nothing. Please override onNodeOpen(node) and at the end call lazyLoadFinished(node, false)" );
        this.lazyLoadFinished( node, true );
    },

    /*
     * Called when a node's title is changed in the reeview
     * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
     */
    onNodeTitleChanged : function( node, oldText, newText ) {
        console.log( "Default onNodeTitleChanged called, doing nothing. Please override onNodeTitleChanged(node, newText)" );
        return true;
    },

    isExpanded : function( node ) {
        //if the node is null its most propably represents the root
        //and the root is always expanded (since is not shown in the tree)
        if ( node === null ) {
            return true;
        }

        return this.treeViewE.jstree("is_open", node );
    }
};
/*
 * TREEVIEW WIDGET
 */
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
    this.guid = guid();

    //generate control dynamically
    this.treeViewE = $('<div/>', {
        id: "jstree_" + this.guid
    });

    //add control to parent
    this.containerControl.append( this.treeViewE );

    //save this for later use
    var self = this;

    //create tree using JSTree
    /*this.treeViewE.jstree({
        "json_data" : {
            "data" : [
                {
                    "data" : "Root",
                    "attr" : { "id" : "lofasz" },
                    "children" : [
                    ],
                    "state" : "closed"
                }
            ]
        },
        "plugins" : [ "themes", "json_data", "crrm", "types", "contextmenu", "ui" ],
        "types": {
            'types' : {
                'loading' : {
                    'icon' : {
                        'image' : 'img/progress.gif'
                    }
                }
            }
        }
    });*/

    //contruct the tree itself using jsTree
    this.treeViewE.jstree({
        "plugins" : [ "themes", "html_data" ],
        "open_parents" : false
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
            window.logMessage( "onLazyRead node:" + nodeOpening[0].id );

            //icon set either via type or css
            nodeOpening.addClass('jstree-openProgress');

            if ($.isFunction(self.onNodeOpen)){
                self.onNodeOpen.call(self, nodeOpening);
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
        } else {
        }

        var newNodeData = {
            "data" :  objDescriptor.name
        };

        if ( objDescriptor.hasChildren === true )
            newNodeData[ "state" ] = "closed";

        //using core module
        var newNode = this.treeViewE.jstree("create_node", parentNode, "last", newNodeData, false );

        //log
        window.logMessage( "New node created: " + newNode );

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
        window.logMessage( "Node removed: " + node );
    },

    /**
     * Resets the given nodes text tp the given value
     * @param node
     * @param text
     */
    renameNode: function( node, text ) {

        //check if valid node
        if ( ! node)
            return;

        //set new text value
        jQuery.jstree._reference( this.treeViewE ).set_text ( node , text );

        //a bit of visual effect
        node.hide();
        node.fadeIn();

        //log
        window.logMessage( "Node renamed: " + node );
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

    /**
     * Returns the parent node of the argument
     * @param node
     */
    getParent : function( node ) {
        if ( ! node )
            return null;

        return jQuery.jstree._reference( this.treeViewE )._get_parent( node );
    },

    /**
     * Returns the children node of the argument if any. Otherwise returns null.
     * For lazy nodes that have not yet been loaded, undefined is is returned.
     * @param node
     */
    getChildren : function( node ) {
        if ( ! node )
            return null;

        return jQuery.jstree._reference( this.treeViewE )._get_children( node );
    },

    /**
     * Stores the given obj in the node
     * @param node
     * @param obj
     */
    setCustomData : function( node, obj ) {
        node["TreeBrowserCustomData"] = obj;
    },

    getCustomData : function( node ) {
        //return WebGMEData if exists
        if ( node.hasOwnProperty("TreeBrowserCustomData") )
            return node["TreeBrowserCustomData"];

        //otherwise return null
        return null;
    },

    /*
     * Cancels the node's layz load status, makes it closed and removes the in-progress icon
     */
    lazyLoadFinished : function( node, collapse ) {
        //set icon back to old one (via css or types)
        node.removeClass('jstree-openProgress');

        var needCollapse = false || collapse;
        if ( needCollapse === true ) {
            this.collapse( node );
        }
    },

    /*
     * Collapses the given node
     */
    collapse: function( node) {
        jQuery.jstree._reference( this.treeViewE ).close_node( node, true );
    },

    /*
     * Expands the given node
     */
    expand : function( node ) {
        jQuery.jstree._reference( this.treeViewE ).open_node( node, false, false );
    },

    /*
     * Removes all the children of the tree
     */
    clear : function() {
        var children = this.getChildren( -1 );
        if ( children.length > 0 ) {
            for ( var i = 0; i < children.length; i++ ) {
                this.deleteNode( children[i] );
            }
        }
    },

    expandTree : function () {
        jQuery.jstree._reference( this.treeViewE ).open_all( -1, false );
    }

}
/*
 * TREEVIEW WIDGET
 */
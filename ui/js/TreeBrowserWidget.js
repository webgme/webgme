/*
 * TreeViewWidgetDynaTree WIDGET
 */
function TreeBrowserWidget( containerId ){

    //save parentcontrol
    this.containerControl =  $("#" + containerId );

    if ( this.containerControl.length === 0 ) {
        alert( "TreeBrowserWidget's container control with id:'" + containerId + "' could not be found" );
        return;
    }

    //generate unique id for control
    this.guid = guid();

    //generate control dynamically
    this.treeViewE = $('<div/>', {
        id: "treedyna_" + this.guid
    });

    //add control to parent
    this.containerControl.append( this.treeViewE );

    //save this for later use
    var self = this;

    //create tree using DynaTree
    this.treeViewE.dynatree( {
        onLazyRead : function (node) {
            window.logMessage( "onLazyRead node:" + node.data.key );
            if ($.isFunction(self.onNodeOpen)){
                self.onNodeOpen.call(self, node);
            }
        },

        onQueryExpand: function(expand, node){
            if ( expand ) {
                /* DO NOTHING HERE, EXPAND IS HANDLED IN 'onLazyLoad'
                 window.logMessage( "expanding node:" + node.data.key );
                 */
            } else {
                window.logMessage( "collapsing node:" + node.data.key );
                //remove all children from DOM
                node.removeChildren();

                //call onNodeClose if exist
                if ($.isFunction(self.onNodeClose)){
                    self.onNodeClose.call(self, node);
                }
            }
        },

        onClick: function(node, event) {

            //single click on the title means rename
            if(node.getEventTargetType(event) === "title"){

                var editInPlace = function( nodeToEdit ) {

                    nodeToEdit.inPlaceEditing = true;

                    //save original text
                    var originalText = nodeToEdit.data.title;

                    //activate editor
                    var editorElement = $('<input type="text" name="inplace_value" class="inplace_field"  size="10" />');

                    //insert inplace form and textbox
                    var editForm = $(nodeToEdit.span).find(".dynatree-title").html('<form class="inplace_form" style="display: inline; margin: 0; padding: 0;"></form>').find('form');
                    editForm.append(editorElement);

                    var cancelEditorAction = function (anEvent) {
                        $(nodeToEdit.span).find(".dynatree-title").html(originalText);
                        delete nodeToEdit["inPlaceEditing"];
                        return false; // stop event bubbling
                    }

                    var saveEditorAction = function (anEvent) {
                        delete nodeToEdit["inPlaceEditing"];
                        var newText = editorElement.val();
                        if ( newText !== originalText  ) {
                            var changeAllowed = true;

                            if ($.isFunction(self.onNodeTitleChanged)){
                                changeAllowed = self.onNodeTitleChanged.call(self, nodeToEdit, originalText, newText );
                            }

                            if ( changeAllowed === true ) {
                                self.renameNode( nodeToEdit, newText );
                            } else {
                                window.logMessage( "TreeBrowserWidget.onNodeTitleChanged returned false, title change not alloweed" );
                                cancelEditorAction();
                            }
                        } else {
                            cancelEditorAction();
                        }
                        return false; // stop event bubbling
                    }

                    editForm.keyup(function(anEvent) {
                        // allow canceling with escape
                        var escape = 27;
                        if (escape === anEvent.which)
                            return cancelEditorAction();
                    });

                    editorElement.keyup(function(anEvent) {
                        // allow canceling with escape
                        var enter = 13;
                        if (enter === anEvent.which)
                            editForm.submit();
                    });

                    editorElement.blur(saveEditorAction);

                    editForm.submit(saveEditorAction);

                    editorElement.focus().val( originalText ).select();

                }

                editInPlace( node );

                return false;// Prevent default processing
            } else {
                if ( node.inPlaceEditing && node.inPlaceEditing === true ) {
                    return false;// Prevent default processing
                }
            }
        }
    });
}

TreeBrowserWidget.prototype = {

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
            parentNode = this.treeViewE.dynatree("getRoot");
        } else {
            //check if parent is expanded
            //if parent is not expanded, do not append child, makes no sense since the next open will load tha parent's children
            if ( parentNode.isExpanded() !== true )
                return null;
        }

        // Call the DynaTreeNode.addChild() member function and pass options for the new node
        var newNode = parentNode.addChild({
            title: objDescriptor.name,
            tooltip: objDescriptor.name,
            /*key : objDescriptor.guid,*/
            isFolder: objDescriptor.hasChildren,
            isLazy: objDescriptor.hasChildren
        });

        //log
        window.logMessage( "New node created: " + newNode );

        //a bit of visual effect
        var jqTreeNode = $( newNode.span.childNodes[2] );
        jqTreeNode.hide();
        jqTreeNode.fadeIn();

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

        node.remove();

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
        node.data.title =  text;
        node.data.tooltip = text;
        node.setTitle( text );

        //a bit of visual effect
        var jqTreeNode = $( node.span.childNodes[2] );
        jqTreeNode.hide();
        jqTreeNode.fadeIn();

        //log
        window.logMessage( "Node renamed: " + node );
    },

    /**
     * Called when a node is opened in the tree
     * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
     * @param node
     */
    onNodeOpen : function( node ) {
        window.logMessage( "Default onNodeOpen called, doing nothing. Please override onNodeOpen(node)" );
        this.createNode( node, { name: "Default onNodeOpen called, doing nothing. Please override onNodeOpen(node)!", guid: "_default", hasChildren : false } )
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

        return node.getParent();
    },

    /**
     * Returns the children node of the argument if any. Otherwise returns null.
     * For lazy nodes that have not yet been loaded, undefined is is returned.
     * @param node
     */
    getChildren : function( node ) {
        if ( ! node )
            return null;

        return node.getChildren();
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
    }

}
/*
 * TREEVIEW WIDGET
 */
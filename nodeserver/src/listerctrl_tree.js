define([], function(){
    var ListerCtrl = function(project, treeBrowser ){
        this.project = project;

        this.query = this.project.createQuery();
        this.query.addUI(this);

        //local container for accounting the currently opened node list
        //its a hashmap with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[] }
        this._nodes = {};

        //create the tree using our custom widget
        this.treeBrowser = treeBrowser;

        //save "this" for later
        var self = this;

        setTimeout( function () {
            self.query.addPattern( "root",{self:true, children:true} );
           } , 1 );

        //called from the TreeBrowserWidget when a node is expanded by its expand icon
        this.treeBrowser.onNodeOpen = function( nodeId ) {
            //need to expand the territory
            self.query.addPattern( nodeId, {self:true, children:true} );
        }

        //called from the TreeBrowserWidget when a node has been renamed
        this.treeBrowser.onNodeTitleChanged = function (nodeId, oldText, newText) {

            //send name update to the server
            //TODO: fixme (no good this way...)
            var currentNode = self.project.getNode(nodeId);
            currentNode.name = newText;
            self.project.setNode(currentNode);

            //accept namechange
            return true;
        };

        //called from the TreeBrowserWidget when a node has been closed by its collapse icon
        this.treeBrowser.onNodeClose = function( nodeId ) {
            //remove all chilren (all deep-nested children) from the accoutned open-node list

            //local array to hold all the (nested) children ID to remove from the territory
            var removeFromTerritory = [];

            //removes all the (nested)childrendIDs from the local container accounting the currently opened nodes' list
            var deleteNodeAndChildrenFromLocalHash = function (myNodeId, deleteItself) {

                //if the given node is in this list, go forward with its chilren's ID recursively
                if (self._nodes[ myNodeId ]) {
                    for (var xx = 0; xx < self._nodes[ myNodeId ].children.length; xx++) {
                        deleteNodeAndChildrenFromLocalHash(self._nodes[ myNodeId ].children[xx], true);
                    }

                    //finally delete the nodeId itself (if needed)
                    if (deleteItself === true) {
                        delete self._nodes[ myNodeId ];
                    }

                    //and collect the nodeId from territory removal
                    removeFromTerritory.push({ nodeid:myNodeId });
                }
            };

            //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
            deleteNodeAndChildrenFromLocalHash( nodeId, false );

            //if there is anything to remove from the territory, do it
            if ( removeFromTerritory.length > 0 )  {
                self.query.deletePatterns( removeFromTerritory );
            }
        };

        //called from the TreeBrowserWidget when a node has been marked to "copy this"
        this.treeBrowser.onNodeCopy = function( nodeId ) {
            console.log( "treeBrowser.onNodeCopy " + nodeId );
            self.project.copyNode( nodeId );
        };

        //called from the TreeBrowserWidget when a node has been marked to "paste here"
        this.treeBrowser.onNodePaste = function( nodeId ) {
            console.log( "treeBrowser.onNodePaste " + nodeId );
            self.project.pasteTo( nodeId );
        };

        //called from the TreeBrowserWidget when a node has been marked to "delete this"
        this.treeBrowser.onNodeDelete = function( nodeId ) {
            console.log( "treeBrowser.onNodeDelete " + nodeId );
            self.project.delNode( nodeId );
        };
    };

    /*
     * Called from its query when any object in its territory has been modified
     */
    ListerCtrl.prototype.onRefresh = function( updatedata ){

        //updatedata contains:
        //ilist for inserted nodes
        //mlist for updated nodes
        //dlist for deleted ndoes

        //save "this" for future use
        var self = this;

        //by default use visual effect to highlight modification (flash the node)
        var useVisualEffect = true;

        //disable rendering for tree, speed it up
        if ( updatedata.ilist.length + updatedata.mlist.length + updatedata.dlist.length > 1 ) {
            this.treeBrowser.enableUpdate(false);
            useVisualEffect = false;
        }

        //Handle INSERTED LIST
        for ( var i = 0; i < updatedata.ilist.length; i++ ) {
            var inseretedNodeId = updatedata.ilist[i];

            //root is not represented in the tree
            if ( inseretedNodeId !== "root" ) {

                //get the node itself from the Entity Manager
                var inseretedNode = this.project.getNode( inseretedNodeId );

                //just to make sure that the inserted node really exist on the client
                if ( inseretedNode )
                {
                    //figure out its parent
                    var parentNode = inseretedNode.parentId;
                    if ( inseretedNode.parentId !== null ) {
                        parentNode = this._nodes[ inseretedNode.parentId ].treeNode;
                    }

                    //create a new node for it in the tree
                    var newTreeNode = this.treeBrowser.createNode( parentNode, { id: inseretedNode._id, name: inseretedNode.name, hasChildren : inseretedNode.children.length > 0, objectType :  (inseretedNode.children.length > 0 ) ? "model" : "atom"  } );

                    //store the node's info in the local hashmap
                    this._nodes[ inseretedNode._id ] = { "treeNode": newTreeNode, "children" : inseretedNode.children };
                }
            }
        }

        //local array to hold all the (nested) children ID to remove from the territory
        var removeFromTerritory = [];

        //HANDLE UPDATED LIST
        for (  i = 0; i < updatedata.mlist.length; i++ ) {
            var updatedNodeId = updatedata.mlist[i];

            //root is not represented in the tree
            if ( updatedNodeId !== "root" ) {

                //get the node itself from the Entity Manager
                var updatedNode = this.project.getNode( updatedNodeId );

                //just to make sure that the updated node really exist on the client
                if ( updatedNode )
                {
                    //check to see if the updated node is present in the tree
                    //whatever is present in the tree should be present in the local hashmap
                    if ( this._nodes[ updatedNodeId ] ) {

                        this.treeBrowser.updateNode( this._nodes[ updatedNodeId ].treeNode, updatedNode.name, updatedNode.children.length > 0, useVisualEffect  );

                        //independently of the existence of children update the children info in the local hashmap
                        this._nodes[ updatedNodeId ].children = updatedNode.children;

                        //if there is no more children of the current node, remove it from the territory
                        if ( updatedNode.children.length === 0 ) {
                            removeFromTerritory.push( { nodeid : updatedNodeId } );
                        }

                    } else {
                        //there is an update indicator about the node, but the node itself is not in the tree
                        //this should never happen
                    }
                }
            }
        }

        //HANDLE DELETED LIST



        for (  i = 0; i < updatedata.dlist.length; i++ ) {
            var deletedNodeId = updatedata.dlist[i];

            //root is not represented in the tree
            if ( deletedNodeId !== "root" ) {

                //check to see if the deleted node is present in the tree
                //whatever is present in the tree should be present in the local hashmap
                if ( this._nodes[ deletedNodeId ] ) {

                    //call the TreeBrowserWidget the delete the node from the tree representation
                    this.treeBrowser.deleteNode( this._nodes[ deletedNodeId ].treeNode  );

                    //remove the node and all its (nested)childrem from local opened node hashmap
                    var deleteNodeAndChildrenFromLocalHash = function ( nodeId ) {

                        //if the nodeId is present in the local hashmap
                        if ( self._nodes[ nodeId ] ) {

                            //first remove its children recursively
                            for ( var xx = 0; xx< self._nodes[ nodeId ].children.length ; xx++ ) {
                                deleteNodeAndChildrenFromLocalHash( self._nodes[ nodeId ].children[xx] );
                            }

                            //finally delete the nodeId itself
                            delete self._nodes[ nodeId ];
                        }
                    };

                    //delete this subtree from the deleted node
                    deleteNodeAndChildrenFromLocalHash( deletedNodeId );

                    //extend list to remove from the territory with the current node's ID
                    removeFromTerritory.push( { nodeid : deletedNodeId } );
                }
            }
        }
        //if there is anythign to remove from the territory, do so
        if ( removeFromTerritory.length > 0 )  {
            this.query.deletePatterns( removeFromTerritory );
        }

        //finally enable rendering for the tree again
        if ( updatedata.ilist.length + updatedata.mlist.length + updatedata.dlist.length > 1 )
            this.treeBrowser.enableUpdate(true);
    };


    return ListerCtrl;
});

define([], function(){
    var ListerCtrl = function(project, treeBrowser ){
        this.project = project;

        this._rootNodeId = "root";
        this._stateLoading = 0;
        this._stateLoaded = 1;

        this.query = this.project.createQuery();
        this.query.addUI(this);

        //local container for accounting the currently opened node list
        //its a hashmap with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[] }
        this._nodes = {};

        //create the tree using our custom widget
        this.treeBrowser = treeBrowser;

        //save "this" for later
        var self = this;

        //add "root" with its children to territory
        setTimeout( function () {

            //create a new loading node for it in the tree
            var loadingRootTreeNode = self.treeBrowser.createNode( null, { id: self._rootNodeId, name: "Initializing tree...", hasChildren : false,  class :  "gme-loading" } );

            //store the node's info in the local hashmap
            self._nodes[ self._rootNodeId ] = { "treeNode": loadingRootTreeNode, "children" : [], "state" : self._stateLoading };

            //add the root to the query
            self.query.addPattern( "root", {self:true, children:true} );
           } , 1 );

        //called from the TreeBrowserWidget when a node is expanded by its expand icon
        this.treeBrowser.onNodeOpen = function( nodeId ) {

            //first create dummy elements under the parent representing the childrend being loaded
            var parent = self.project.getNode( nodeId );

            if ( parent ) {

                var parentNode = self._nodes[ nodeId ].treeNode;

                for( var i = 0; i < parent.children.length; i++ ) {
                    var currentChildId = parent.children[i];

                    var childNode = self.project.getNode( currentChildId );

                    //local variable for the created treenode of the child node (loading or full)
                    var childTreeNode = null;

                    //check if the node could be retreived from the project
                    if ( childNode ) {
                        //the node was present on the client side, render ist full data
                        childTreeNode = self.treeBrowser.createNode( parentNode, {  id: currentChildId,
                                                                                    name: childNode.name,
                                                                                    hasChildren : childNode.children.length > 0 ,
                                                                                    class :  (childNode.children.length > 0 ) ? "gme-model" : "gme-atom"
                        } );

                        //store the node's info in the local hashmap
                        self._nodes[ currentChildId ] = {   "treeNode": childTreeNode,
                                                            "children" : childNode.children,
                                                            "state" : self._stateLoaded };
                    } else {
                        //the node is not present on the client side, render a loading node instead
                        //create a new node for it in the tree
                        childTreeNode = self.treeBrowser.createNode( parentNode, {  id: currentChildId,
                                                                                    name: "Loading...",
                                                                                    hasChildren : false,
                                                                                    class :  "gme-loading"
                        } );

                        //store the node's info in the local hashmap
                        self._nodes[ currentChildId ] = {   "treeNode": childTreeNode,
                                                            "children" : [],
                                                            "state" : self._stateLoading
                        };
                    }
                }
            }

            //need to expand the territory
            self.query.addPattern( nodeId, {self:true, children:true} );
        };

        //called from the TreeBrowserWidget when a node has been closed by its collapse icon
        this.treeBrowser.onNodeClose = function( nodeId ) {

            //remove all chilren (all deep-nested children) from the accoutned open-node list

            //local array to hold all the (nested) children ID to remove from the territory
            var removeFromTerritory = [];

            //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened nodes's info
            var deleteNodeAndChildrenFromLocalHash = function ( childNodeId, deleteSelf) {

                //if the given node is in this hashmap itself, go forward with its children's ID recursively
                if (self._nodes[ childNodeId ]) {
                    for (var xx = 0; xx < self._nodes[ childNodeId ].children.length; xx++) {
                        deleteNodeAndChildrenFromLocalHash(self._nodes[ childNodeId ].children[xx], true);
                    }

                    //finally delete the nodeId itself (if needed)
                    if (deleteSelf === true) {
                        delete self._nodes[ childNodeId ];
                    }

                    //and collect the nodeId from territory removal
                    removeFromTerritory.push( { nodeid: childNodeId  });
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
        this.treeBrowser.onNodeCopy = function( selectedIds ) {
            console.log( "treeBrowser.onNodeCopy " + selectedIds );
            self.project.copyNode( selectedIds );
        };

        //called from the TreeBrowserWidget when a node has been marked to "paste here"
        this.treeBrowser.onNodePaste = function( nodeId ) {
            console.log( "treeBrowser.onNodePaste " + nodeId );
            self.project.pasteTo( nodeId );
        };

        //called from the TreeBrowserWidget when a node has been marked to "delete this"
        this.treeBrowser.onNodeDelete = function( selectedIds ) {
            console.log( "treeBrowser.onNodeDelete " + selectedIds );
            self.project.delNode( selectedIds );
        };

        //called from the TreeBrowserWidget when a node has been renamed
        this.treeBrowser.onNodeTitleChanged = function (nodeId, oldText, newText) {

            //send name update to the server
            //TODO: fixme (no good this way...)
            var currentNode = self.project.getNode(nodeId);
            currentNode.name = newText;
            self.project.setNode(currentNode);

            //accept namechange
            return false;
        };
    };

    ListerCtrl.prototype.onRefresh2 = function( eventType, objectId ) {

        //HANDLE INSERT
        //object got inserted into the territory
        if ( eventType === "insert" ) {
            //check if this control shows any interest for this object
            if ( this._nodes[ objectId ] ) {

                //if the object is in "loading" state according to the local hashmap
                //update the "loading" node accordingly
                if ( this._nodes[ objectId ].state === this._stateLoading ) {
                    //set eventType to "update" and let it go and be handled by "update" event
                    eventType = "update";
                } else {
                    //object is not in Loading state, don't do anything
                }
            } else {
                //so far this control does not know anything about this node...
                //don't do anything with it, most probably it has become part of the query
                //because of some weird rule but this control is not even interested in it
            }
        }
        //ENDOF : HANDLE INSERT

        //HANDLE UPDATE
        //object got updated in the territory
        if ( eventType === "update" ) {
            //check if this control shows any interest for this object
            if ( this._nodes[ objectId ] ) {
                console.log( "Update id: " + objectId );
                //get the node from the project
                var updatedObject = this.project.getNode( objectId );

                if ( updatedObject ) {

                    //check what state the object is in according to the local hashmap
                    if ( this._nodes[ objectId ].state === this._stateLoading ) {
                        //if the object is in "loading" state, meaning we were waiting for it
                        //render it's real data

                        //specify the icon for the treenode
                        //TODO: fixme (determine the type based on the 'kind' of the object)
                        var objType = (updatedObject.children.length > 0 ) ? "gme-model" : "gme-atom";
                        //for root node let's specify specific type
                        if ( objectId === this._rootNodeId ) {
                            objType = "gme-root";
                        }

                        //create the node's descriptor for the treebrowser widget
                        var nodeDescriptor = { "text" : updatedObject.name, "hasChildren" : updatedObject.children.length > 0, "class" : objType };

                        //update the node's representation in the tree
                        this.treeBrowser.updateNode( this._nodes[ objectId ].treeNode, nodeDescriptor  );

                        //update the object's children list in the local hashmap
                        this._nodes[ objectId ].children = updatedObject.children;

                        //finally update the object's state showing loaded
                        this._nodes[ objectId ].state = this._stateLoaded;
                    } else {
                        //object is already loaded here, let's see what changed in it

                        //create the node's descriptor for the treebrowser widget
                        var nodeDescriptor = {
                            "text" : updatedObject.name,
                            "hasChildren" : updatedObject.children.length > 0//,
                            //"icon" : "http://someimage.jpg"  --- SET ICON HERE IF NEEDED
                        };

                        //update the node's representation in the tree
                        this.treeBrowser.updateNode( this._nodes[ objectId ].treeNode, nodeDescriptor  );

                        //TODO: let's see if children has been added / removed from the object and update the tree and territory accordingly
                        var oldChildren = this._nodes[ objectId ].children;
                        var currentChildren = updatedObject.children;

                        var arrayMinus = function( arrayA, arrayB ) {
                            var result = [];
                            for ( var i = 0; i < arrayA.length; i++ ) {
                                if ( arrayA[i] ) {
                                    var val = arrayA[i];
                                    if ( arrayB.indexOf( val ) === -1 ) {
                                        result.push( val );
                                    }
                                }
                            }

                            return result;
                        };

                        //the concrete child deletion is important only if the node is open in the tree
                        if ( this.treeBrowser.isExpanded(  this._nodes[ objectId ].treeNode ) ) {
                            //figure out what are the deleted children's IDs
                            var childrenDeleted = arrayMinus( oldChildren, currentChildren );

                            //if all the children has been removed, it's already handled with the node's update itself
                            /*if ( ( childrenDeleted.length === oldChildren.length ) && ( currentChildren.length === 0 ) ) {
                                return;
                            }*/

                            //handle deleted children
                            var removeFromTerritory = [];
                            for ( var j = 0; j < childrenDeleted.length; j++ ) {

                                var currentChildId = childrenDeleted[j];

                                if ( this._nodes[ currentChildId ] ) {

                                    //get all the children that have been removed with this node deletion
                                    //and remove them from this._nodes

                                    //call the node deletion in the treebrowser widget
                                    this.treeBrowser.deleteNode( this._nodes[ currentChildId ].treeNode );

                                    //local array to hold all the (nested) children ID to remove from the territory
                                    var self = this;

                                    //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened nodes's info
                                    var deleteNodeAndChildrenFromLocalHash = function ( childNodeId ) {

                                        //if the given node is in this hashmap itself, go forward with its children's ID recursively
                                        if (self._nodes[ childNodeId ]) {
                                            for (var xx = 0; xx < self._nodes[ childNodeId ].children.length; xx++) {
                                                deleteNodeAndChildrenFromLocalHash(self._nodes[ childNodeId ].children[xx], true);
                                            }

                                            //finally delete the nodeId itself (if needed)
                                            delete self._nodes[ childNodeId ];

                                            //and collect the nodeId from territory removal
                                            removeFromTerritory.push( { nodeid: childNodeId  });
                                        }
                                    };

                                    //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
                                    deleteNodeAndChildrenFromLocalHash( currentChildId, false );
                                }
                            }

                            //if there is anythign to remove from the territory, do so
                            if ( removeFromTerritory.length > 0 )  {
                                this.query.deletePatterns( removeFromTerritory );
                            }
                        }

                        //the concrete child addition is important only if the node is open in the tree
                        if ( this.treeBrowser.isExpanded(  this._nodes[ objectId ].treeNode ) ) {
                            //figure out what are the new children's IDs
                            var childrenAdded = arrayMinus( currentChildren, oldChildren );

                            //handle added children
                            for ( var j = 0; j < childrenAdded.length; j++ ) {
                                var currentChildId = childrenAdded[j];

                                var childNode = this.project.getNode( currentChildId );

                                //local variable for the created treenode of the child node (loading or full)
                                var childTreeNode = null;

                                //check if the node could be retreived from the project
                                if ( childNode ) {
                                    //the node was present on the client side, render ist full data
                                    childTreeNode = this.treeBrowser.createNode( this._nodes[ objectId ].treeNode, {  id: currentChildId,
                                        name: childNode.name,
                                        hasChildren : childNode.children.length > 0 ,
                                        class :  (childNode.children.length > 0 ) ? "gme-model" : "gme-atom" } );

                                    //store the node's info in the local hashmap
                                    this._nodes[ currentChildId ] = {   "treeNode": childTreeNode,
                                        "children" : childNode.children,
                                        "state" : this._stateLoaded };
                                } else {
                                    //the node is not present on the client side, render a loading node instead
                                    //create a new node for it in the tree
                                    childTreeNode = this.treeBrowser.createNode( this._nodes[ objectId ].treeNode, {  id: currentChildId,
                                        name: "Loading...",
                                        hasChildren : false,
                                        class :  "gme-loading"  } );

                                    //store the node's info in the local hashmap
                                    this._nodes[ currentChildId ] = {   "treeNode": childTreeNode,
                                        "children" : [],
                                        "state" : this._stateLoading };
                                }
                            }
                        }

                        //update the object's children list in the local hashmap
                        this._nodes[ objectId ].children = updatedObject.children;

                        //finally update the object's state showing loaded
                        this._nodes[ objectId ].state = this._stateLoaded;

                        //if there is no more children of the current node, remove it from the territory
                        if ( updatedObject.children.length === 0 ) {
                            //TODO : adjust the territory accordingly
                            //removeFromTerritory.push( { nodeid : updatedNodeId } );
                        }
                    }
                } else {
                    //we got an update about an object that we cannot get from the project
                    //something is very very bad here...
                }
            } else {
                //so far this control does not know anything about this node...
            }
        }
        //ENDOF : HANDLE UPDATE
    };

    /*
     * Called from its query when any object in its territory has been modified
     */
    ListerCtrl.prototype.onRefresh = function( updatedata ){

        //updatedata contains:
        //ilist for inserted nodes
        //mlist for updated nodes
        //dlist for deleted ndoes

        //since it will be overwritten to different individual events, let's do this here
        for ( var i = 0; i < updatedata.ilist.length; i++ ) {
            this.onRefresh2( "insert",  updatedata.ilist[i] );
        }

        for ( var i = 0; i < updatedata.mlist.length; i++ ) {
            this.onRefresh2( "update",  updatedata.mlist[i] );
        }
    };


    return ListerCtrl;
});

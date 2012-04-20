define(['/common/logmanager.js', '/common/EventDispatcher.js', './util.js'], function( logManager, EventDispatcher, util ){

    var TreeBrowserControl = function( client, treeBrowser ){

        //get logger instance for this component
        var logger = logManager.create("TreeBrowserControl");

        var _rootNodeId = "root";
        var _stateLoading = 0;
        var _stateLoaded = 1;

        var territoryId = client.reserveTerritory( this );


        //local container for accounting the currently opened node list
        //its a hashmap with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[] }
        var _nodes = {};

        //add "root" with its children to territory
        setTimeout( function () {

            //create a new loading node for it in the tree
            var loadingRootTreeNode = treeBrowser.createNode( null, {   "id": _rootNodeId,
                                                                        "name": "Initializing tree...",
                                                                        "hasChildren" : false,
                                                                        "class" :  "gme-loading" } );

            //store the node's info in the local hashmap
            _nodes[ _rootNodeId ] = {   "treeNode": loadingRootTreeNode,
                                        "children" : [],
                                        "state" : _stateLoading };

            //add the root to the query
            client.addPatterns( territoryId, { "root": { "children": 1, "base": 3 } } );
           } , 1 );

        //called from the TreeBrowserWidget when a node is expanded by its expand icon
        treeBrowser.onNodeOpen = function( nodeId ) {

            //first create dummy elements under the parent representing the childrend being loaded
            var parent = client.getNode( nodeId );

            if ( parent ) {

                //get the DOM node representing the parent in the tree
                var parentNode = _nodes[ nodeId ]["treeNode"];

                //get the children IDs of the parent
                var childrenIDs = parent.getAttribute("children");

                for( var i = 0; i < childrenIDs.length; i++ ) {
                    var currentChildId = childrenIDs[i];

                    var childNode = client.getNode( currentChildId );

                    //local variable for the created treenode of the child node (loading or full)
                    var childTreeNode = null;

                    //check if the node could be retreived from the client
                    if ( childNode ) {
                        //the node was present on the client side, render ist full data
                        childTreeNode = treeBrowser.createNode( parentNode, {   "id": currentChildId,
                                                                                "name": childNode.getAttribute("name"),
                                                                                "hasChildren" : (childNode.getAttribute("children")).length > 0 ,
                                                                                "class" :   ((childNode.getAttribute("children")).length > 0 ) ? "gme-model" : "gme-atom"
                        } );

                        //store the node's info in the local hashmap
                        _nodes[ currentChildId ] = {    "treeNode": childTreeNode,
                                                        "children" : childNode.getAttribute("children"),
                                                        "state" : _stateLoaded };
                    } else {
                        //the node is not present on the client side, render a loading node instead
                        //create a new node for it in the tree
                        childTreeNode = treeBrowser.createNode( parentNode, {   "id": currentChildId,
                                                                                "name": "Loading...",
                                                                                "hasChildren" : false,
                                                                                "class" :  "gme-loading"
                        } );

                        //store the node's info in the local hashmap
                        _nodes[ currentChildId ] = {    "treeNode": childTreeNode,
                                                        "children" : [],
                                                        "state" : _stateLoading };
                    }
                }
            }

            //need to expand the territory
            var newpattern = {};
            newpattern[nodeId] = { "children": 1, "base": 3 };
            client.addPatterns( territoryId, newpattern );
        };

        //called from the TreeBrowserWidget when a node has been closed by its collapse icon
        treeBrowser.onNodeClose = function( nodeId ) {

            //remove all chilren (all deep-nested children) from the accoutned open-node list

            //local array to hold all the (nested) children ID to remove from the territory
            var removeFromTerritory = [];

            //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened nodes's info
            var deleteNodeAndChildrenFromLocalHash = function ( childNodeId, deleteSelf) {

                //if the given node is in this hashmap itself, go forward with its children's ID recursively
                if ( _nodes[ childNodeId ] ) {
                    for (var xx = 0; xx < _nodes[ childNodeId ].children.length; xx++) {
                        deleteNodeAndChildrenFromLocalHash( _nodes[ childNodeId ].children[xx], true);
                    }

                    //finally delete the nodeId itself (if needed)
                    if (deleteSelf === true) {
                        delete _nodes[ childNodeId ];
                    }

                    //and collect the nodeId from territory removal
                    removeFromTerritory.push( { "nodeid": childNodeId  });
                }
            };

            //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
            deleteNodeAndChildrenFromLocalHash( nodeId, false );

            //if there is anything to remove from the territory, do it
            if ( removeFromTerritory.length > 0 )  {
                client.removePatterns( territoryId, removeFromTerritory );
            }
        };

        //called from the TreeBrowserWidget when a node has been marked to "copy this"
        treeBrowser.onNodeCopy = function( selectedIds ) {
            client.copy( selectedIds );
        };

        //called from the TreeBrowserWidget when a node has been marked to "paste here"
        treeBrowser.onNodePaste = function( nodeId ) {
            client.paste( nodeId );
        };

        //called from the TreeBrowserWidget when a node has been marked to "delete this"
        treeBrowser.onNodeDelete = function( selectedIds ) {
            for(var i= 0; i <selectedIds.length; i++){
                client.delNode( selectedIds[i] );
            }
        };

        //called from the TreeBrowserWidget when a node has been renamed
        treeBrowser.onNodeTitleChanged = function (nodeId, oldText, newText) {

            //send name update to the server
            var currentNode = client.getNode(nodeId);
            currentNode.setAttribute( "name", newText);

            //reject namechange on client side - need server roundtrip to notify about the name change
            return false;
        };

        //called when the user double-cliked on a node in the tree
        treeBrowser.onNodeDoubleClicked = function( nodeId ) {
            logger.debug( "Firing onNodeDoubleClicked with nodeId: " + nodeId );
            client.setSelectedObjectId( nodeId );
        };

        var refresh = function( eventType, objectId ) {
            var nodeDescriptor = null, currentChildId = null, j = 0;

            logger.debug( "Refresh event '" + eventType +"', with objectId: '" + objectId + "'" );

            //HANDLE INSERT
            //object got inserted into the territory
            if ( eventType === "insert" ) {
                //check if this control shows any interest for this object
                if ( _nodes[ objectId ] ) {

                    //if the object is in "loading" state according to the local hashmap
                    //update the "loading" node accordingly
                    if ( _nodes[ objectId ].state === _stateLoading ) {
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
                //handle deleted children
                var removeFromTerritory = [];
                //check if this control shows any interest for this object
                if ( _nodes[ objectId ] ) {
                    logger.debug( "Update object with id: " + objectId );
                    //get the node from the client
                    var updatedObject = client.getNode( objectId );

                    if ( updatedObject ) {

                        //check what state the object is in according to the local hashmap
                        if ( _nodes[ objectId ]["state"] === _stateLoading ) {
                            //if the object is in "loading" state, meaning we were waiting for it
                            //render it's real data

                            //specify the icon for the treenode
                            //TODO: fixme (determine the type based on the 'kind' of the object)
                            var objType = (( updatedObject.getAttribute( "children" ) ).length > 0 ) ? "gme-model" : "gme-atom";
                            //for root node let's specify specific type
                            if ( objectId === _rootNodeId ) {
                                objType = "gme-root";
                            }

                            //create the node's descriptor for the treebrowser widget
                            nodeDescriptor = {  "text" :  updatedObject.getAttribute("name"),
                                "hasChildren" : ( updatedObject.getAttribute( "children" ) ).length > 0,
                                "class" : objType };

                            //update the node's representation in the tree
                            treeBrowser.updateNode( _nodes[ objectId ]["treeNode"], nodeDescriptor  );

                            //update the object's children list in the local hashmap
                            _nodes[ objectId ]["children"] = updatedObject.getAttribute("children");

                            //finally update the object's state showing loaded
                            _nodes[ objectId ]["state"] = _stateLoaded;
                        } else {
                            //object is already loaded here, let's see what changed in it

                            //create the node's descriptor for the treebrowser widget
                            nodeDescriptor = {
                                "text" : updatedObject.getAttribute( "name" ),
                                "hasChildren" : ( updatedObject.getAttribute( "children" ) ).length > 0//,
                                //"icon" : "img/temp/icon1.png"  --- SET ICON HERE IF NEEDED
                            };

                            //update the node's representation in the tree
                            treeBrowser.updateNode( _nodes[ objectId ]["treeNode"], nodeDescriptor  );

                            var oldChildren = _nodes[ objectId ]["children"];
                            var currentChildren = updatedObject.getAttribute( "children" );

                            //the concrete child deletion is important only if the node is open in the tree
                            if ( treeBrowser.isExpanded(  _nodes[ objectId ]["treeNode"] ) ) {
                                //figure out what are the deleted children's IDs
                                var childrenDeleted = util.arrayMinus( oldChildren, currentChildren );

                                for ( j = 0; j < childrenDeleted.length; j++ ) {

                                    currentChildId = childrenDeleted[j];

                                    if ( _nodes[ currentChildId ] ) {

                                        //get all the children that have been removed with this node deletion
                                        //and remove them from this._nodes

                                        //call the node deletion in the treebrowser widget
                                        treeBrowser.deleteNode( _nodes[ currentChildId ]["treeNode"] );

                                        //local array to hold all the (nested) children ID to remove from the territory


                                        //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened nodes's info
                                        var deleteNodeAndChildrenFromLocalHash = function ( childNodeId ) {

                                            //if the given node is in this hashmap itself, go forward with its children's ID recursively
                                            if ( _nodes[ childNodeId ]) {
                                                for (var xx = 0; xx < _nodes[ childNodeId ].children.length; xx++) {
                                                    deleteNodeAndChildrenFromLocalHash( _nodes[ childNodeId ].children[xx] );
                                                }

                                                //finally delete the nodeId itself (if needed)
                                                delete _nodes[ childNodeId ];

                                                //and collect the nodeId from territory removal
                                                removeFromTerritory.push( { "nodeid": childNodeId  });
                                            }
                                        };

                                        //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
                                        deleteNodeAndChildrenFromLocalHash( currentChildId );
                                    }
                                }
                            }

                            //the concrete child addition is important only if the node is open in the tree
                            if ( treeBrowser.isExpanded(  _nodes[ objectId ]["treeNode"] ) ) {
                                //figure out what are the new children's IDs
                                var childrenAdded = util.arrayMinus( currentChildren, oldChildren );

                                //handle added children
                                for ( j = 0; j < childrenAdded.length; j++ ) {
                                    currentChildId = childrenAdded[j];

                                    var childNode = client.getNode( currentChildId );

                                    //local variable for the created treenode of the child node (loading or full)
                                    var childTreeNode = null;

                                    //check if the node could be retreived from the project
                                    if ( childNode ) {
                                        //the node was present on the client side, render ist full data
                                        childTreeNode = treeBrowser.createNode( _nodes[ objectId ]["treeNode"], {  "id": currentChildId,
                                            "name": childNode.getAttribute("name"),
                                            "hasChildren" :(childNode.getAttribute("children")).length > 0 ,
                                            "class" :  ((childNode.getAttribute("children")).length > 0 ) ? "gme-model" : "gme-atom" } );

                                        //store the node's info in the local hashmap
                                        _nodes[ currentChildId ] = {   "treeNode": childTreeNode,
                                            "children" : childNode.getAttribute("children"),
                                            "state" : _stateLoaded };
                                    } else {
                                        //the node is not present on the client side, render a loading node instead
                                        //create a new node for it in the tree
                                        childTreeNode = treeBrowser.createNode( _nodes[ objectId ]["treeNode"], {  "id": currentChildId,
                                            "name": "Loading...",
                                            "hasChildren" : false,
                                            "class" :  "gme-loading"  } );

                                        //store the node's info in the local hashmap
                                        _nodes[ currentChildId ] = {   "treeNode": childTreeNode,
                                            "children" : [],
                                            "state" : _stateLoading };
                                    }
                                }
                            }

                            //update the object's children list in the local hashmap
                            _nodes[ objectId ].children = updatedObject.getAttribute("children");

                            //finally update the object's state showing loaded
                            _nodes[ objectId ].state = _stateLoaded;

                            //if there is no more children of the current node, remove it from the territory
                            if ( (updatedObject.getAttribute("children")).length === 0 ) {
                                removeFromTerritory.push( { "nodeid" : objectId } );
                            }

                            //if there is anythign to remove from the territory, do so
                            if ( removeFromTerritory.length > 0 )  {
                                client.removePatterns( territoryId, removeFromTerritory );
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

        this.onEvent = function(etype,eid){
            switch(etype){
                case "load":
                    refresh( "insert", eid );
                    break;
                case "modify":
                    refresh( "update", eid );
                    break;
                case "create":
                    refresh( "insert", eid );
                    break;
                case "delete":
                    refresh( "update", eid );
            }
        };
    };

    return TreeBrowserControl;
});

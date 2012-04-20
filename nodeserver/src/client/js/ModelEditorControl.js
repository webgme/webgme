define(['/common/logmanager.js', '/common/EventDispatcher.js', './util.js'], function( logManager, EventDispatcher, util ){

    var ModelEditorControl = function( myProject, myModelEditor ){

        //get logger instance for this component
        var logger = logManager.create("ModelEditorControl");

        var project = myProject;

        var territoryId = project.reserveTerritory( this );

        var _stateLoading = 0;
        var _stateLoaded = 1;

        //local container for accounting the currently opened node list
        //its a hashmap with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[] }
        var _nodes = {};

        //create the tree using our custom widget
        var modelEditor = myModelEditor;

        //local variable holding info about the currently opened node
        var currentNodeInfo = { "id": null, "children" : [] };

        project.addEventListener( project.events.SELECTEDOBJECT_CHANGED, function( project, nodeId ) {
            //delete everything from modeleditor
            modelEditor.clear();

            //clean up local hashmap
            _nodes = {};

            if ( currentNodeInfo.id ) {
                project.removePatterns( territoryId, { "nodeid": currentNodeInfo.id  } );
            }

            currentNodeInfo = { "id": null, "children" : [] };

            var newpattern = {};
            newpattern[nodeId] = { "children": 1 };
            project.addPatterns( territoryId, newpattern );

            var selectedNode = project.getNode( nodeId );

            if ( selectedNode ) {
                modelEditor.setTitle( selectedNode.getAttribute("name") );

                //get the children IDs of the parent
                var childrenIDs = selectedNode.getAttribute("children");

                for( var i = 0; i <childrenIDs.length; i++ ) {

                    var currentChildId = childrenIDs[i];

                    var childNode = project.getNode( currentChildId );

                    var childObject = null;

                    //assume that the child is not yet loaded on the client
                    _nodes[ currentChildId ] = {   "modelObject": childObject,
                                                    "state" : _stateLoading };

                    var childDescriptor =  { "id" : currentChildId,
                        "posX": 20,
                        "posY": 20,
                        "title": "Loading..."  };

                    if ( childNode ) {
                        childDescriptor["posX"] = childNode.getAttribute("attr").posX;
                        childDescriptor["posY"] = childNode.getAttribute("attr").posY;
                        childDescriptor["title"] =  childNode.getAttribute("name");

                        //store the node's info in the local hashmap
                        _nodes[ currentChildId ]["state"] = _stateLoaded;
                    }

                    _nodes[ currentChildId ]["modelObject"] = modelEditor.createObject( childDescriptor );
                }

                //save the given nodeId as the currently handled one
                currentNodeInfo.id = nodeId;
                currentNodeInfo.children = childrenIDs;
            }
        } );

        var refresh = function( eventType, objectId ) {
            var nodeDescriptor = null, j;

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

                //check if the updated object is the opened node
                if ( objectId === currentNodeInfo.id ) {
                    //the updated object is the parent whose children are drawn here
                    //the only interest about the parent are the new and deleted children
                    var parentNode = project.getNode( objectId );

                    var oldChildren = currentNodeInfo.children;
                    var currentChildren = [];
                    if ( parentNode ) {
                        currentChildren = parentNode.getAttribute("children");
                    }

                    //Handle children deletion
                    var childrenDeleted = util.arrayMinus( oldChildren, currentChildren );


                    for ( j = 0; j < childrenDeleted.length; j++ ) {
                        var deletedChildId = childrenDeleted[j];
                        modelEditor.deleteObject(_nodes[ deletedChildId ]["modelObject"]);
                        delete _nodes[deletedChildId];
                    }

                    //Handle children addition
                    var childrenAdded = util.arrayMinus( currentChildren, oldChildren );
                    for ( j = 0; j < childrenAdded.length; j++ ) {
                        var addedChildId = childrenAdded[j];

                        var childNode = project.getNode( addedChildId );

                        var childObject = null;

                        //assume that the child is not yet loaded on the client
                        _nodes[ addedChildId ] = {   "modelObject": childObject,
                            "state" : _stateLoading };

                        var childDescriptor =  { "id" : addedChildId,
                            "posX": 20,
                            "posY": 20,
                            "title": "Loading..."  };

                        if ( childNode ) {
                            childDescriptor["posX"] = childNode.getAttribute("attr").posX;
                            childDescriptor["posY"] = childNode.getAttribute("attr").posY;
                            childDescriptor["title"] =  childNode.getAttribute("name");

                            //store the node's info in the local hashmap
                            _nodes[ addedChildId ]["state"] = _stateLoaded;
                        }

                        _nodes[ addedChildId ]["modelObject"] = modelEditor.createObject( childDescriptor );
                    }

                    //finally store the actual children info for the parent
                    currentNodeInfo.children = currentChildren;

                } else if ( _nodes[ objectId ] ) {
                    //this control shows an interest for this object
                    logger.debug( "Update object with id: " + objectId );
                    //get the node from the project
                    var updatedObject = project.getNode( objectId );

                    if ( updatedObject ) {

                        //create the node's descriptor for the widget
                        nodeDescriptor = {   "id" : objectId,
                            "posX": updatedObject.getAttribute("attr").posX,
                            "posY": updatedObject.getAttribute("attr").posY,
                            "title": updatedObject.getAttribute("name") };

                        //check what state the object is in according to the local hashmap
                        if ( _nodes[ objectId ].state === _stateLoading ) {
                            _nodes[ objectId ].state = _stateLoaded;
                        }

                        //update the node's representation in the tree
                        modelEditor.updateObject( _nodes[ objectId ]["modelObject"], nodeDescriptor  );
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

        // PUBLIC METHODS
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

    return ModelEditorControl;
});

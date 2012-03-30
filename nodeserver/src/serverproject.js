/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
/*
 * --------PROJECT-------
 */
var ST = require('./serverstorage.js');
var SO = require('./serversocket.js');
Project = function(){
	this.mystorage = new ST.Storage();
	this.mysockets = [];
	//this.mystorage.set("root",{_id: "root", name:"gyoker", children:[], size:"big"});

    var rootChildren = [];

    var itemNum = 10000;
    var topLevelItems = 30;
    var entityIds = [];

    console.log( "Generating " + itemNum + " objects..." );
    for ( var i = 0; i < itemNum; i++ ) {
        //generate obejct
        var myId = "id" + i;
        var myObject = { _id: myId, name: "Object" + i, children: [], parentId : null };

        if ( i > topLevelItems  ) {
            //pick a parent for it randomly
            var rndParentPos = Math.floor(Math.random()* (i - 1) );

            var parentEntityId = entityIds[ rndParentPos ];

            //set its parent
            myObject.parentId = parentEntityId;

            //add it to its parent's children list
            this.mystorage.get( parentEntityId ).children.push(myId);
        } else {
            rootChildren.push( myId );
        }

        //store object in my storage
        this.mystorage.set( myId, myObject );
        entityIds.push( myId );
    }
    console.log( "DONE" );

    /*for ( var i = 0; i < 10; i++ ) {
        var myId = "id" + i;

        var myObject = { _id: myId, name: "Object" + i, children: [], parentId : null };

        var level1Children = [];
        for ( j = 0; j < 10; j++ ) {
            var level1id = "id_" + i + "_" + j;

            var level1Object = { _id: level1id, name: "Object" + i + "_" + j, children: [], parentId : myId };
            this.mystorage.set( level1id, level1Object );

            level1Children.push( level1id );
        }

        myObject.children = level1Children;

        rootChildren.push( myId );

        this.mystorage.set( myId, myObject );
    }
    /*this.mystorage.set("id1",{_id: "id1", name:"Object1", children:[ ], size:"big"});
    this.mystorage.set("id2",{_id: "id2", name:"Object2", children:[ ], size:"big"});*/

    this.mystorage.set("root",{_id: "root", name:"gyoker", children: rootChildren , size:"big"});
};
/*public functions*/
Project.prototype.addClient = function(socket){
	/*
	 * the parameter socket is the plain socket.io socket
	 */
	var newsocket = new SO.Socket(socket, this.mystorage);
	newsocket.setListener(this);
	this.mysockets.push(newsocket);
};

Project.prototype.onMessage = function(data){
	var changed = [];
	for(var i in data.objects){
		var tritem = data.objects[i];
		this.mystorage.set(tritem.id,tritem.object);
		changed.push(tritem.id);
	}
	refresh(this, changed);		
};

/*private function*/
refresh = function(serverproject, changedobjects){
	for(var i in serverproject.mysockets){
		serverproject.mysockets[i].refresh(changedobjects);
	}
};
/*
 * exports
 */
exports.Project = Project;

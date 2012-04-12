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
        var myObject = { _id: myId, name: "Object" + i, children: [], parentId : "root" };

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

    this.mystorage.set( "root" ,{_id: "root", name:"RootFolder", children: rootChildren , size:"big"});
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
    var self = this;
    var removeNodeRecursive = function(objectid, changequeue){
        var object = self.mystorage.get(objectid);
        if(object){
            self.mystorage.set(objectid,undefined);
            changequeue.push(objectid);
            for(var i in object.children){
                removeNodeRecursive(object.children[i],changequeue);
            }
        }
    };

    var changed = [];
    for(var i in data.objects){
        var tritem = data.objects[i];
        if(tritem.object === undefined){
            var object = this.mystorage.get(tritem.id);
            if(object){
                var parent = this.mystorage.get(object.parentId);
                removeNodeRecursive(tritem.id, changed );
                if(parent){
                    var objectpos = parent.children.indexOf(tritem.id);
                    if(objectpos !== -1){
                        parent.children.splice(objectpos,1);
                        this.mystorage.set(parent._id,parent);
                        changed.push(parent._id);
                    }
                }
            }
        }
        else{
            this.mystorage.set(tritem.id,tritem.object);
            changed.push(tritem.id);
        }
    }
    refresh(self,changed);
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

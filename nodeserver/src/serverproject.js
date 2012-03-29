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
	this.mystorage.set("root",{_id: "root", name:"gyoker", children:[], size:"big"});
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
	/*
	 * here comes the fun :)
	 * 1 handle the transaction
	 * 2 create new revision if it contained modifications
	 * 3 gather the changes - currently we will have everything
	 * 4 emit the response to everyone -> call send function
	 */
	var transaction = JSON.parse(data);
	for(var i in transaction.elements){
		var tritem = transaction.elements[i];
			var newobj = {}; newobj.id = tritem.id; newobj.object = tritem.object;
			this.mystorage.set(tritem.id,tritem.object);
		}
	this.mystorage.finalize();		
};

/*private function*/
refresh = function(serverproject){
	for(var i in serverproject.mysockets){
		serverproject.mysockets[i].refresh();
	}
};
/*
 * exports
 */
exports.Project = Project;

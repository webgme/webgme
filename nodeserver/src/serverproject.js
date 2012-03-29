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
	for(var i in data.objects){
		var tritem = data.objects[i];
		this.mystorage.set(tritem.id,tritem.object);
	}
	refresh(this);		
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

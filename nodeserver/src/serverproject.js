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
	this.mystorage.set("root",{_id: "root", attributes:{name:"gyoker", children:[], size:"big"}});
};

Project.prototype.addClient = function(socket){
	/*
	 * the parameter socket is the plain socket.io socket
	 */
	var newsocket = new SO.Socket(socket);
	newsocket.setListener(this);
	this.mysockets.push(newsocket);
	var roottritem = {}; roottritem.id="root"; roottritem.object = this.mystorage.get("root");
	var roottr = {}; roottr.objects = []; roottr.objects.push(roottritem);
	newsocket.send(JSON.stringify(roottr));
};

Project.prototype.onMessage = function(data){
	/*
	 * here comes the fun :)
	 * 1 handle the transaction
	 * 2 create new revision if it contained modifications
	 * 3 gather the changes - currently we will have everything
	 * 4 emit the response to everyone -> call send function
	 */
	if(data !== undefined){
		var transaction = JSON.parse(data);
		var result = {};
		result.objects = [];
		for(var i in transaction.elements){
			var tritem = transaction.elements[i];
			if(tritem.type === "set"){
				var newobj = {}; newobj.id = tritem.id; newobj.object = tritem.object;
				result.objects.push(newobj);
				this.mystorage.set(tritem.id,tritem.object);
			}
			else{ /*get*/
				var newobj = {}; newobj.id = tritem.id; newobj.object = this.mystorage.get(tritem.id); 
				result.objects.push(newobj);
			}
		}
		this.mystorage.finalize();
		this.send(JSON.stringify(result));
	}
};

Project.prototype.send = function(data){
	for(var i in this.mysockets){
		this.mysockets[i].send(data);
	}
};

/*
 * exports
 */
exports.Project = Project;

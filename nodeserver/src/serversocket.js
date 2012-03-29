/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
/*
 * --------SOCKET--------
 */
Socket = function(socket, storage){
	this.socket = socket;
	this.listener = undefined; /*this is normally the project but it is only an interface which understands the onMessage function*/
	this.queries = {};
	this.querymatrix = {};
	this.storage = storage; /*read only connection - na ezt hogy lehet javascript-ben megcsinalni???*/
	var that = this;
	this.socket.on('updateObjects', function(data){
		if(that.listener !== undefined){
			that.listener.onMessage(data);
		}
	});
	this.socket.on('updateQuery', function(msg){
		that.queries[msg.id] = msg.query;
		var objectlist = queryToObjectList(that,msg.id);
		updateQueryMatrix(that,msg.id,objectlist);
		sendObjectList(that,objectlist,msg.id);
	});
};
/*public functions*/
Socket.prototype.setListener = function(listener){
	this.listener = listener;
};
Socket.prototype.refresh = function(changedobjects){
	/*
	 * first we need to refresh the whole querymatrix
	 */
	for(var i in this.queries){
		var queryid = i;
		var objectlist = queryToObjectList(this,queryid);
		updateQueryMatrix(this,queryid,objectlist);
	}
	
	var fullobjectlist = [];
	for(var i in this.querymatrix){
		if(changedobjects !== undefined){
			if(changedobjects.indexOf(i) > -1){
				fullobjectlist.push(i);
			}
		}
		else{
			fullobjectlist.push(i);
		}
	}
	
	sendObjectList(this,fullobjectlist);
}

/*private functions*/
queryToObjectList = function(serversocket,queryid){
	var query = serversocket.queries[queryid];
	if(query!==undefined){
		var objectlist = [];
		for(var i in query.patterns){
			var pattern = query.patterns[i];
			var baseid = i;
			
			/* self */
			if(pattern.self){
				addToList(objectlist,baseid);
			}
			
			/* children */
			if(pattern.children){
				var base = serversocket.storage.get(baseid);
				if(base !== undefined && base.children !== undefined && base.children.length>0){
					for(var j in base.children){
						addToList(objectlist,base.children[j]);
					}
				}
			}
		}
		return objectlist;
	}
	return [];
};

updateQueryMatrix = function(serversocket,queryid,objectlist){
	/*
	 * 1 we remove the queryid from objects in querymatrix which not in the query anymore
	 * 2 we put the queryid to the object in querymatrix where it is missing
	 */
	/*1*/
	for(var i in serversocket.querymatrix){
		if(objectlist.indexOf(i) == -1 ){
			var index = serversocket.querymatrix[i].indexOf(queryid);
			if(index >= 0){
				serversocket.querymatrix[i].splice(index,1);
			}
		}
	}
	/*2*/
	for(var i in objectlist){
		if(serversocket.querymatrix[objectlist[i]] === undefined){
			serversocket.querymatrix[objectlist[i]] = [];
		}
		if(serversocket.querymatrix[objectlist[i]].indexOf(queryid) === -1){
			serversocket.querymatrix[objectlist[i]].push(queryid);
		}
		
	}
};
sendObjectList = function(serversocket,objectlist,queryid){
	var message = {}; message.objects = [];
	for(var i in objectlist){
		var msgelement = {}; 
		msgelement.id = objectlist[i]; 
		msgelement.object = serversocket.storage.get(objectlist[i]);
		if(msgelement.object !== undefined){
			if(queryid === undefined){
				msgelement.querylist = serversocket.querymatrix[objectlist[i]];
			} 
			else{
				msgelement.querylist = [];
				msgelement.querylist.push(queryid);
			}
			message.objects.push(msgelement);
		}
	}
	if(message.objects.length>0){
		sendMessage(serversocket.socket, message);
	}
};
addToList = function(list,elem){
	if(list.indexOf(elem) === -1){
		list.push(elem);
	}
};
sendMessage = function(socket,data){
	socket.emit('updateObjects',data);
};
/*
 * exports
 */
exports.Socket = Socket;
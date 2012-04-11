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
	var clipboard = {};
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
	this.socket.on('updateClipboard', function(msg){
		if(msg.type === 'copy'){
			clipboard = msg.data;
		}
		else{ //paste
            var parentid = msg.data || "root";
            var parent=that.storage.get(parentid);
            for ( var i = 0; i < clipboard.length; i++ ) {
                console.log( "\n\ndeepCopying " + clipboard[i] +"\n\n" );
                var newid = deepCopyObject(msg.data,clipboard[i]);
                parent.children.push(newid);
            }
            var updatemsg = {};
            updatemsg.objects = [];
            var msgitem = {};
            msgitem.id = parentid;
            msgitem.object = parent;
            updatemsg.objects.push(msgitem);
            that.listener.onMessage(updatemsg);
		}
	});
	
	/*private functions*/
	var deepCopyObject = function(parentid,tocopyid){
		var newobj = {};
		var copyobj = that.storage.get(tocopyid);
		if(copyobj!== undefined){
			for(var i in copyobj){
    			newobj[i] = copyobj[i];
			};
            newobj.children=[];
            newobj.parentId=null;
			var copychildren = copyobj.children;
            var date = new Date();
            newobj._id="P_"+copyobj._id+"_";
			newobj._id += date.getFullYear().toString()+date.getMonth().toString()+date.getDate().toString();
			newobj._id += date.getHours().toString()+date.getMinutes().toString()+date.getSeconds().toString()+date.getMilliseconds().toString();
			for(var i in copychildren){
				var childid = deepCopyObject(newobj._id,copychildren[i]);
				if(childid!==undefined){
					newobj.children.push(childid);
				}
			}
            newobj.parentId = parentid;
			var updatemsg = {}; updatemsg.objects = [];
			var msgitem = {}; msgitem.id = newobj._id; msgitem.object = newobj;
			updatemsg.objects.push(msgitem);
			that.listener.onMessage(updatemsg);
			return newobj._id;
		}
		return undefined;
	};
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
		/*if(changedobjects !== undefined){
			if(changedobjects.indexOf(i) > -1){
				fullobjectlist.push(i);
			}
		}
		else{*/
			fullobjectlist.push(i);
		/*}*/
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
   /* var address = socket.handshake.address || undefined;
    if(address!==undefined){
        console.log( "Sending " + data.objects.length + " to client :" + address.address + ":" + address.port + " client id " + socket.id );
    }
    else {*/
        console.log( "Sending " + data.objects.length + " to client : UNKNOWN");
    /*}*/
	socket.emit('updateObjects',data);
};

var QU = require('./serverquery.js');
var ALIB = require('./arraylibrary.js');
SocketEnhanced = function(_socket,_readstorage){
    var _queries = {};
    var _territory = {};
    var _listener = undefined;
    var _clipboard = undefined;

    /*websocket message handlings*/
    _socket.on('updateObjects', function(data){
        if(_listener !== undefined){
            _listener.onMessage(data);
        }
    });
    _socket.on('updateQuery', function(msg){
        if(msg.id !== undefined){
            if(_queries[msg.id] === undefined){
                _queries[msg.id] = new QU.Query(msg.id,_readstorage);
            }
            if(msg.query === undefined){
                msg.query = {}; msg.query.patterns = [];
            }
            var querydelta = _queries[msg.id].updatePatterns(msg.query.patterns);
            /*now we should update the territory wisely*/
            var objectidlist = [];
            var delobjectidlist = [];
            for(var i in querydelta.ilist){
                if(_territory[querydelta.ilist[i]] === undefined){
                    objectidlist.push(querydelta.ilist[i]);
                    _territory[querydelta.ilist[i]] = [querydelta.id];
                }
                else{
                    ALIB.insert(_territory[querydelta.ilist[i]],querydelta.id);
                }
            }
            for(var i in querydelta.dlist){
                if(_territory[querydelta[i]] !== undefined){
                    ALIB.remove(_territory[querydelta.dlist[i]],querydelta.id);
                    if(_territory[querydelta.dlist[i]].length === 0){
                        delete _territory[querydelta.dlist[i]];
                        delobjectidlist.push(querydelta.dlist[i]);
                    }
                }
            }

            var message = {};
            message.querylists = [];
            if(querydelta.ilist.length>0 || querydelta.mlist.length>0 || querydelta.dlist.length>0){
                message.querylists.push(querydelta);
            }
            message.objects = [];
            for(var i in objectidlist){
                var msgobj = {};
                msgobj.object = _readstorage.get(objectidlist[i]);
                if(msgobj.object !== undefined){
                    msgobj.id = objectidlist[i];
                    message.objects.push(msgobj);
                }
            }
            for(var i in delobjectidlist){
                var msgobj = {};
                msgobj.id = delobjectidlist[i];
                msgobj.object = undefined;
                message.objects.push(msgobj);
            }
            if(message.querylists.length > 0){
                _socket.emit('updateObjects',message);
            }
        }


    });
    _socket.on('updateClipboard', function(msg){
        if(msg.type === 'copy'){
            _clipboard = msg.data;
        }
        else{ //paste
            var parentid = msg.data || "root";
            var parent=_readstorage.get(parentid);
            for ( var i = 0; i < _clipboard.length; i++ ) {
                var newid = deepCopyObject(msg.data,_clipboard[i]);
                parent.children.push(newid);
            }
            var updatemsg = {}; updatemsg.objects = [];
            var msgitem = {}; msgitem.id = parentid; msgitem.object = parent;
            updatemsg.objects.push(msgitem);
            _listener.onMessage(updatemsg);
        }
    });
    /*public functions*/
    this.setListener = function(listener){
        _listener = listener;
    };
    this.refresh = function(modifiedobjects){
        var newterritory = {};
        var message = {};
        message.querylists = [];
        for(var i in _territory){
            newterritory[i] = [];
            for(var j in _territory[i]){
                newterritory[i].push(_territory[i][j]);
            }
        }

        var objectidlist = []; /*we have to collect the changed object separately*/
        for(var i in _queries){
            var querydelta = _queries[i].updateObjects(modifiedobjects);
            if(querydelta.ilist.length>0 || querydelta.mlist.length>0 || querydelta.dlist.length>0){
                message.querylists.push(querydelta);
            }
            for(var m in querydelta.mlist){
                ALIB.insert(objectidlist,querydelta.mlist[m]);
            }

            for(var j in querydelta.ilist){
                if(newterritory[querydelta.ilist[j]] === undefined){
                    newterritory[querydelta.ilist[j]] = [];
                }
                ALIB.insert(newterritory[querydelta.ilist[j]],i);
            }

            for(var d in querydelta.dlist){
                ALIB.remove(newterritory[querydelta.dlist[d]],i);
            }
        }

        for(var i in newterritory){
            if(_territory[i] === undefined){
                ALIB.insert(objectidlist,i);
            }
        }

        var delobjectidlist = [];
        for(var i in newterritory){
            if(newterritory[i].length === 0){
                delete newterritory[i];
                ALIB.insert(delobjectidlist,i);
            }
        }

        _territory = newterritory;

        /*now we can build the whole message*/
        /*first the real objects*/
        message.objects = [];
        for(var i in objectidlist){
            var msgobj = {};
            msgobj.object = _readstorage.get(objectidlist[i]);
            if(msgobj.object !== undefined){
                msgobj.id = objectidlist[i];
                message.objects.push(msgobj);
            }
        }
        for(var i in delobjectidlist){
            var msgobj = {};
            msgobj.id = delobjectidlist[i];
            msgobj.object = undefined;
            message.objects.push(msgobj);
        }
        if(message.querylists.length>0){
            _socket.emit('updateObjects',message);
        }
    };

    /*private functions*/
    var deepCopyObject = function(parentid,tocopyid){
        var newobj = {};
        var copyobj = _readstorage.get(tocopyid);
        if(copyobj!== undefined){
            for(var i in copyobj){
                newobj[i] = copyobj[i];
            };
            newobj.children=[];
            newobj.parentId=null;
            var copychildren = copyobj.children;
            var date = new Date();
            newobj._id="P_"+copyobj._id+"_";
            newobj._id += date.getFullYear().toString()+date.getMonth().toString()+date.getDate().toString();
            newobj._id += date.getHours().toString()+date.getMinutes().toString()+date.getSeconds().toString()+date.getMilliseconds().toString();
            for(var i in copychildren){
                var childid = deepCopyObject(newobj._id,copychildren[i]);
                if(childid!==undefined){
                    newobj.children.push(childid);
                }
            }
            newobj.parentId = parentid;
            var updatemsg = {}; updatemsg.objects = [];
            var msgitem = {}; msgitem.id = newobj._id; msgitem.object = newobj;
            updatemsg.objects.push(msgitem);
            _listener.onMessage(updatemsg);
            return newobj._id;
        }
        return undefined;
    };
};

/*
 * exports
 */
exports.Socket = SocketEnhanced;
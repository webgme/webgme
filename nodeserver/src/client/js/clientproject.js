define(['./clientquery.js', './clientstorage.js','./clientsocket.js', '/common/EventDispatcher.js', '/socket.io/socket.io.js' ], function(QU, ST, SO, EventDispatcher){
	var Project = function(projid) {

        $.extend(this, new EventDispatcher());

        this.events = {
            "SELECTEDOBJECT_CHANGED" : "SELECTEDOBJECT_CHANGED"
        };

		this.id = projid;
		this.queries = {};
		this.querycount = 0;
		this.storage = new ST(this);
		this.socket = new SO();
		var self = this;
		/*public functions*/
		this.updateObjects = function(msg){

            /*first we save/delete the objects in storage*/
            for(var i in msg.objects){
                if(msg.objects[i].object === undefined){
                    self.storage.del(msg.objects[i].id);
                }
                else{
                    self.storage.set(msg.objects[i].object);
                }
            }

            /*now we send the update data to the queries*/
            for(var i in msg.querylists){
                if(self.queries[msg.querylists[i].id] === undefined){
                    console.log("ERROR wrong query ID arrived!!! "+i);
                }
                else{
                  self.queries[msg.querylists[i].id].onRefresh(msg.querylists[i]);
                }
            }
		};
		this.copyNode = function(id){
			var cmsg={};cmsg.type='copy';cmsg.data=id;
			self.socket.clipboardUpdate(cmsg);
		}
		this.pasteTo = function(parentid){
			var cmsg = {}; cmsg.tpye='paste'; cmsg.data = parentid;
			self.socket.clipboardUpdate(cmsg);
		}

        var selectedObjectId = null;

        this.setSelectedObjectId = function ( objectId ) {
            if ( objectId !== selectedObjectId ) {
                selectedObjectId = objectId;

                self.dispatchEvent( self.events.SELECTEDOBJECT_CHANGED, selectedObjectId );
            }
        }
	};

	Project.prototype.open = function () {
		this.storage.clear();
		this.socket.setListener({'connect': this.onOpen, 'error': this.onError, 'updateObjects': this.updateObjects});
		this.socket.open();
	};
	
	
	Project.prototype.onOpen = function() {
	};
	
	Project.prototype.close = function () {
	};

	Project.prototype.onError = function(reason){
		console.log("something went wrong because: "+reason);
	};
	/**
 	* Query handling functions
 	*/
	Project.prototype.createQuery = function() {
		var newquery = new QU(this,"q_"+(++this.querycount));
		this.queries[newquery.id] = newquery;
		return newquery;
	};
	Project.prototype.deleteQuery = function(queryid) {
		delete this.queries[queryid];
	};
	Project.prototype.getQueries = function() {
	};
	
	/*storage functions*/
	Project.prototype.getNode = function(nodeid){
		return this.storage.get(nodeid);
	};
	Project.prototype.setNode = function(node){
		if(node !== undefined){
			if(node._id === undefined){
				var date = new Date();
				node._id  = date.getFullYear().toString()+date.getMonth().toString()+date.getDate().toString();
				node._id += date.getHours().toString()+date.getMinutes().toString()+date.getSeconds().toString()+date.getMilliseconds().toString(); 
			}
			var message = {};
			message.objects = [];
			var msgitem = {}; msgitem.id = node._id; msgitem.object = node;
			message.objects.push(msgitem);
			this.storage.set(node);
			this.socket.objectUpdate(message);
			return node._id;
		}
		else{
			return undefined;
		}
	}
	Project.prototype.delNode = function(nodeIds){
        var message = {};
        message.objects = [];
        for ( var i = 0; i < nodeIds.length; i++ ) {
            this.storage.del(nodeIds[i]);
            var msgitem = {}; msgitem.id = nodeIds[i]; msgitem.object = undefined;
            message.objects.push(msgitem);
        }

        this.socket.objectUpdate(message);
	}
	
	/*
	 * Event functions
	 */
	Project.prototype.onQueryChange = function(queryid){
		/*
		 * currently this event shoots only in case of extension of the query
		 * as the client keep all objects and try to keep them up-to-date
		 */
		var querymessage = this.queries[queryid].get();
		if(this.socket !== undefined && querymessage !== undefined){
			this.socket.queryUpdate(querymessage);
		}	
	}

	return Project;
});
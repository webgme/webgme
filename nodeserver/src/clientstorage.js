define(['/socket.io/socket.io.js'], function(){
	var Storage = function(project){
		this.project = project;
		this.socket = undefined;
		this.objects = {};
	};
	Storage.prototype.open = function(){
		this.socket = io.connect();/*TODO: how to send the projectid to the server???*/
		var that = this;
		this.socket.on('connect', this.project.onOpen());
		this.socket.on('error', this.project.onError());
		this.socket.on('msg', function(data){
			var transaction = JSON.parse(data);
			var nodes = {};
			for(var i in transaction.objects){
				var nodeid = transaction.objects[i].id;
				that.objects[nodeid] = transaction.objects[i].object;
				nodes[nodeid] = that.objects[nodeid]; 
			}
			that.project.onStorageChange(nodes);
		});
	};
	
	Storage.prototype.load = function(nodeid){
		if(this.objects[nodeid]){
			var nodes = {}; nodes[nodeid] = this.objects[nodeid];
			this.project.onChangeStorage(nodes);
		}
		else{
			if(this.socket !== undefined){
				var tritem = {}; tritem.type = "get"; tritem.id=nodeid; tritem.object=undefined;
				var transaction = {}; transaction.elements = []; transaction.elements.push(tritem);
				this.socket.emit('msg', JSON.stringify(transaction));
			}
		}
	};
	Storage.prototype.save = function(nodeid, node){
		//this.objects[nodeid] = node;
		if(this.socket !== undefined){
			var tritem = {}; tritem.type = "set"; tritem.id = nodeid; tritem.object = node;
			var transaction = {}; transaction.elements = []; transaction.elements.push(tritem);
			this.socket.emit('msg', JSON.stringify(transaction));
		}
	};
	return Storage;
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
/*
 * --------SOCKET-------
 */
Socket = function(socket){
	this.socket = socket;
	this.listener = undefined; /*this is normally the project but it is only an interface which understands the onMessage function*/
	var that = this;
	this.socket.on('msg', function(data){
		if(that.listener !== undefined){
			that.listener.onMessage(data);
		}
	});
};

Socket.prototype.setListener = function(listener){
	this.listener = listener;
}
Socket.prototype.send = function(data){
	this.socket.emit('msg',data);
};

/*
 * exports
 */
exports.Socket = Socket;
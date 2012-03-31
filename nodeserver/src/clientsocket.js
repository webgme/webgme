/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */

/*
 * --------SOCKET-------
 */
define(['/socket.io/socket.io.js'], function(){
	var Socket = function(){
		var _socket = undefined;
		var _projid = "sample_0";
		var _listener = undefined;
		var _inblock = false;
		var _outblock = false;
		var _inlatency = 0;
		var _outlatency = 0;
		var _outqueue = [];
		var _inqueue = [];
		/*public interface*/
		this.open = function(projectid){
			_projid = projectid;
			_socket = io.connect(projectid);
			_socket.on('updateObjects', function(data){
				receiveMessage('updateObjects',data);
			});
			_socket.on('connect', function(){
				receiveMessage('connect');
			});
			_socket.on('error', function(data){
				receiveMessage('error',data);
			});
		};
		this.setListener = function(listener){
			_listener = listener;
		};
		this.configUpdate = function(newconf){
			if(newconf.outlatency !== undefined){
				_outlatency = newconf.outlatency
			}
			if(newconf.inlatency !== undefined){
				_inlatency = newconf.inlatency
			}
			if(newconf.outblock !== undefined){
				if(_outblock){
					if(!newconf.outblock){
						_outblock=false;
						while(_outqueue.length>0){
							sendMessage(_outqueue[0].type,_outqueue[0].msg);
							_outqueue.shift();
						}
					}
				}
				else{
					_outblock = newconf.outblock;
				}
			}
			if(newconf.inblock !== undefined){
				if(_inblock){
					if(!newconf.inblock){
						_inblock=false;
						while(_inqueue.length>0){
							receiveMessage(_inqueue[0].type,_inqueue[0].msg);
							_inqueue.shift();
						}
					}
				}
				else{
					_inblock = newconf.inblock;
				}
			}
		};
		/*message sending functions*/
		this.queryUpdate = function(qmsg){
			sendMessage('updateQuery',qmsg);
		};
		this.objectUpdate = function(omsg){
			sendMessage('updateObjects',omsg);			
		};
		/*private functions*/
		var sendMessage = function(msgtype,message){
			if(_outblock){
				_outqueue.push({type:msgtype,msg:message});
			}
			else if(_outlatency>0){
				setTimeout(function(){
					_socket.emit(msgtype,message);
				},_outlatency);
			}
			else{
				_socket.emit(msgtype, message);
			}						
		};
		var receiveMessage = function(msgtype,message){
			if(_inblock){
				_inqueue.push({type:msgtype,msg:message});
			}
			else if(_inlatency>0){
				setTimeout(function(){
					updateEvent(msgtype,message);
				},_outlatency);
			}
			else{
				updateEvent(msgtype,message);
			}									
		};
		var updateEvent = function(msgtype,message){
			if(_listener !== undefined && _listener[msgtype] !== undefined){
				_listener[msgtype](message);
			}
		};
	};
	return Socket;
});
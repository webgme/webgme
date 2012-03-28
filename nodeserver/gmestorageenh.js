/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
define([ "./lib/sha1.js", "/socket.io/socket.io.js" ], function () {
	"use strict";


	// ----------------- project -----------------
	var Project = function () {
		this.rcount = 0;
	};
	Project.prototype.open = function (connection) {
		this.socket  = io.connect(connection);
		var that = this;
		this.socket.on('connected', function(){
			that.onopen();
		});
		this.socket.on('close', function(){
			that.onerror();
		});
	};

	Project.prototype.close = function () {
		this.onclose();
	};

	Project.prototype.createRequest = function () {
		return new Request(this);
	};

	Project.prototype.onopen = function () {
		alert("onopen");
	};

	Project.prototype.onclose = function () {
		alert("onclose");
	};

	Project.prototype.onerror = function () {
		alert("onerror");
	};

	// ----------------- Request -----------------

	var Request = function (project) {

		this.project = project;
		this.sid = project.rcount++;
		this.completed = false;
		this.objects = {};
		this.pathes = {};
		this.root = undefined;
		this.commits = [];
	};

	Request.prototype.ondone = function () {
		if(!this.completed){
			this.completed = true;
			console.log("ondone: " + JSON.stringify(this.objects));
		}
	};

	Request.prototype.onerror = function () {
		console.log("onerror: " + JSON.stringify(this.objects));
	};
	
	
	Request.prototype.saveObject = function (object) {
		var str = JSON.stringify(object);
		var hash = SHA1(str);

		if(this.objects[hash]===undefined){
			//only if the hash is not in the request already
			if(this.pathes[object.path]===undefined){
				//totally new element
				this.objects[hash] = object;
				this.pathes[object.path] = hash;
			}
			else{
				//we should replace the old one
				this.objects[hash] = object;
				delete this.objects[this.pathes[object.path]];
				this.pathes[object.path] = hash;
			}
			//we should put the save commits at the time of send
		}
		return hash;
	};

	Request.prototype.loadObject = function (hash) {

		if(this.objects[hash]===undefined){
			this.objects[hash] = undefined;
			var commit = {}; commit.hash = hash; commit.object = undefined;
			this.commits.push(commit);
		}
	};
	Request.prototype.saveRoot = function (hash) {

		this.root = hash;
		var commit = {}; commit.hash = "root"; commit.object = hash;
		this.commits.push(commit);
	};

	Request.prototype.loadRoot = function () {
		var commit = {}; commit.hash = "root"; commit.object = undefined;
		this.commits.push(commit);
	};
	
	Request.prototype.send = function () {
		var socket = this.project.socket;
		socket.request = this;
		socket.on('msg', function(data){
			if(data.length>0){
				var response = JSON.parse(data);
				var askedobjects = response.commits;
				
				for(var i in askedobjects){
					if(askedobjects[i].hash==="root"){
						this.request.root = askedobjects[i].hash;
					}
					else{
						this.request.objects[askedobjects[i].hash] =  JSON.parse(askedobjects[i].object);
					}
				}
			}
			this.request.ondone();			
		});
		/* now we fill the save request to the end of the commits*/
		for(var i in this.objects){
			if(this.objects[i]!=undefined){
				var commit={};commit.hash = i ; commit.object = JSON.stringify(this.objects[i]);
				this.commits.push(commit);
			}
		}
		var message = {}; message.sequence = this.sid; message.commits = this.commits;
		socket.emit('msg',JSON.stringify(this.commits));
	};

	
	// ----------------- Interface -----------------

	return {
		createProject: function () {
			return new Project();
		}
	};
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 * 
 * This version will handle plain websockets
 */
define([ "./lib/sha1.js"  ], function () {
	"use strict";


	// ----------------- project -----------------
	var Project = function () {
	};
	Project.prototype.open = function (connection) {
		this.socket  = new WebSocket("ws://localhost:8081/ws");
		var that = this;
		this.socket.onopen = function(){
			that.onopen();
		};
		this.socket.onclose = function(){
			that.onerror();
		}
	};

	Project.prototype.close = function () {
		this.socket.close();
		this.onclose();
	};

	Project.prototype.createRequest = function () {
		return new Request(this);
	};

	Project.prototype.onopen = function () {
		console.log("onopen");
	};

	Project.prototype.onclose = function () {
		console.log("onclose");
	};

	Project.prototype.onerror = function () {
		console.log("onerror");
	};

	// ----------------- Request -----------------

	var Request = function (project) {

		this.project = project;
		this.objects = {};
		this.root = undefined;
		this.commits = [];
	};

	Request.prototype.ondone = function () {
		console.log("ondone: " + JSON.stringify(this.objects));
	};

	Request.prototype.onerror = function () {
		console.log("onerror: " + JSON.stringify(this.objects));
	};
	
	
	Request.prototype.saveObject = function (object) {
		var str = JSON.stringify(object);
		var hash = SHA1(str);

		if(this.objects[hash]===undefined){
			//only if the hash is not in the request already
			this.objects[hash] = object;
			var commit = {}; commit.hash = hash; commit.object = str;
			this.commits.push(commit);
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
		socket.onmessage = function(msg){
			if(msg.data.length>0){
				var askedobjects = JSON.parse(msg.data);
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
		};
		socket.send(JSON.stringify(this.commits));
	};

	
	// ----------------- Interface -----------------

	return {
		createProject: function () {
			return new Project();
		}
	};
});

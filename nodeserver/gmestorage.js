/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
define([ "./lib/sha1_2.js", "/socket.io/socket.io.js" ], function () {
	"use strict";


	// ----------------- project -----------------

	/**
	 * The project class is responsible for loading and saving
	 * plain JSON-able objects from and into a database. It does
	 * not do any caching or interpreting the content of the
	 * objects, other than those specified in territories. 
	 */
	var Project = function () {
	};

	/**
	 * Opens this project with the specified connection string, then calls the
	 * onopen or onerror event.
	 * 
	 * This implementation expects the 'ws*' as connection string
	 * as it uses websocket connection towards the database
	 * 
	 * @param connection the connection string
	 */
	Project.prototype.open = function (connection) {
		this.socket  = io.connect(connection);
		var that = this;
		this.socket.on('msg', function(data){
			alert(data);
		});		
		this.socket.on('close', function(){
			that.onerror();
		});
	};

	/**
	 * Closes the project and calls the onclose event when done.
	 * 
	 * It will close the websocket connection gracefully...
	 */
	Project.prototype.close = function () {
		this.socket.close();
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
	/*
	 * This class can have three different implementations
	 * based on the type of the database behind
	 * it collects the changes and loading needs of the user
	 * and by sending it it will fill up the objects
	 * array of the request.
	 */
	
	/**
	 * You can use multiple request classes simultaneously
	 * over the same database object. There is no guarantee 
	 * on the order of servicing requests. 
	 */
	var Request = function (project) {

		this.project = project;
		this.objects = {};
		this.root = undefined;
		this.commits = [];
		
	};

	/**
	 * Calculates the hash of the specified object and schedules to save it in
	 * the database. If an object with the same content (hash) is already in
	 * memory, then that object is returned.
	 * 
	 * @param object the object to be saved
	 * @returns an object with the same content plus the invisible hash property
	 */
	Request.prototype.saveObject = function (object) {
		
		// TODO: JSON.stringify does not guarantee any ordering, we need to do this manually
		var str = JSON.stringify(object);
		var hash = SHA1(str);

		/*
		 * in this implementation we make a commit object form the input
		 * and save it to objects as well as the server will not reflect it to us
		 */
		if(this.objects[hash]===undefined){
			//only if the hash is not in the request already
			this.objects[hash] = object;
			var commit = {}; commit.hash = hash; commit.object = str;
			this.commits.push(commit);
		}
		return hash;
	};

	/**
	 * Loads the object with the specified hash from the database
	 * and stores it in the objects set of this request.
	 * 
	 * @param hash the hash of the object to be loaded
	 */
	Request.prototype.loadObject = function (hash) {

		if(this.objects[hash]===undefined){
			//if we already have it, there is nothing to do
			this.objects[hash] = undefined;
			var commit = {}; commit.hash = hash; commit.object = undefined;
			this.commits.push(commit);
		}
	};

	/**
	 * Sets the new root object in the database to the specified hash
	 *
	 * @param hash the hash of the new root object
	 */
	Request.prototype.saveRoot = function (hash) {

		this.root = hash;
		//in the commits we have the special hash = root where the object is the hash of the root
		var commit = {}; commit.hash = "root"; commit.object = hash;
		this.commits.push(commit);
	};

	/**
	 * Loads the has of the root object from the database and
	 * stores it in toe root property of this request.
	 */
	Request.prototype.loadRoot = function () {
		var commit = {}; commit.hash = "root"; commit.object = undefined;
		this.commits.push(commit);
	};
	
	/**
	 * This implementation done the whole communication
	 * with the server at this very place.
	 * It sends out the commits, waits for the answer,
	 * fills the objects array and call the ondone funciton
	 * or the onerror if something went wrong... 
	 */
	Request.prototype.send = function () {
		var socket = this.project.socket;
		var that = this;
		socket.on('msg', function(data){
			if(data.length>0){
				var askedobjects = JSON.parse(data);
				for(var i in askedobjects){
					if(askedobjects[i].hash==="root"){
						that.root = askedobjects[i].object;
					}
					else{
						that.objects[askedobjects[i].hash] = JSON.parse(askedobjects[i].object);
					}
				}
			}
			that.ondone();			
		});
		socket.emit('msg',JSON.stringify(that.commits));
	};

	Request.prototype.ondone = function () {
		console.log("ondone: " + JSON.stringify(this.objects));
	};

	Request.prototype.onerror = function () {
		console.log("onerror: " + JSON.stringify(this.objects));
	};
	
	// ----------------- Interface -----------------

	return {
		createProject: function () {
			return new Project();
		}
	};
});

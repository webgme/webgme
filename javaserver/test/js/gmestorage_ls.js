/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */

define([ "../js/gmeassert", "../js/lib/sha1" ], function (ASSERT) {
	"use strict";


	// ----------------- project -----------------

	/**
	 * The project class is responsible for loading and saving
	 * plain JSON-able objects from and into a database. It does
	 * not do any caching or interpreting the content of the
	 * objects, other than those specified in territories. 
	 */
	var Project = function () {
		this.root = undefined;
	};

	/**
	 * Opens this project with the specified connection string, then calls the
	 * onopen or onerror event.
	 * 
	 * This implementation expects the 'localStorage' as connection string
	 * as it uses that HTML5 to function as a database
	 * 
	 * @param connection the connection string
	 */
	Project.prototype.open = function (connection) {
		ASSERT(connection === "localStorage");
		var success = true;
		try{
			if('localStorage' in window && window['localStorage']!==null){
			}
			else{
				success = false;
			}
		}
		catch(e){
			success = false;
		}
		
		if(success){
			/*we try to set the root during open*/
			this.root = localStorage.getItem("root");
			this.onopen();
		}
		else{
			this.onerror();
		}
	};

	/**
	 * Closes the project and calls the onclose event when done.
	 * 
	 * This kind of storage implementation doesn't need anything 
	 * to do during close.
	 */
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
		ASSERT(project instanceof Project);

		this.project = project;
		this.objects = {};
		this.root = undefined;
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
		ASSERT(object.hash === undefined);
		
		// TODO: JSON.stringify does not guarantee any ordering, we need to do this manually
		var str = JSON.stringify(object);
		var hash = SHA1(str);

		// check if we have it already
		var o = localStorage.getItem(hash);
		if( o !== null ) {
			this.objects[hash] = o;
			return hash;
		}
		else{
			localStorage.setItem(hash,str);
			this.objects[hash] = object;
		}
		/*adding the hash to the return value*/
		//object.hash = hash;
		return hash;
	};

	/**
	 * Loads the object with the specified hash from the database
	 * and stores it in the objects set of this request.
	 * 
	 * @param hash the hash of the object to be loaded
	 */
	Request.prototype.loadObject = function (hash) {
		ASSERT(hash.length === 40);

		var obj = localStorage.getItem(hash);

		// unknown objects will be undefined
		this.objects[hash] = JSON.parse(obj);
	};

	/**
	 * Sets the new root object in the database to the specified hash
	 *
	 * @param hash the hash of the new root object
	 */
	Request.prototype.saveRoot = function (hash) {
		ASSERT(hash.length === 40);

		this.root = hash;
		localStorage.setItem("root",hash);
	};

	/**
	 * Loads the has of the root object from the database and
	 * stores it in toe root property of this request.
	 */
	Request.prototype.loadRoot = function () {
		this.root = localStorage.getItem("root");
		
		/*
		 * in this local storage implementaiton we should
		 * load the root object itself into the objects
		 */
		this.loadObject(this.root);
	};
	
	/**
	 * This local storage implementation updates
	 * the local storage on every load and save
	 * which means the 'save' method has nothing
	 * to do. Maybe some kind of check should be
	 * done whether all things functioned well. 
	 */
	Request.prototype.send = function () {
		console.log("sending");
		this.ondone();
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

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "src/gmeassert", "lib/sha1" ], function (ASSERT) {
	"use strict";

	var CLOSED = "closed";
	var OPENED = "opened";
	var BUSY = "busy";
	var STRING = "string";
	var READY = "ready";
	var SENDING = "sending";
	
	// ----------------- project -----------------

	var Project = function () {
		this.storage = {};
		this.state = CLOSED;
	};

	/**
	 * Opens this project with the specified connection string, then calls the
	 * callback function with an argument that is the hash of the root object.
	 * If the operation did not succeed, then the callback function is called
	 * with false instead.
	 * 
	 * @param connection the connection string
	 * @param callback a function with a boolean argument
	 */
	Project.prototype.open = function (connection, callback) {
		ASSERT(this.state === CLOSED);
		ASSERT(connection === "sample");

		this.state = OPENED;

		var request = new Request(this);
		var a = request.saveObject({
			name: "a"
		});
		var b = request.saveObject({
			name: "b"
		});
		var c = request.saveObject({
			name: "c",
			children: {
				x: a.hash,
				y: b.hash,
				z: b.hash
			}
		});
		
		var that = this;
		request.onload = function () {
			that.onopen(c.hash);
		};
		
		request.send();
	};

	/**
	 * Closes the project and calls the onclose event when done.
	 */
	Project.prototype.close = function () {
		ASSERT(this.state === OPENED);

		// clear all objects
		this.storage = {};
		this.state = BUSY;
		var that = this;

		// add some artificial delay
		window.setTimeout(function () {
			that.state = CLOSED;
			that.onclose();
		}, 100);
	};

	Project.prototype.onopen = function (root) {
		console.log("onopen: " + JSON.stringify(root));
	};
	
	Project.prototype.onclose = function () {
		console.log("onclose");
	};

	Project.prototype.onerror = function () {
		console.log("onerror");
	};
	
	// ----------------- Request -----------------

	var Request = function (project) {
		ASSERT(project instanceof Project);

		this.state = READY;
		this.project = project;
		this.objects = {};
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
		ASSERT(this.state === READY);

		var storage = this.project.storage;
		var str = JSON.stringify(object);
		var hash = SHA1(str);

		// check if we have it already
		var o = storage[hash];
		if( o !== undefined ) {
			ASSERT(o.hash === hash);
			this.objects[hash] = o;
			return o;
		}

		// make an invisible hash property
		Object.defineProperty(object, "hash", {
			value: hash,
			writable: false,
			configurable: false,
			enumerable: true
		// enumerable: false
		});

		storage[hash] = object;
		this.objects[hash] = object;
		return object;
	};

	/**
	 * Loads the object with the specified hash from the database
	 * and stores it in the objects set of this request.
	 * 
	 * @param hash the hash of the object to be loaded
	 */
	Request.prototype.loadObject = function (hash) {
		ASSERT(typeof hash === STRING);
		ASSERT(hash.length === 40);
		ASSERT(this.state === READY);
		
		var obj = this.project.storage[hash];
		if( obj !== undefined ) {
			this.objects[hash] = obj;
		}
	};

	/**
	 * Sends the request to the server and waits for the
	 * completion, which will be a call either to the
	 * onload or onerror event. The requested objects are
	 * stored in the object property of the request. 
	 */
	Request.prototype.send = function () {
		ASSERT(this.state === READY);

		this.state = SENDING; 
		var that = this;
		
		// add some artificial delay
		window.setTimeout(function () {
			that.state = READY;
			that.onload();
		}, 100);
	};

	Request.prototype.onload = function () {
		console.log("onload: " + JSON.stringify(this.objects));
	};

	Request.prototype.onerror = function () {
		console.log("onerror: " + JSON.stringify(this.objects));
	};
	
	// ----------------- Interface -----------------

	return {
		createProject: function () {
			return new Project();
		},
		createRequest: function (project) {
			return new Request(project);
		}
	};
});

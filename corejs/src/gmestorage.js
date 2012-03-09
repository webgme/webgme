/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "../lib/sha1" ], function (ASSERT) {
	"use strict";

	var CLOSED = "closed";
	var OPENED = "opened";
	var BUSY = "busy";
	var STRING = "string";
	var READY = "ready";
	var SENDING = "sending";

	// ----------------- project -----------------

	/**
	 * The project class is responsible for loading and saving
	 * plain JSON-able objects from and into a database. It does
	 * not do any caching or interpreting the content of the
	 * objects, other than those specified in territories. 
	 */
	var Project = function () {
		this.storage = {};
		this.root = undefined;
		this.state = CLOSED;
	};

	/**
	 * Opens this project with the specified connection string, then calls the
	 * onopen or onerror event.
	 * 
	 * @param connection the connection string
	 */
	Project.prototype.open = function (connection) {
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
		request.saveRoot(c.hash);

		var that = this;
		request.ondone = function () {
			that.onopen();
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

	/**
	 * You can use multiple request classes simultaneously
	 * over the same database object. There is no guarantee 
	 * on the order of servicing requests. 
	 */
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
		
		// TODO: JSON.stringify does not guarantee any ordering, we need to do this manually
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

		// unknown objects will be undefined
		this.objects[hash] = obj;
	};

	/**
	 * Sets the new root object in the database to the specified hash
	 *
	 * @param hash the hash of the new root object
	 */
	Request.prototype.saveRoot = function (hash) {
		ASSERT(typeof hash === STRING);
		ASSERT(hash.length === 40);
		ASSERT(this.state === READY);

		this.root = hash;
		this.project.root = hash;
	};

	/**
	 * Loads the has of the root object from the database and
	 * stores it in toe root property of this request.
	 */
	Request.prototype.loadRoot = function () {
		ASSERT(this.state === READY);

		this.root = this.project.root;
	};
	
	/**
	 * Sends the request to the server and waits for the
	 * completion, which will be a call either to the
	 * ondone or onerror event. The requested objects are
	 * stored in the object property of the request. 
	 */
	Request.prototype.send = function () {
		ASSERT(this.state === READY);

		this.state = SENDING;
		var that = this;

		// add some artificial delay
		window.setTimeout(function () {
			that.state = READY;
			that.ondone();
		}, 100);
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

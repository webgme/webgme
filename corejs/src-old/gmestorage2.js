/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "../lib/sha1" ], function (ASSERT) {
	"use strict";

	var CLOSED = "closed";
	var READY = "ready";
	var BUSY = "busy";

	/**
	 * The project class is responsible for loading and saving plain JSON-able
	 * objects from and into a database. It does not do any caching or
	 * interpreting the content of the objects, other than those specified in
	 * territories.
	 */
	var Project = function () {
		this.root = undefined;
		this.state = CLOSED;

		try {
			this.storage = window.sessionStorage;
		}
		catch(e) {
			console.log("session storage is not available");
			this.storage = {};
		}

		// the set of objects to be saved indexed by their hashes
		this.saving = {};

		// the set of objects to be loaded
		this.loading = [];
	};

	/**
	 * Opens this project with the specified connection string, then calls the
	 * onOpen or onError event.
	 * 
	 * @param connection the connection string
	 */
	Project.prototype.open = function (connection) {
		ASSERT(this.state === CLOSED);
		ASSERT(connection === "sample");

		this.state = READY;

		var a = this.saveObject({
			name: "a"
		});
		var b = this.saveObject({
			name: "b"
		});
		var c = this.saveObject({
			name: "c",
			children: {
				x: a.hash,
				y: b.hash,
				z: b.hash
			}
		});
		var d = this.saveObject({
			name: "d",
			children: {
				u: a.hash,
				v: c.hash,
				w: c.hash
			}
		});
		this.saveRoot(d.hash);

		this.loadObject("0000000000000000000000000000000000000000", this.onOpen);
	};

	/**
	 * Closes the project and calls the onclose event when done.
	 */
	Project.prototype.close = function () {
		ASSERT(this.state === READY);

		this.state = BUSY;
		var that = this;

		// add some artificial delay
		window.setTimeout(function () {
			that.state = CLOSED;
			that.onClose();
		}, 100);
	};

	Project.prototype.onOpen = function () {
		console.log("project opened");
	};

	Project.prototype.onClose = function () {
		console.log("project closed");
	};

	Project.prototype.onError = function () {
		console.log("project error");
	};

	/**
	 * Schedules a request that will execute the accumulated save and load
	 * requests.
	 */
	var request = function (project) {
		if( !project.scheduled ) {
			project.scheduled = true;

			window.setTimeout(function () {
				console.log("sending request");

				// make a backup copy, so subsequent loading is possible
				var saving = project.saving;
				var loading = project.loading;
				project.saving = {};
				project.loading = [];
				delete project.scheduled;

				// save the objects
				for( var hash in project.saving ) {
					project.storage[hash] = saving[hash];
				}

				for( var i = 0; i !== loading.length; ++i ) {
					hash = loading[i][0];
					ASSERT(saving[hash] === undefined);
					var callback = loading[i][1];
					callback(project.storage[hash]);
				}
			}, 100);
		}
	};

	/**
	 * Calculates the hash of the specified object and schedules to save it in
	 * the database. An non-enumerable hash property is defined on the object.
	 * 
	 * @param object the object to be saved
	 * @return the object that was passed in
	 */
	Project.prototype.saveObject = function (object) {
		ASSERT(object.hash === undefined);
		ASSERT(this.state === READY);

		// TODO: JSON.stringify does not guarantee any ordering, we need to do
		// this manually
		var str = JSON.stringify(object);
		var hash = SHA1(str);

		// make sure that we do not try to save the same object twice
		ASSERT(this.saving[hash] === undefined);

		// make an invisible hash property
		Object.defineProperty(object, "hash", {
			value: hash,
			writable: false,
			enumerable: false
		});

		console.log("saving: " + hash);
		this.saving[hash] = str;
		request(this);

		return object;
	};

	/**
	 * Loads the object with the specified hash from the database and stores it
	 * in the objects set of this request.
	 * 
	 * @param hash the hash of the object to be loaded
	 * @param the callback function to be called when the object is available
	 */
	Project.prototype.loadObject = function (hash, callback) {
		ASSERT(this.state === READY);
		ASSERT(typeof hash === "string");
		ASSERT(hash.length === 40);
		ASSERT(callback instanceof Function);

		console.log("loading: " + hash);
		this.loading.push(arguments);
		request(this);
	};

	/**
	 * Sets the new root object in the database to the specified hash
	 * 
	 * @param hash the hash of the new root object
	 */
	Project.prototype.saveRoot = function (hash) {
		ASSERT(typeof hash === "string");
		ASSERT(hash.length === 40);
		ASSERT(this.state === READY);

		console.log("saving root: " + hash);
		this.saving.root = hash;
		request(this);
	};

	/**
	 * Loads the has of the root object from the database and calls the given
	 * callback function when the hash of the root is available.
	 */
	Project.prototype.loadRoot = function (callback) {
		ASSERT(this.state === READY);
		ASSERT(callback instanceof Function);

		console.log("loading root");
		this.loading.push([ "root", callback ]);
		request(this);
	};

	return Project;
});

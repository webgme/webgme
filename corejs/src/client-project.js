/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "query", "/socket.io/socket.io.js" ],
		function(ASSERT, Query) {
			"use strict";

			var Project = function() {
				this.queries = [];
			};

			Project.prototype.open = function() {
				ASSERT(!this.socket);

				var that = this;
				var socket = io.connect();
				that.socket = socket;

				this.socket.on("connect", function() {
					if (that.socket == socket) {
						that.onOpen();
					}
				});

				this.socket.on("error", function() {
					if (that.socket == socket) {
						that.onError("bad connection");
						delete that.socket;
					}
				});

				this.socket.on("connect_failed", function() {
					if (that.socket == socket) {
						that.onError("connect failed");
						delete that.socket;
					}
				});

				this.socket.on("reconnect_failed", function() {
					if (that.socket == socket) {
						that.onError("reconnect failed");
						delete that.socket;
					}
				});
			};

			Project.prototype.close = function() {
				ASSERT(this.socket);

				var socket = this.socket;
				delete this.socket;

				socket.disconnect();
				this.onClose();
			};

			Project.prototype.isOpened = function() {
				return this.socket && this.socket.socket.connected;
			};

			Project.prototype.onOpen = function() {
				console.log("project opened");
			};

			Project.prototype.onError = function(reason) {
				console.log("project error: " + reason);
			};

			Project.prototype.onClose = function() {
				console.log("project closed");
			};

			Project.prototype.createQuery = function() {
				var query = new Query(this);
				this.queries.push(query);
				return query;
			};

			Project.prototype.deleteQuery = function(query) {
				ASSERT(query instanceof Query);
				ASSERT(query.project === this);

				var index = this.queries.indexOf(query);
				ASSERT(index >= 0);

				this.queries.splice(index, 1);
			};

			// TODO: Make merging patterns fast (and correct)
			Project.prototype.onQueryChange = function() {
				if (this.isOpened()) {

					var patterns = {};

					var i = this.queries.length;
					while (--i >= 0) {
						var p = this.queries[i].getPatterns();
						for ( var nodeid in p) {
							patterns[nodeid] = p[nodeid];
						}
					}

					this.socket.emit("setquery", patterns);
				}
			};

			return Project;
		});

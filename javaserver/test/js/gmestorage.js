/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "js/gmeassert", "js/lib/sha1" ], function (ASSERT) {
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
		this.root = undefined;
		this.state = CLOSED;
        this.connection = undefined;
	};

	/**
	 * Opens this project with the specified connection string, then calls the
	 * onopen or onerror event.
	 * 
	 * @param connection the connection string
	 */
	Project.prototype.open = function (connection) {
        ASSERT(connection instanceof Socket);
        this.connection = connection;
        this.connection.connect("ws://kecskes.isis.vanderbilt.edu/ws");
        this.onopen();
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
		ASSERT(project instanceof Project);

		this.state = READY;
		this.project = project;
		this.objects = {};
        this.query = {};
        this.query.type = "NONE";
        this.query.sequence = 0;
        this.query.hashes = [];
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
		//ASSERT(this.state === READY);
        var obj = this.objects[hash];
        if(obj===undefined){
            obj = this.project.storage[hash];
            if(obj===undefined){
               if(this.query.hashes.indexOf(hash)===-1){
                   this.query.hashes.push(hash);
                   this.query.type = "GETOBJECTS";
               }
            }
        }

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
		//ASSERT(this.state === READY);

		//this.root = this.project.root;
        this.hashes = {};
        this.objects = {};
        this.query.type = "GETROOT";
	};
	
	/**
	 * Sends the request to the server and waits for the
	 * completion, which will be a call either to the
	 * ondone or onerror event. The requested objects are
	 * stored in the object property of the request. 
	 */
	Request.prototype.send = function () {
		/*ASSERT(this.state === READY);

		this.state = SENDING;
		var that = this;

		// add some artificial delay
		window.setTimeout(function () {
			that.state = READY;
			that.ondone();
		}, 100);*/
        if(this.query.type==="NONE"){
            alert("you have got everything");
            this.ondone();
        }
        else{
            this.project.connection.socket.send(JSON.stringify(this.query));
        }
	};

	Request.prototype.ondone = function () {
		console.log("ondone: " + JSON.stringify(this.objects));
	};

	Request.prototype.onerror = function () {
		console.log("onerror: " + JSON.stringify(this.objects));
	};

    // ----------------- Socket --------------------
    var Socket = function(){
        this.socket = undefined;
        this.request = undefined;
        this.ongoingsequenceid = 0;
        this.projname = "kaki";
        this.state = CLOSED;
    };
    Socket.prototype.connect = function(whost,pname){
        ASSERT(this.state===CLOSED);
        //this.projname = pname;
        var that = this;
        this.socket = new WebSocket(whost);
        //overriding websocket methods for the project opening message handling function
        this.socket.onmessage = function(mdata){
          var mymessage = JSON.parse(mdata.data);
          if(mymessage.sequence!=that.ongoingsequenceid){
              alert("most ide miert????");
              that.close();
          }
          else{
              that.state = OPENED;
              that.ongoingsequenceid++;
          }
        };
        this.socket.onopen = function(){
          //this.send("{\"type\":\"OPENPROJECT\",\"projectname\":\""+that.projname+"\",\"revision\":\"elso\,\"sequence\":\""+that.ongoingsequenceid+"\"}");
          this.send("{\"type\":\"OPENPROJECT\",\"sequence\":\""+that.ongoingsequenceid+"\"}");
        };
    };
    Socket.prototype.close = function(){
      this.socket.close = function(){
          alert("the socket has been closed unexpectedly");
      }
      this.socket.close();
      this.state=CLOSED;
    };
    Socket.prototype.query = function(myquery){
        //ASSERT(this.state===OPENED);
        this.request = myquery;
        this.ongoingsequenceid++;
        this.request.query.sequence = this.ongoingsequenceid;
        var that = this;
        //we override the needed functions again for case of query handling
        this.socket.onmessage = function(mdata){
            var message = JSON.parse(mdata.data);
            if(that.ongoingsequenceid==message.sequence){
                for(var i in message.objects){
                    //ASSERT(SHA1(message.objects[i])===i) --the SHA1 functions are incompatible!!!
                    that.request.objects[i] = JSON.parse(message.objects[i]);
                    //temporary we have to fill the projects storage as well
                    that.request.project.storage[i] = JSON.parse(message.objects[i]);
                }
                that.request.ondone();
            }
            else{
                alert("got wrong response");
                that.request.onerror();
            }
            that.request=undefined;
        }
    };
	// ----------------- Interface -----------------

	return {
		createProject: function () {
			return new Project();
		},
		createRequest: function (project) {
			return new Request(project);
		},
        createSocket: function() {
          return new Socket();
        }
	};
});

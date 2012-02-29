/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function()
{
	"use strict";

	// ----------------- debugging -----------------

	var ASSERT = function(cond)
	{
		if( !cond )
		{
			var error = new Error("ASSERT failed");
			var message = "ASSERT failed at " + error.stack;

			if( console )
				console.log(message);
			
			throw error;
		}
	};

	// ----------------- event target -----------------

	var eventTarget = Object.create(Object.prototype);
	
	var initEventTarget = function()
	{
		ASSERT( eventTarget.isPrototypeOf(this) );
		
		this.eventListeners = [];
	};
	
	eventTarget.addEventListener = function(callback)
	{
		ASSERT( this.eventListeners.indexOf(callback) < 0 );
		
		this.eventListeners.push(callback);
	};

	eventTarget.removeEventListener = function(callback)
	{
		var index = this.eventListeners.indexOf(callback);
		ASSERT( index >= 0 );
		
		if( index >= 0 )
			this.eventListeners.splice(index, 1);
	};

	eventTarget.dispatchEvent = function(event)
	{
		if( typeof event === "string" )
			event = { type: event };

		ASSERT( typeof event.type === "string" );
		event.target = this;
		
		for(var i = 0; i < this.eventListeners.length; ++i)
			this.eventListeners[i](event);
	};
	
	// ----------------- object constructors -----------------

	var coreObject = Object.create(eventTarget);

	var initCoreObject = function(parent, relid)
	{
		ASSERT( coreObject.isPrototypeOf(this) );
		ASSERT( (parent === null && relid === "") || (coreObject.isPrototypeOf(parent) && relid !== "") );
		
		this.relid = relid;
		this.parent = parent;
		this.children = {};
		this.attributes = {};
		this.subtypes = [];

		if( parent )
			parent.children[relid] = this;
		
		if( Object.getPrototypeOf(this).subtypes )
			Object.getPrototypeOf(this).subtypes.push(this);

		// call base
		initEventTarget.call(this);
	};

	var createCoreObject = function(parent, relid, type)
	{
		ASSERT( type === coreObject || coreObject.isPrototypeOf(type) );

		var that = Object.create(type);
		initCoreObject.call(that, parent, relid);
		
		return that;
	};
	
	// ----------------- object synchronous methods -----------------
	
	coreObject.getType = function()
	{
		var p = Object.getPrototypeOf(this);
		
		return p;
	};
	
	coreObject.getParent = function()
	{
		return this.parent;
	};

	coreObject.getPath = function()
	{
		if( this.parent === null )
			return "/";
		else if( this.parent.parent === null )
			return "/" + this.relid;
		else
			return this.parent.getPath() + "/" + this.relid;
	};
	
	coreObject.getName = function()
	{
		if( this.attributes.name )
			return this.attributes.name;
		
		return "[object at " + this.getPath() + "]";
	};
	
	coreObject.setName = function(name)
	{
		this.attributes.name = name;
	};
	
	coreObject.toString = function()
	{
		return this.getName();
	};
	
	// ----------------- object asynchronous methods -----------------

	coreObject.getChildren = function(callback)
	{
		callback(this, this.children);
	};

	// ----------------- project constructor -----------------

	var CoreProject = function()
	{
		this.root = createCoreObject(null, "", coreObject);
		var metameta = createCoreObject(this.root, "metameta", coreObject);
		createCoreObject(metameta, "object", coreObject);
	};

	// ----------------- project synchronous methods -----------------

	CoreProject.prototype.getRoot = function()
	{
		return this.root;
	};

	// ----------------- project asynchronous methods -----------------

	/**
	 * Looks up an GME object by path. The path must be absolute, that is
	 * it must start with "/". The callback function is called when the
	 * GME object is loaded into memory, and the GME object is passed as
	 * an argument to the callback function. The GME object stays in memory
	 * as long as it has registered events.
	 */
	CoreProject.prototype.getObject = function(path, callback)
	{
		ASSERT(path.charAt(0) == "/");

		var a = path.split("/");
		var o = this.root;
		
		for(var i = 0; i < a.length; ++i)
		{
			if( a[i].length > 0 )
			{
				o = o.children[a[i]];
				if( ! o )
				{
					callback(null);
					return;
				}
			}
		}

		callback(o);
	};
	
	// ----------------- public interface -----------------

	return {
		createProject : function()
		{
			return new CoreProject();
		}
	};
});

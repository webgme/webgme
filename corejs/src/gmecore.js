/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function()
{

	// ----------------- debugging -----------------

	ASSERT = function(cond)
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

	// ----------------- object constructors -----------------
	
	/*
	 * Use the constructor only for objects that have no subtype (metameta objects)
	 */
	CoreObject = function(parent, relid)
	{
		ASSERT( (parent === null && relid === "") || (parent instanceof CoreObject && relid !== "") );
		
		this.parent = parent;
		this.relid = relid;
		this.subtypes = [];
		this.children = {};
		this.attributes = {};
		
		if( parent !== null )
			parent.children[relid] = this;
	};

	CoreObject.prototype.createSubtype = function(type, parent, relid)
	{
	};
	
	// ----------------- object synchronous methods -----------------
	
	CoreObject.prototype.getType = function()
	{
		return this.prototype;
	};
	
	CoreObject.prototype.getParent = function()
	{
		return this.parent;
	};

	CoreObject.prototype.getPath = function()
	{
		if( this.parent === null )
			return "/";
		else if( this.parent.parent === null )
			return "/" + this.relid;
		else
			return this.parent.getPath() + "/" + this.relid;
	};
	
	CoreObject.prototype.getName = function()
	{
		if( this.attributes.name )
			return this.attributes.name;
		
		return "[object at " + this.getPath() + "]";
	};
	
	CoreObject.prototype.setName = function(name)
	{
		this.attributes.name = name;
	};
	
	CoreObject.prototype.toString = function()
	{
		return this.getName();
	};
	
	// ----------------- object asynchronous methods -----------------

	CoreObject.prototype.getChildren = function(callback)
	{
		callback(this, this.children);
	};

	// ----------------- project constructor -----------------

	CoreProject = function()
	{
		this.root = new CoreObject(null, "");
		var metameta = new CoreObject(this.root, "metameta");
		new CoreObject(metameta, "object");
	};

	// ----------------- project synchronous methods -----------------

	CoreProject.prototype.getRoot = function()
	{
		return this.root;
	};

	// ----------------- project asynchronous methods -----------------

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

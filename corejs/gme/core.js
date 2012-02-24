// define a require.js module
define(function()
{

	// ----------------- debugging -----------------

	ASSERT = function(cond)
	{
		if (!cond)
		{
			var message = "ASSERT failed at " + new Error().stack;

			if (console)
				console.log(message);
			
			throw new Error("ASSERT failed");
		}
	};

	// ----------------- object -----------------

	xcoreObject = {
		subtypes : new Array(),
		children : {}
	};

	xcoreObject.createSubtype = function(type, parent, relid)
	{
		ASSERT(coreObject === type || xcoreObject.isPrototypeOf(type));
		ASSERT(coreObject === parent || xcoreObject.isPrototypeOf(parent));
		ASSERT(typeof relid == "string");

		object = Object.create(type);
		object.state = "new";
		object.subtypes = [];
		object.children = {};

		type.subtypes.push(object);

		return object;
	};

	// ----------------- object -----------------
	
	/*
	 * Use the constructor only for objects that have no subtype (metameta)
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
		else if( this.parent.parent == null )
			return "/" + this.relid;
		else
			return this.parent.getPath() + "/" + this.relid;
	};
	
	CoreObject.prototype.getChild = function(relid)
	{
		return this.children[relid];
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
	
	// ----------------- project -----------------

	CoreProject = function()
	{
		this.root = new CoreObject(null, "");
		var metameta = new CoreObject(this.root, "metameta");
		new CoreObject(metameta, "object");
	};

	CoreProject.prototype.getRoot = function()
	{
		return this.root;
	};

	CoreProject.prototype.getObject = function(path)
	{
		// ASSERT(path.charAt(0) == "/");
		
		var a = path.split("/");
		var o = this.root;
		
		for(var i = 0; i < a.length; ++i)
		{
			if( a[i].length > 0 )
			{
				o = o.children[a[i]];
				if( ! o )
					return null;
			}
		}
		
		return o;
	};
	
	// ----------------- interface -----------------

	return {
		createProject : function()
		{
			return new CoreProject();
		},
	};
});

define(['./clientquery.js', './clientstorage.js'], function(QU, ST){
	var Project = function(projid) {
		this.id = projid;
		this.queries = {};
		this.querycount = 0;
		this.storage = new ST(this);
	};

	Project.prototype.open = function () {
		this.storage.open(this.id);
	};
	
	Project.prototype.onOpen = function() {
	};
	
	Project.prototype.close = function () {
	};

	Project.prototype.onError = function(reason){
		console.log("something went wrong because: "+reason);
	};
	/**
 	* Query handling functions
 	*/
	Project.prototype.createQuery = function() {
		var newquery = new QU(this,++this.querycount);
		this.queries[this.querycount] = newquery;
		return newquery;
	};
	Project.prototype.deleteQuery = function(queryid) {
		delete this.queries[queryid];
	};
	Project.prototype.getQueries = function() {
	};
	
	
	/*
	 * Event functions
	 */
	Project.prototype.onQueryChange = function(queryid,nodeid){
		/*
		 * currently this event shoots only in case of extension of the query
		 * as the client keep all objects and try to keep them up-to-date
		 */
		this.storage.load(nodeid);
	}
	Project.prototype.onStorageChange = function(nodes){
		for(var i in this.queries){
			this.queries[i].onRefresh(nodes);
		}
	};
	Project.prototype.onNodeChange = function(nodeid, node){
		this.storage.save(nodeid,node);
	};
	return Project;
});
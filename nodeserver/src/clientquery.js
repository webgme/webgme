define([], function(){
	var Query = function(project,id){
		this.id = id;
		this.project = project;
		this.patterns = {};
		this.nodes = {};
		this.ui = undefined;
	}
	
	Query.prototype.addPattern = function(nodeid,type){
		this.patterns[nodeid] = true;	
		this.project.onQueryChange(this.id,nodeid); /*this will change*/
	};
	Query.prototype.deletePattern = function(nodeid,type){
		delete this.patterns[nodeid];
	};
	Query.prototype.getNode = function(nodeid){
		if(this.patterns[nodeid]){
			return this.nodes[nodeid];
		}
		else{
			return undefined;
		}
	};
	Query.prototype.setNode = function(nodeid, node){
		this.project.onNodeChange(nodeid,node);
	};
	Query.prototype.onRefresh = function(nodes){
		for(var i in nodes){
			if(this.patterns[i]){
				this.nodes[i] = nodes[i];
			}
		}
		if(this.ui !== undefined){
			this.ui.onRefresh();
		}
	};
	
	Query.prototype.addUI = function(ui){
		this.ui = ui;
	};
	return Query;
});

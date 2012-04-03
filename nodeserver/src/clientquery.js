define([], function(){
	var Query = function(project,id){
		this.id = id;
		this.patterns = {};
		
		this.project = project;
		this.ui = undefined;
	}
	
	/*modifications*/
	Query.prototype.addPattern = function(nodeid,type){
		if(nodeid !== undefined){
			this.patterns[nodeid] = type || {self:true};	
			this.project.onQueryChange(this.id);
		} 
	};
	Query.prototype.deletePattern = function(nodeid,type){
		delete this.patterns[nodeid];
		this.project.onQueryChange(this.id);
	};
    Query.prototype.addPatterns = function(patternlist){
        for(var i in patternlist){
            var pattern = patternlist[i];
            if(pattern.nodeid !== undefined){
                this.patterns[pattern.nodeid] = pattern.type || {self:true};
            }
        }
        this.project.onQueryChange(this.id);
    };
    Query.prototype.deletePatterns = function(patternlist){
      for(var i in patternlist){
          var pattern = patternlist[i];
          if(pattern.nodeid !== undefined){
              delete this.patterns[pattern.nodeid];
          }
      }
      this.project.onQueryChange(this.id);
    };

	
	/*helper to send the query to the server*/
	Query.prototype.get = function(){
		var query = {};
		query.id = this.id;
		query.query = {};
		query.query.patterns = this.patterns;
		return query;
	};
	
	/*data from server*/
	Query.prototype.onRefresh = function(updatedata){
		if(this.ui !== undefined){
            var objects = updatedata.ilist.concat(updatedata.mlist,updatedata.dlist);
			this.ui.onRefresh(objects);
		}
	};
	Query.prototype.addUI = function(ui){
		this.ui = ui;
	};
	return Query;
});

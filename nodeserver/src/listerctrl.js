define([], function(){
	var ListerCtrl = function(project,div){
		this.project = project;
		this.div = div;
		this.query = this.project.createQuery();
		this.query.addUI(this);
		this.query.addPattern("root",{self:true, children:true});
	};
	
	ListerCtrl.prototype.appendNode = function(id,node){
		var element = document.createElement('p');
		element.innerText = node.attributes.name;
		element.id = id;
		this.div.appendChild(element);
	};
	ListerCtrl.prototype.draw = function(ids){
		/*
		 * clear out div, and draw all the objects from the root...
		 */
		while(this.div.childNodes[0]!==undefined){
			this.div.removeChild(this.div.childNodes[0]);
		}
		for(var i in ids){
			var newelement = document.createElement('p');
			newelement.id = this.div.id+"/"+i;
			newelement.innerHTML = ids[i];
			this.div.appendChild(newelement);
		}
				
	};
	ListerCtrl.prototype.onRefresh = function(nodes){
		/*
		 * something changed so we can call our draw function
		 */
		this.draw(nodes);
	};
	return ListerCtrl;
});

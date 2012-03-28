define([], function(){
	var ListerCtrl = function(project,div){
		this.project = project;
		this.div = div;
		this.query = this.project.createQuery();
		this.query.addUI(this);
		this.query.addPattern("root","none");
	};
	
	ListerCtrl.prototype.appendNode = function(id,node){
		var element = document.createElement('p');
		element.innerText = node.attributes.name;
		element.id = id;
		this.div.appendChild(element);
	};
	ListerCtrl.prototype.draw = function(){
		/*
		 * clear out div, and draw all the objects from the root...
		 */
		while(this.div.childNodes[0]!==undefined){
			this.div.removeChild(this.div.childNodes[0]);
		}
		
		var node = this.query.getNode("root");
		var i = 0;
		while(node !== undefined){
			this.appendNode(this.div.id+"/"+i,node);
			i++;
			if(node.attributes.children[0] !== undefined){
				node = this.query.getNode(node.attributes.children[0]);
			}
			else{
				node = undefined;
			}
		}
		
	};
	ListerCtrl.prototype.onRefresh = function(){
		/*
		 * something changed so we can call our draw function
		 */
		this.draw();
	};
	return ListerCtrl;
});

define([],function(){
	var ModifyCtrl = function(project,div){
		this.project = project;
		this.div = div;
		this.query = this.project.createQuery();
		this.query.addUI(this);
		this.query.addPattern("root",{self:true});
		
		/*add button*/
		this.addButton = document.createElement('input');
		this.div.appendChild(this.addButton);
		this.addButton.id = this.div.id+"/addButton";
		this.addButton.value = "add children";
		this.addButton.type = "button";
		var that = this;
		this.addButton.onclick = function(){
			var newchild = {};
			var root = that.project.getNode("root");
			newchild = {name:"kolok", children:[], size:"small"};
			var newid = that.project.setNode(newchild);
			root.children.push(newid);
			that.project.setNode(root);
		};
		
		/*remove button*/
	}
	
	ModifyCtrl.prototype.onRefresh = function(){
		/*
		 * we have to do nothing with this info ;)
		 */
	}
	
	return ModifyCtrl;
});

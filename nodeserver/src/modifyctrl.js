define([],function(){
	var ModifyCtrl = function(project,div){
		this.counter = 0;
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
			var root = that.query.getNode("root");
			var newid = ++that.counter+"_object";
			newchild = {_id:newid, attributes:{name:"kolok", children:[], size:"small"}};
			root.attributes.children.push(newid);
			that.query.addPattern(newid);
			that.query.setNode(newid,newchild);
			that.query.setNode("root",root);
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

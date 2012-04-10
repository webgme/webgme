define([], function(){
	var Storage = function(){
		this.objects = {};
	};
	Storage.prototype.get = function(id){
		return this.objects[id];	
	}
	Storage.prototype.set = function(object){
		if(object !== undefined){
			if(object._id !== undefined){
				this.objects[object._id] = object;
			}
		}
	}
	Storage.prototype.del = function(id){
		delete this.objects[id];
	}
	Storage.prototype.clear = function(){
		this.objects = {};
	}
	return Storage;
});

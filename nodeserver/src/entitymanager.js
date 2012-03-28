define([], function(){
	var EntityManager = function(){
		this.storage = {};
	};
	EntityManager.prototype.onChange = function(query,type,ids){
		/*
		 * this function will be called when one of the queries have been changed
		 */
	};
	return EntityManager;
});

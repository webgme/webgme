/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */

/*
 * --------STORAGE-------
 */
Storage = function(){
	this.objects = {};
}

Storage.prototype.set = function(id,object){
	/*
	 * this method should look more like it has many changed objects but not is is easier
	 * to have only one single
	 */
	if(object === undefined){
		delete this.objects[id];
	}
	else{
		this.objects[id] = object;
	}
};
Storage.prototype.get = function(id){
	return this.objects[id]; 
};

MongoStorage = function(){
    var DB = require('mongodb').Db;
    var SERVER = require('mongodb').Server;
    var _db = new DB('mongo_webgme_storage', new SERVER('localhost',27017,{auto_recconcet:true}));

}


/*
 * export setting
 */
exports.Storage = Storage;
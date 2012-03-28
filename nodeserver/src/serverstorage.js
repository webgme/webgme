/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */

/*
 * --------STORAGE-------
 */
Storage = function(){
	this.cvs = {} /*this will contain the revisions, but now it will have only one*/
	this.revision = {} /*this will be a matrix which tells that in case of a given revision where we should found the correct data of an object*/
	this.head = 0;
	this.base = 0; /*this shows the oldest revision we have in memory so if someone request earlier object we give back this one*/
	this.revision[0] = {};
	this.cvs[0] = {};
}

Storage.prototype.set = function(id,object){
	/*
	 * this method should look more like it has many changed objects but not is is easier
	 * to have only one single
	 */
	if(object === undefined){
		delete this.revision[this.head][id];
		delete this.cvs[this.head][id];
	}
	else{
		this.revision[this.head][id] = this.head;
		this.cvs[this.head][id] = object;
	}
};
Storage.prototype.get = function(id,rev){
	/*
	 * this method should give back the object
	 * from the revision given by, without revision
	 * it gives back the latest
	 */
	if(rev === undefined){
		rev = this.head;
	}
	if(rev < this.base){
		rev = this.base;
	}
	
	return this.cvs[this.revision[rev][id]][id]; 
}

Storage.prototype.finalize = function(){
	/*
	 * the function closes the head revision and creates a new empty one
	 */
	return; 
};

/*
 * still more to come. like 
 * compact - clears the memory till a given revision
 * load - cleans the memory and loads a given revision as base from disk
 * save - saves a given revision as a snapshot to the disk -> ??? how to make all revision available on disk or how to convert between memory and disk revisions???
 */

/*
 * export setting
 */
exports.Storage = Storage;
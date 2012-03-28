/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
/*
 * --------LIBRARIAN-------
 */
var PR = require('./serverproject.js');

Librarian = function(){
	this.projects={};
};

Librarian.prototype.open = function(projectid){
	/*
	 * the project id is a string which represents the session and the project or the base and the project
	 * but currently it is just a string ;)
	 */
	if(this.projects[projectid] === undefined){
		var newproj = new PR.Project();
		this.projects[projectid] = newproj;
		return newproj;
	}
	else{
		return this.projects[projectid];
	}
};
Librarian.prototype.close = function(projectid){
	/*
	 * this should close the given session, of course somehow in future we should check 
	 * here as well that only the session master should do this...
	 */
	delete this.projects[projectid];
};

/*
 * exports
 */
exports.Librarian = Librarian;


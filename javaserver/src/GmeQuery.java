/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

public class GmeQuery {
	public enum QueryType{
		GETOBJECTS, /* several hash included into the query and we should respond to it */
		GETROOT, /* there is no other parameter we should return back the root of the project */
		SAVEOBJECTS, /* with this method the client is able to overwrite an object*/
		OPENPROJECT; /*opens a project*/
	}

	public QueryType type=QueryType.GETROOT;
	public String[] hashes=null;
	//public GmeChangeObject[] changed=null;
	public String projectname="";
	public String revision="";
	public String sequence="";
	/*
	public GmeQuery(){
		type=QueryType.GETROOT;
		hashes = new String[0];
		changed = new GmeChangeObject[0];
	}
	public GmeQuery(String json){
		GmeQuery gq = JSON.parseObject(json, GmeQuery.class);
		this.type = gq.type;
		this.hashes = gq.hashes;
		this.changed = gq.changed;
		this.projectname = gq.projectname;
		this.revision = gq.revision;
	}*/
	
}

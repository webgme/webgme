/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.net.UnknownHostException;

import com.mongodb.Mongo;
import com.mongodb.DB;
import com.mongodb.DBCollection;
//import com.mongodb.BasicDBObject;
//import com.mongodb.DBObject;
//import com.mongodb.DBCursor;

public class MongoStorage implements SimpleStorageInterface{
	protected Mongo mongo = null;
	protected DB database = null;
	protected DBCollection objects = null;
	
	public MongoStorage(){
		try{
			mongo = new Mongo("localhost", 27017);
			database = mongo.getDB("webgme_storage");
			objects = database.getCollection("objects");
		}
		catch (UnknownHostException e){
		}
	}
	public void put(String key, String value){
		System.out.println(key);
	}
	public String get(String key){
		return "";
	}
	public String getRoot(){
		return "";
	}
	public void putRoot(String key, String value){
		//root = key;
		put(key, value);
	}
}

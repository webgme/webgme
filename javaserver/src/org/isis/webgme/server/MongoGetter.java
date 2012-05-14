package org.isis.webgme.server;

import com.mongodb.DBCollection;
import com.mongodb.BasicDBObject;
import com.mongodb.DBObject;

public class MongoGetter extends Thread {

	private DBCollection _collection;
	private MongoCallbackInterface _cb;
	private String _id;
	public MongoGetter(DBCollection objects,String id, MongoCallbackInterface cb){
		_collection = objects;
		_cb = cb;
		_id = id;
	}
	public void run(){
		BasicDBObject query = new BasicDBObject("_id", _id);
		DBObject dbobj = _collection.findOne(query);
		_cb.getComplete(0, dbobj.get("object").toString());
	}
}

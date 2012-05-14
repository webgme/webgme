package org.isis.webgme.server;

import com.mongodb.DBCollection;
import com.mongodb.BasicDBObject;

public class MongoSetter extends Thread {

	private DBCollection _collection;
	private MongoCallbackInterface _cb;
	private String _id;
	private String _object;
	
	public MongoSetter(DBCollection objects,String id,String object, MongoCallbackInterface cb){
		_collection = objects;
		_cb = cb;
		_id = id;
		_object = object;
	}
	public void run(){
		BasicDBObject dbobj = new BasicDBObject();
		dbobj.put("_id", _id);
		dbobj.put("object", _object);
		_collection.save(dbobj);
		_cb.setComplete(0);
	}
}

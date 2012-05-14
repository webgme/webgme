package org.isis.webgme.server;

import java.net.UnknownHostException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import com.mongodb.Mongo;
import com.mongodb.MongoOptions;
import com.mongodb.DB;
import com.mongodb.DBCollection;

public class AsyncMongoStorage {

	private Mongo mongo = null;
	private DB database = null;
	private DBCollection objects = null;
	private ThreadPoolExecutor TPE;
	
	public AsyncMongoStorage(){
		try{
			MongoOptions mongoopt = new MongoOptions();
			mongoopt.threadsAllowedToBlockForConnectionMultiplier = 1000000;
			mongo = new Mongo("localhost", mongoopt);
			database = mongo.getDB("mongotest");
			objects = database.getCollection("test");
			TPE = new ThreadPoolExecutor(5,10,50000L,TimeUnit.MILLISECONDS,new LinkedBlockingQueue<Runnable>());
		}
		catch (UnknownHostException e){
		}
	}
	public void put(String key,String object, MongoCallbackInterface cb){
		TPE.execute(new MongoSetter(objects,key,object,cb));
	}
	public void get(String key,MongoCallbackInterface cb){
		TPE.execute(new MongoGetter(objects,key,cb));
	}
}

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.storage;

import org.isis.promise.*;

import java.util.concurrent.*;
import com.mongodb.*;

public class MongoDb implements Storage {

	public static class Options {
		public String host = "localhost";
		public int port = 27017;
		public String database = "test";
		public String collection = "storage";
	};

	private ExecutorService service = new ThreadPoolExecutor(0,
			10, 1, TimeUnit.SECONDS,
			new LinkedBlockingQueue<Runnable>());

	private Options options;
	private DBCollection collection;

	public MongoDb(Options options) {
		assert (options != null);
		this.options = options;
	}

	Func0<Void> openTask = new Func0<Void>() {
		@Override
		public Promise<Void> call() throws Exception {
			Mongo mongo = null;
			try {
				mongo = new Mongo(new ServerAddress(options.host, options.port));
				DBCollection coll = mongo.getDB(options.database)
						.getCollection(options.collection);

				CommandResult result = coll.getDB().getPreviousError();
				result.throwOnError();

				synchronized (MongoDb.this) {
					if (collection != null)
						throw new Exception("already open");

					collection = coll;
				}
			} catch (Exception exception) {
				if (mongo != null)
					mongo.close();

				throw exception;
			}

			return Constant.VOID;
		}
	};

	@Override
	public Promise<Void> open() {
		assert (collection == null);
		return openTask.submit(service);
	}

	@Override
	public synchronized boolean isOpened() {
		return collection != null;
	}

	Func0<Void> closeTask = new Func0<Void>() {
		@Override
		public Promise<Void> call() throws Exception {
			DBCollection coll;

			synchronized (MongoDb.this) {
				coll = collection;
				if (coll == null)
					throw new Exception("already closed");
				else
					collection = null;
			}

			Mongo mongo = coll.getDB().getMongo();
			mongo.close();

			return Constant.VOID;
		}
	};

	@Override
	public Promise<Void> close() {
		assert (collection != null);
		return closeTask.submit(service);
	}

	static final Constant<DBObject> NULL = new Constant<DBObject>(null);

	Func1<DBObject, String> loadTask = new Func1<DBObject, String>() {
		@Override
		public Promise<DBObject> call(String key) throws Exception {
			DBObject result = collection.findOne(key);
			return result == null ? NULL : new Constant<DBObject>(result);
		}
	};

	@Override
	public Promise<DBObject> load(String key) {
		assert (key != null && collection != null);
		return loadTask.submit(service, key);
	}

	Func1<Void, DBObject> saveTask = new Func1<Void, DBObject>() {
		@Override
		public Promise<Void> call(DBObject object) throws Exception {
			collection.save(object);
			return Constant.VOID;
		}
	};

	@Override
	public Promise<Void> save(DBObject object) {
		assert (object != null && collection != null);
		return saveTask.submit(service, object);
	}

	@Override
	public Promise<Void> remove(String key) {
		// TODO Auto-generated method stub
		return null;
	}
}

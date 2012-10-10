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
			Integer.MAX_VALUE, 1, TimeUnit.SECONDS,
			new SynchronousQueue<Runnable>());

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

			return new Constant<Void>(null);
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

			return new Constant<Void>(null);
		}
	};

	@Override
	public Promise<Void> close() {
		assert (collection != null);
		return closeTask.submit(service);
	}

	@Override
	public Promise<Object> load(String key) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public Promise<Void> save(Object object) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public Promise<Void> remove(String key) {
		// TODO Auto-generated method stub
		return null;
	}
}

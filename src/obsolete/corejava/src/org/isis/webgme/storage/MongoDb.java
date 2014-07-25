/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.storage;

import org.isis.promise.*;
import com.mongodb.*;

public class MongoDb implements Storage {

	public static class Options {
		public String host = "localhost";
		public int port = 27017;
		public String database = "test";
		public String collection = "storage";
	};

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
				MongoOptions mongoOptions = new MongoOptions();
				mongoOptions.connectionsPerHost = 5;
				mongoOptions.threadsAllowedToBlockForConnectionMultiplier = 1000;

				mongo = new Mongo(
						new ServerAddress(options.host, options.port),
						mongoOptions);
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
		return openTask.submit(Executors.NEW_THREAD_EXECUTOR);
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
		return closeTask.submit(Executors.NEW_THREAD_EXECUTOR);
	}

	Func2<Object, Encoder<Object>, String> loadTask = new Func2<Object, Encoder<Object>, String>() {
		@Override
		public Promise<Object> call(Encoder<Object> encoder, String key)
				throws Exception {
			DBObject result = collection.findOne(key);

			if (result == null)
				return Constant.NULL;

			return new Constant<Object>(encoder.decodeMongo1(result));
		}
	};

	@Override
	@SuppressWarnings("unchecked")
	public <Type> Promise<Type> load(Encoder<Type> encoder, String key) {
		assert (key != null && encoder != null && collection != null);
		return (Promise<Type>) loadTask.submit(Executors.THREAD_POOL_EXECUTOR,
				(Encoder<Object>) encoder, key);
	}

	Func2<Void, Encoder<Object>, Object> saveTask = new Func2<Void, Encoder<Object>, Object>() {
		@Override
		public Promise<Void> call(Encoder<Object> encoder, Object object)
				throws Exception {

			DBObject document = encoder.encodeMongo1(object);
			collection.save(document);
			return Constant.VOID;
		}
	};

	@Override
	@SuppressWarnings("unchecked")
	public <Type> Promise<Void> save(Encoder<Type> encoder, Type object) {
		assert (object != null && encoder != null && collection != null);
		return saveTask.submit(Executors.THREAD_POOL_EXECUTOR,
				(Encoder<Object>) encoder, object);
	}

	@Override
	public Promise<Void> remove(String key) {
		// TODO Auto-generated method stub
		return null;
	}
}

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.storage;

import org.isis.promise.*;
import com.allanbank.mongodb.*;
import com.allanbank.mongodb.bson.*;
import com.allanbank.mongodb.builder.*;

public class MongoDbAsync implements Storage {

	public static class Options {
		public String host = "localhost";
		public int port = 27017;
		public String database = "test";
		public String collection = "storage";
	};

	private Options options;
	private Mongo mongo;
	private MongoCollection collection;

	public MongoDbAsync(Options options) {
		assert (options != null);
		this.options = options;
	}

	Func0<Void> openTask = new Func0<Void>() {
		@Override
		public Promise<Void> call() throws Exception {
			Mongo myMongo = null;
			try {
				MongoDbConfiguration config = new MongoDbConfiguration();
				config.addServer(options.host + ":" + options.port);
				config.setMaxConnectionCount(50);

				myMongo = MongoFactory.create(config);
				MongoDatabase database = myMongo.getDatabase(options.database);
				MongoCollection myCollection = database
						.getCollection(options.collection);

				synchronized (MongoDbAsync.this) {
					if (mongo != null)
						throw new Exception("already open");

					mongo = myMongo;
					collection = myCollection;
				}
			} catch (Exception exception) {
				if (myMongo != null)
					myMongo.close();

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
			Mongo myMongo;

			synchronized (MongoDbAsync.this) {
				myMongo = mongo;
				if (myMongo == null)
					throw new Exception("already closed");
				else {
					mongo = null;
					collection = null;
				}
			}

			myMongo.close();
			return Constant.VOID;
		}
	};

	@Override
	public Promise<Void> close() {
		assert (collection != null);
		return closeTask.submit(Executors.NEW_THREAD_EXECUTOR);
	}

	static class FutureDocument extends org.isis.promise.Future<Object>
			implements Callback<Document> {
		Encoder<Object> encoder;

		FutureDocument(Encoder<Object> encoder) {
			assert (encoder != null);
			this.encoder = encoder;
		}

		@Override
		protected <Arg> void argumentResolved(int index, Promise<Arg> argument) {
		}

		@Override
		protected void rejectChildren(Exception error) {
		}

		@Override
		public void callback(Document arg0) {
			try {
				Object obj = encoder.decodeMongo2(arg0);
				resolve(new Constant<Object>(obj));
			} catch (Exception exception) {
				reject(exception);
			}
		}

		@Override
		public void exception(Throwable arg0) {
			reject(new Exception(arg0));
		}
	};

	@Override
	@SuppressWarnings("unchecked")
	public <Type> Promise<Type> load(Encoder<Type> encoder, String key) {
		assert (key != null && encoder != null && collection != null);

		FutureDocument callback = new FutureDocument((Encoder<Object>) encoder);
		collection
				.findOneAsync(callback, QueryBuilder.where("_id").equals(key));
		return (Promise<Type>) callback;
	}

	Func2<Void, Encoder<Object>, Object> saveTask = new Func2<Void, Encoder<Object>, Object>() {
		@Override
		public Promise<Void> call(Encoder<Object> encoder, Object object)
				throws Exception {

			Document document = encoder.encodeMongo2(object);
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

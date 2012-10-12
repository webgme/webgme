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
import java.util.concurrent.*;
import org.isis.promise.Executors;

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

	Executor executor;

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

				// executor = new ThreadPoolExecutor(100, 100, 1,
				// TimeUnit.SECONDS, new LinkedBlockingQueue<Runnable>());
				executor = Executors.DIRECT_EXECUTOR;
				// executor = Executors.NEW_THREAD_EXECUTOR;

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
			Executor myExecutor;

			synchronized (MongoDbAsync.this) {
				myMongo = mongo;
				myExecutor = executor;
				if (myMongo == null)
					throw new Exception("already closed");
				else {
					mongo = null;
					collection = null;
					executor = null;
				}
			}

			if (myExecutor instanceof ExecutorService)
				((ExecutorService) myExecutor).shutdown();

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
		@Override
		protected <Arg> void argumentResolved(short index, Promise<Arg> argument) {
		}

		@Override
		protected void rejectChildren(Exception error) {
		}

		@Override
		public void callback(Document arg0) {
			resolve(new Constant<Object>(arg0));
		}

		@Override
		public void exception(Throwable arg0) {
			reject(new Exception(arg0));
		}
	};

	Func1<Object, String> loadTask = new Func1<Object, String>() {
		@Override
		public Promise<Object> call(String key) throws Exception {
			java.util.concurrent.Future<Document> future = collection
					.findOneAsync(QueryBuilder.where("_id").equals(key));

			Document result = future.get();
			return new Constant<Object>(result);
		}
	};

	// @Override
	public Promise<Object> load2(String key) {
		assert (key != null && collection != null && executor != null);
		return loadTask.submit(executor, key);
	}

	@Override
	public Promise<Object> load(String key) {
		assert (key != null && collection != null && executor != null);

		FutureDocument callback = new FutureDocument();
		collection
				.findOneAsync(callback, QueryBuilder.where("_id").equals(key));
		return callback;
	}

	Func1<Void, Object> saveTask = new Func1<Void, Object>() {
		@Override
		public Promise<Void> call(Object object) throws Exception {
			Document document = (Document) object;
			collection.save(document);
			return Constant.VOID;
		}
	};

	@Override
	public Promise<Void> save(Object object) {
		assert (object != null && collection != null && executor != null);
		return saveTask.submit(executor, object);
	}

	@Override
	public Promise<Void> remove(String key) {
		// TODO Auto-generated method stub
		return null;
	}
}

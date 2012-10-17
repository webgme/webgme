/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.test;

import org.isis.promise.*;
import org.isis.webgme.storage.*;
import com.allanbank.mongodb.bson.Document;
import com.allanbank.mongodb.bson.builder.BuilderFactory;
import com.allanbank.mongodb.bson.element.*;
import com.mongodb.*;

public class TestMongo {

	public static final class Test {
		public String id;
		public int value;

		public Test(String id, int value) {
			this.id = id;
			this.value = value;
		}

		public static final Encoder<Test> ENCODER = new Encoder<Test>() {
			public Test decodeMongo1(DBObject document) throws Exception {
				String id = (String) document.get("_id");
				Integer value = (Integer) document.get("value");
				return new TestMongo.Test(id, value);
			}

			@Override
			public DBObject encodeMongo1(Test object) throws Exception {
				BasicDBObject document = new BasicDBObject();
				document.put("_id", object.id);
				document.put("value", object.value);
				return document;
			}

			@Override
			public Test decodeMongo2(Document document) throws Exception {
				String id = document.get(StringElement.class, "_id").getValue();
				Integer value = document.get(IntegerElement.class, "value")
						.getIntValue();

				return new Test(id, value);
			}

			@Override
			public Document encodeMongo2(Test object) throws Exception {
				Document document = BuilderFactory.start()
						.add("_id", object.id).add("value", object.value)
						.build();
				return document;
			}
		};
	};

	static final Func2<Void, Test, Integer> TEST = new Func2<Void, Test, Integer>() {
		@Override
		public Promise<Void> call(Test arg0, Integer arg1) throws Exception {
			if (arg0.value != arg1.intValue())
				throw new Exception("does not match");

			return Constant.VOID;
		}
	};

	public static void main(String[] args) throws Exception {

		final int COUNT = 50000;
		long time;

		time = System.currentTimeMillis();
		MongoDbAsync.Options options = new MongoDbAsync.Options();
		// MongoDb.Options options = new MongoDb.Options();
		// options.host = "129.59.105.195";
		options.host = "localhost";
		options.collection = "garbage";
		Storage storage = new MongoDbAsync(options);
		// Storage storage = new MongoDb(options);

		Executors.obtain(storage.open());
		time = System.currentTimeMillis() - time;
		System.out.println("opened " + time);

		time = System.currentTimeMillis();
		FutureArray<Void> results = new FutureArray<Void>(Void.class);
		for (int i = 0; i < COUNT; ++i) {
			Test test = new Test("*obj" + i, i);
			results.add(storage.save(Test.ENCODER, test));
		}
		Executors.obtain(results.seal());
		time = System.currentTimeMillis() - time;
		System.out.println("saved " + time);

		time = System.currentTimeMillis();
		results = new FutureArray<Void>(Void.class);
		for (int i = 0; i < COUNT; ++i) {
			Promise<Test> obj = storage.load(Test.ENCODER, "*obj" + i);
			results.add(TEST.call(obj, i));
		}
		Executors.obtain(results.seal());
		time = System.currentTimeMillis() - time;
		System.out.println("loaded " + time);

		time = System.currentTimeMillis();
		Executors.obtain(storage.close());
		time = System.currentTimeMillis() - time;
		System.out.println("closed " + time);
	}
}

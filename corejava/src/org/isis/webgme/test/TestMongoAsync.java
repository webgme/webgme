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
import com.allanbank.mongodb.bson.element.IntegerElement;

public class TestMongoAsync {

	static final Func2<Void, Object, Integer> TEST = new Func2<Void, Object, Integer>() {
		@Override
		public Promise<Void> call(Object arg0, Integer arg1) throws Exception {
			Integer val = ((Document) arg0).get(IntegerElement.class, "value")
					.getIntValue();

			if (val.intValue() != arg1.intValue())
				throw new Exception("does not match");

			return Constant.VOID;
		}
	};

	public static void main(String[] args) throws Exception {

		final int COUNT = 100000;
		long time;

		time = System.currentTimeMillis();
		MongoDbAsync.Options options = new MongoDbAsync.Options();
//		options.host = "129.59.105.195";
		options.host = "localhost";
		options.collection = "garbage";
		MongoDbAsync mongo = new MongoDbAsync(options);

		Executors.obtain(mongo.open());
		time = System.currentTimeMillis() - time;
		System.out.println("opened " + time);

		time = System.currentTimeMillis();
		FutureArray<Void> results = new FutureArray<Void>(Void.class);
		for (int i = 0; i < COUNT; ++i) {
			Document document = BuilderFactory.start().add("_id", "*obj" + i)
					.add("value", i).build();
			results.add(mongo.save(document));
		}
		Executors.obtain(results.seal());
		time = System.currentTimeMillis() - time;
		System.out.println("saved " + time);

		time = System.currentTimeMillis();
		results = new FutureArray<Void>(Void.class);
		for (int i = 0; i < COUNT; ++i) {
			Promise<Object> obj = mongo.load("*obj" + i);
			results.add(TEST.call(obj, i));
		}
		Executors.obtain(results.seal());
		time = System.currentTimeMillis() - time;
		System.out.println("loaded " + time);

		time = System.currentTimeMillis();
		Executors.obtain(mongo.close());
		time = System.currentTimeMillis() - time;
		System.out.println("closed " + time);
	}
}

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public class TestRaces {

	static void printLine(int indent, String value) {
		while (--indent >= 0)
			System.out.print("    ");

		System.out.println(value);
	}

	static abstract class TestFunc extends Func2<Integer, Integer, Integer> {
		public abstract void print(int indent);

		public abstract int getTrueValue(int arg1, int arg2);
	};

	static class SumFunc extends TestFunc {
		Builder2 builder;

		SumFunc(Builder2 builder) {
			assert (builder != null);

			this.builder = builder;
		}

		public Promise<Integer> call(Integer arg0, Integer arg1)
				throws Exception {

			return builder.create(arg0, arg1);
		}

		public void print(int indent) {
			builder.print(indent);
		}

		public int getTrueValue(int arg1, int arg2) {
			return builder.getTrueValue(arg1, arg2);
		}
	}

	static TestFunc createFunc(int depth) {
		return new SumFunc(createBuilder2(depth));
	}

	interface Builder {
		void print(int indent);
	}

	interface Builder0 extends Builder {
		Promise<Integer> create() throws Exception;

		int getTrueValue();
	};

	static class ConstLeaf implements Builder0 {
		private int value;

		public ConstLeaf() {
			value = (int) (Math.random() * 10);
		}

		public Promise<Integer> create() {
			return new Constant<Integer>(value);
		}

		public void print(int indent) {
			printLine(indent, "name: const");
			printLine(indent, "value: " + value);
		}

		public int getTrueValue() {
			return value;
		}
	}

	static class DelayedInt extends Future<Integer> implements Runnable {
		long delay;
		int value;

		public DelayedInt(long delay, int value) {
			this.delay = delay;
			this.value = value;

			Thread thread = new Thread(this);
			thread.start();
		}

		@Override
		public void run() {
			try {
				Thread.sleep(delay);
				resolve(new Constant<Integer>(value));
			} catch (Exception error) {
				reject(error);
			} catch (Error error) {
				error.printStackTrace();
				System.exit(-1);
			}
		}

		@Override
		protected <Arg> void argumentResolved(short index, Promise<Arg> argument) {
			assert (false);
		}

		@Override
		protected void rejectChildren(Exception error) {
		}
	}

	static class ThreadLeaf implements Builder0 {
		private int value;
		private long delay;

		public ThreadLeaf() {
			value = (int) (Math.random() * 10);
			delay = (int) (Math.random() * 10);
		}

		public Promise<Integer> create() {
			return new DelayedInt(delay, value);
		}

		public void print(int indent) {
			printLine(indent, "name: thread");
			printLine(indent, "value: " + value);
			printLine(indent, "delay: " + delay);
		}

		public int getTrueValue() {
			return value;
		}
	}

	static class Divide00 implements Builder0 {
		Builder0 left;
		Builder0 right;
		TestFunc func;

		public Promise<Integer> create() throws Exception {
			return func.call(left.create(), right.create());
		}

		public void print(int indent) {
			printLine(indent, "name: divide00,");
			printLine(indent, "left: {");
			left.print(indent + 1);
			printLine(indent, "}, right: {");
			right.print(indent + 1);
			printLine(indent, "}, func: {");
			func.print(indent + 1);
			printLine(indent, "}");
		}

		public int getTrueValue() {
			return func.getTrueValue(left.getTrueValue(), right.getTrueValue());
		}
	}

	static Builder0 createBuilder0(int depth) {
		assert (depth >= 0);

		double r = Math.random();

		if (depth <= 0) {
			if (r < 0.5)
				return new ConstLeaf();
			else
				return new ThreadLeaf();
		} else {
			--depth;

			if (r < 0.1)
				return new ConstLeaf();
			else if (r < 0.2)
				return new ThreadLeaf();
			else {
				Divide00 d = new Divide00();
				d.left = createBuilder0(depth);
				d.right = createBuilder0(depth);
				d.func = createFunc(depth);
				return d;
			}
		}
	}

	interface Builder1 extends Builder {
		Promise<Integer> create(Integer a) throws Exception;

		int getTrueValue(int arg);
	};

	static class Identity implements Builder1 {
		public Promise<Integer> create(Integer arg) {
			return new Constant<Integer>(arg);
		}

		public void print(int indent) {
			printLine(indent, "name: id");
		}

		public int getTrueValue(int arg) {
			return arg;
		}
	}

	static class Divide01 implements Builder1 {
		Builder0 left;
		Builder1 right;
		TestFunc func;

		public Promise<Integer> create(Integer arg) throws Exception {
			return func.call(left.create(), right.create(arg));
		}

		public void print(int indent) {
			printLine(indent, "name: divide01,");
			printLine(indent, "left: {");
			left.print(indent + 1);
			printLine(indent, "}, right: {");
			right.print(indent + 1);
			printLine(indent, "}, func: {");
			func.print(indent + 1);
			printLine(indent, "}");
		}

		public int getTrueValue(int a) {
			return func
					.getTrueValue(left.getTrueValue(), right.getTrueValue(a));
		}
	}

	static class Divide10 implements Builder1 {
		Builder1 left;
		Builder0 right;
		TestFunc func;

		public Promise<Integer> create(Integer arg) throws Exception {
			return func.call(left.create(arg), right.create());
		}

		public void print(int indent) {
			printLine(indent, "name: divide10,");
			printLine(indent, "left: {");
			left.print(indent + 1);
			printLine(indent, "}, right: {");
			right.print(indent + 1);
			printLine(indent, "}, func: {");
			func.print(indent + 1);
			printLine(indent, "}");
		}

		public int getTrueValue(int a) {
			return func
					.getTrueValue(left.getTrueValue(a), right.getTrueValue());
		}
	}

	static Builder1 createBuilder1(int depth) {
		assert (depth >= 0);

		if (depth <= 0)
			return new Identity();
		else {
			--depth;

			double r = Math.random();
			if (r < 0.2)
				return new Identity();
			else if (r < 0.6) {
				Divide01 d = new Divide01();
				d.left = createBuilder0(depth);
				d.right = createBuilder1(depth);
				d.func = createFunc(depth);
				return d;
			} else {
				Divide10 d = new Divide10();
				d.left = createBuilder1(depth);
				d.right = createBuilder0(depth);
				d.func = createFunc(depth);
				return d;
			}
		}
	}

	interface Builder2 extends Builder {
		Promise<Integer> create(Integer a, Integer b) throws Exception;

		int getTrueValue(int a, int b);
	};

	static class BinarySum implements Builder2 {
		public Promise<Integer> create(Integer arg0, Integer arg1)
				throws Exception {
			return new Constant<Integer>(arg0 + arg1);
		}

		public void print(int indent) {
			printLine(indent, "name: sum");
		}

		public int getTrueValue(int a, int b) {
			return a + b;
		}
	}

	static class Divide02 implements Builder2 {
		Builder0 left;
		Builder2 right;
		TestFunc func;

		public Promise<Integer> create(Integer arg0, Integer arg1)
				throws Exception {
			return func.call(left.create(), right.create(arg0, arg1));
		}

		public void print(int indent) {
			printLine(indent, "name: divide02,");
			printLine(indent, "left: {");
			left.print(indent + 1);
			printLine(indent, "}, right: {");
			right.print(indent + 1);
			printLine(indent, "}, func: {");
			func.print(indent + 1);
			printLine(indent, "}");
		}

		public int getTrueValue(int a, int b) {
			return func.getTrueValue(left.getTrueValue(),
					right.getTrueValue(a, b));
		}
	}

	static class Divide11 implements Builder2 {
		Builder1 left;
		Builder1 right;
		TestFunc func;

		public Promise<Integer> create(Integer arg0, Integer arg1)
				throws Exception {
			return func.call(left.create(arg0), right.create(arg1));
		}

		public void print(int indent) {
			printLine(indent, "name: divide11,");
			printLine(indent, "left: {");
			left.print(indent + 1);
			printLine(indent, "}, right: {");
			right.print(indent + 1);
			printLine(indent, "}, func: {");
			func.print(indent + 1);
			printLine(indent, "}");
		}

		public int getTrueValue(int a, int b) {
			return func.getTrueValue(left.getTrueValue(a),
					right.getTrueValue(b));
		}
	}

	static class Divide20 implements Builder2 {
		Builder2 left;
		Builder0 right;
		TestFunc func;

		public Promise<Integer> create(Integer arg0, Integer arg1)
				throws Exception {
			return func.call(left.create(arg0, arg1), right.create());
		}

		public void print(int indent) {
			printLine(indent, "name: divide20,");
			printLine(indent, "left: {");
			left.print(indent + 1);
			printLine(indent, "}, right: {");
			right.print(indent + 1);
			printLine(indent, "}, func: {");
			func.print(indent + 1);
			printLine(indent, "}");
		}

		public int getTrueValue(int a, int b) {
			return func.getTrueValue(left.getTrueValue(a, b),
					right.getTrueValue());
		}
	}

	static Builder2 createBuilder2(int depth) {
		assert (depth >= 0);

		if (depth <= 0)
			return new BinarySum();
		else {
			--depth;

			double r = Math.random();
			if (r < 0.25)
				return new BinarySum();
			else if (r < 0.5) {
				Divide02 d = new Divide02();
				d.left = createBuilder0(depth);
				d.right = createBuilder2(depth);
				d.func = createFunc(depth);
				return d;
			} else if (r < 0.5) {
				Divide11 d = new Divide11();
				d.left = createBuilder1(depth);
				d.right = createBuilder1(depth);
				d.func = createFunc(depth);
				return d;
			} else {
				Divide20 d = new Divide20();
				d.left = createBuilder2(depth);
				d.right = createBuilder0(depth);
				d.func = createFunc(depth);
				return d;
			}
		}
	}

	static void singleTest(int depth) throws Exception {
		final Builder0 builder = createBuilder0(depth);
		int value = builder.getTrueValue();

		class TestThread extends Thread {
			Integer value = null;
			Exception error = null;

			public void run() {
				try {
					Promise<Integer> promise = builder.create();
					this.value = Executor.obtain(promise);
				} catch (Exception error) {
					this.error = error;
				} catch (Error error) {
					error.printStackTrace();
					System.exit(-1);
				}
			}
		}
		;

		TestThread test = new TestThread();

		test.start();
		test.join(10000);

		if (test.error != null)
			throw (test.error);

		if (test.value == null) {
			test.interrupt();
			throw (new Exception("timeout"));
		}

		if (value != test.value.intValue())
			throw (new Exception("incorrect value"));
	}

	public static void main(String[] args) throws Exception {
		System.out.print("start");

		for (int i = 0; i < Integer.MAX_VALUE; ++i) {
			if (i % 50 == 0)
				System.out.print("\n" + i + "\t");

			singleTest(5);
			System.out.print(".");
		}

		System.out.print("\nend\n");
	}
}

package org.isis.speedtests;

import java.util.concurrent.atomic.*;

public class AtomicTest {

	interface Test {
		void increment();

		int get();
	}

	static class Test0 implements Test {
		int counter = 0;

		public void increment() {
			++counter;
		}

		public int get() {
			return counter;
		}
	};

	static class Test1 implements Test {
		AtomicInteger counter = new AtomicInteger();

		public void increment() {
			counter.incrementAndGet();
		}

		public int get() {
			return counter.get();
		}
	};

	static class Test2 implements Test {
		int counter = 0;

		public synchronized void increment() {
			++counter;
		}

		public synchronized int get() {
			return counter;
		}
	};

	static class Test3 implements Test {
		volatile int counter = 0;

		static AtomicIntegerFieldUpdater<Test3> updater = AtomicIntegerFieldUpdater
				.newUpdater(Test3.class, "counter");

		public void increment() {
			updater.incrementAndGet(this);
		}

		public int get() {
			return updater.get(this);
		}
	};

	static class Worker extends Thread {
		Test test;

		Worker(Test test) {
			this.test = test;
		}

		public void run() {
			for (int i = 0; i < 5000000; ++i)
				test.increment();
		}
	}

	static void execute(Test test) throws Exception {
		long time = System.currentTimeMillis();

		Thread threads[] = new Thread[20];

		for (int i = 0; i < threads.length; ++i)
			threads[i] = new Worker(test);

		for (int i = 0; i < threads.length; ++i)
			threads[i].start();

		for (int i = 0; i < threads.length; ++i)
			threads[i].join();

		time = System.currentTimeMillis() - time;
		System.out.println("time " + time + " counter " + test.get());
	}

	public static void main(String[] args) throws Exception {
		execute(new Test0());
		execute(new Test1());
		execute(new Test2());
		execute(new Test3());
	}
}

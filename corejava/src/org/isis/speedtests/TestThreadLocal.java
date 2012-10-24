package org.isis.speedtests;

public class TestThreadLocal {

	static final int COUNT = 100000000;
	static int result;

	static int test1() {
		Thread thread = Thread.currentThread();

		if (thread instanceof Thread1)
			return ((Thread1) thread).get();

		throw new IllegalStateException();
	}

	static class Thread1 extends Thread {

		private int value = 0;

		int get() {
			return ++value;
		}

		public void run() {
			result = 0;
			for (int i = 0; i < COUNT; ++i)
				result += test1();
		}
	}

	static class Object2 {
		private int value = 0;

		int get() {
			return ++value;
		}
	}

	static final ThreadLocal<Object2> object2 = new ThreadLocal<Object2>() {
		@Override
		protected Object2 initialValue() {
			return new Object2();
		}
	};

	static class Thread2 extends Thread {

		public void run() {
			result = 0;
			for (int i = 0; i < COUNT; ++i)
				result += test2();
		}
	}

	static int test2() {
		return object2.get().get();
	}

	static long measure(Thread thread) throws Exception {
		long time = System.currentTimeMillis();
		thread.start();
		thread.join();
		return System.currentTimeMillis() - time;
	}

	public static void main(String[] args) throws Exception {
		for (int i = 0; i < 20; ++i) {
			long t1 = measure(new Thread1());
			int r1 = result;
			long t2 = measure(new Thread2());
			int r2 = result;
			System.out.println("" + t1 + " (" + r1 + ")\t" + t2 + " (" + r2
					+ ")");
		}
	}
}

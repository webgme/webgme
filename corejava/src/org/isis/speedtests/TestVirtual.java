package org.isis.speedtests;

public class TestVirtual {

	static abstract class Container {
		public abstract int get();

		public abstract void inc(int a);
	}

	static Container a = new Container() {
		int c = 0;

		public int get() {
			return c;
		}

		public void inc(int a) {
			c += a;
		}
	};
	
	static final Container b = new Container() {
		int c = 0;

		public int get() {
			return c;
		}

		public void inc(int a) {
			c += a;
		}
	};
	
	static final class MyContainer extends Container {
		int c = 0;

		public int get() {
			return c;
		}

		public void inc(int a) {
			c += a;
		}
	}

	static final MyContainer c = new MyContainer();

	static int test_c;
	
	static public void test_inc(int a) {
		test_c += a;
	}
	
	static public int test_get() {
		return test_c;
	}
	
	private static final int COUNT = 1000000000;
	
	public static void test(Container test) {
		long time = System.currentTimeMillis();
		for(int i = 0; i < COUNT; ++i)
			test.inc(i);
		time = System.currentTimeMillis() - time;
		System.out.println("time " + time + " value " + test.get());
	}

	public static void test2(MyContainer test) {
		long time = System.currentTimeMillis();
		for(int i = 0; i < COUNT; ++i)
			test.inc(i);
		time = System.currentTimeMillis() - time;
		System.out.println("time " + time + " value " + test.get());
	}

	public static void test3() {
		long time = System.currentTimeMillis();
		for(int i = 0; i < COUNT; ++i)
			test_inc(i);
		time = System.currentTimeMillis() - time;
		System.out.println("time " + time + " value " + test_get());
	}

	public static void main(String[] args) {
		for(int i = 0; i < 4; ++i) {
			test(a);
			test(b);
//			test(c);
			test2(c);
			test3();
			System.out.println();
		}
	}
}

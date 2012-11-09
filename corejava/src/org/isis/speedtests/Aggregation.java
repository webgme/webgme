package org.isis.speedtests;

public class Aggregation {

	private static final int COUNT = 1000000000;
	
	public static abstract class Base implements Runnable {
		abstract void increment(int i);
		
		public void run() {
			for(int i = 0; i < COUNT; ++i)
				increment(i);
		}
	}

	public static class Derived extends Base {
		public int counter = 0;
		void increment(int i) {
			counter += i;
		}
	}

	public interface Increaser {
		void increment(int i);
	}
	
	public static class Base2  implements Runnable {
		private final Increaser increaser;
		
		public Base2(Increaser increaser) {
			this.increaser = increaser;
		}

		final void increment(int i) {
			increaser.increment(i);
		}
		
		public void run() {
			for(int i = 0; i < COUNT; ++i)
				increment(i);
		}
	}

	public static class Derived2 implements Runnable, Increaser {
		private final Base2 base;
		
		public Derived2() {
			this.base = new Base2(this);
		}
		
		public int counter = 0;
		public void increment(int i) {
			counter += i;
		}

		public void run() {
			base.run();
		}
	}
	
	public static void test(Runnable test) {
		long time = System.currentTimeMillis();
		test.run();
		time = System.currentTimeMillis() - time;
		System.out.println("time " + time);
	}

	public static void main(String[] args) {
		test(new Derived());
		test(new Derived2());
		test(new Derived());
		test(new Derived2());
	}
}

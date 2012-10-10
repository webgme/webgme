package org.isis.speedtests;

public final class LockTest {

	static final int ITERATIONS = 10000;

	static final class Counter {
		int value;
	};

	static Counter[] counters = new Counter[1000];

	static long[] best_times = new long[10];

	static void measure(int index, Thread[] threads) {
		long time = System.currentTimeMillis();

		for (Thread thread : threads) {
			thread.start();
		}

		try {
			for (Thread thread : threads) {
				thread.join();
			}
		} catch (InterruptedException e) {
			System.out.println(e);
		}

		time = System.currentTimeMillis() - time;
		if (best_times[index] > time) {
			best_times[index] = time;
		}
	}

	public static void main(String[] args) {

		for(int i = 0; i < counters.length; ++i) {
			counters[i] = new Counter();
		}
		
		for (int i = 0; i < best_times.length; ++i)
			best_times[i] = Long.MAX_VALUE;

		for (int i = 0; i < 10; ++i) {

			measure(0, new Thread[] { new Thread() {
				public void run() {
					for (int i = 0; i < ITERATIONS; ++i)
						for(int j = 0; j < counters.length; ++j)
							++counters[j].value;
				}
			} });
			
			measure(1, new Thread[] { new Thread() {
				public void run() {
					for (int i = 0; i < ITERATIONS; ++i) {
						for(int j = 0; j < counters.length; ++j)
							synchronized(counters[j]) {
								++counters[j].value;
							}
					}
				}
			} });
			
			measure(2, new Thread[] { new Thread() {
				public void run() {
					for (int i = 0; i < ITERATIONS; ++i) {
						for(int j = 0; j < counters.length; ++j)
							if( counters[j] == counters[0] || counters[j] == counters[1]) {
								synchronized(counters[j]) {
									++counters[j].value;
								}
							}
							else
								++counters[j].value;
					}
				}
			} });
		}

		for (int i = 0; i < best_times.length; ++i) {
			if (best_times[i] != Long.MAX_VALUE) {
				System.out.println("test " + i + " time " + best_times[i]);
			}
		}
	}
}

package org.isis.xpromise;

import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicReferenceFieldUpdater;

public class TestSpeed {
	
	static Integer counter = new Integer(0);
	
	static class First extends AtomicReference<Integer> {
		private static final long serialVersionUID = 6565543021425696361L;

		public First() {
			super(counter);
		}
		
		public void increment() {
			Integer newCounter = new Integer(counter+1);
			if( compareAndSet(counter, newCounter) ) {
				counter = newCounter;
			}
		}
		
		public int getValue() {
			Integer value = super.get();
			return value.intValue();
		}
	};
	
	static interface Second {
		public void increment();
		public int getValue();
	};
	
	static class SecondImpl extends AtomicReference<Integer> implements Second {
		private static final long serialVersionUID = 6565543021425696361L;

		public SecondImpl() {
			super(counter);
		}
		
		public void increment() {
			Integer newCounter = new Integer(counter+1);
			if( compareAndSet(counter, newCounter) ) {
				counter = newCounter;
			}
		}
		
		public int getValue() {
			Integer value = super.get();
			return value.intValue();
		}
	};
	
	static class Third {

		Integer my;
		
		public Third() {
			this.my = counter;
		}
		
		public synchronized void increment() {
			Integer newCounter = new Integer(counter+1);
			if( my == counter ) {
				my = newCounter;
				counter = newCounter;
			}
		}
		
		public synchronized int getValue() {
			return my.intValue();
		}
	};
	
	static class Fourth {

		volatile Integer my;
		
		private static final AtomicReferenceFieldUpdater<Fourth, Integer> myUpdater = 
				AtomicReferenceFieldUpdater.newUpdater(Fourth.class, Integer.class, "my");
		
		public Fourth() {
			this.my = counter;
		}
		
		public synchronized void increment() {
			Integer newCounter = new Integer(counter+1);
			if( myUpdater.compareAndSet(this, counter, newCounter) ) {
				counter = newCounter;
			}
		}
		
		public synchronized int getValue() {
			Integer value = myUpdater.get(this);
			return value.intValue();
		}
	};
	
	public static void main(String[] args) {
		// First test = new First();
		Second test = new SecondImpl();
		// Third test = new Third();
		// Fourth test = new Fourth();
		
		long time = System.currentTimeMillis();
		for(int i = 0; i < 100000000; ++i) {
			test.increment();
		}
		time = System.currentTimeMillis() - time;
		System.out.println("Reached " + test.getValue() + " in " + time + " ms");
	}
}

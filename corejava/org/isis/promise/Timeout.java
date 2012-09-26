/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.*;
import java.util.concurrent.atomic.*;

public class Timeout extends TimerTask implements Promise<Void> {

	AtomicInteger waiters = new AtomicInteger(0);
	private static Timer timer = null;

	private Observer<Void> parent;

	public Timeout(long delay) {

		if (waiters.incrementAndGet() == 1) {
			assert (timer == null);
			timer = new Timer();
		}

		timer.schedule(this, delay);
	}

	public void setParent(Observer<Void> parent) {
		assert (parent != null);
		this.parent = parent;
	}

	public void finished() {
	}

	public void cancelPromise() {
		this.cancel();
	}

	public void run() {
		parent.finished();
	}

	public Void getValue() throws Exception {
		return null;
	}
}

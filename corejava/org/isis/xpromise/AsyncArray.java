/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise;

import java.util.*;

public final class AsyncArray<Type> extends Promise<ArrayList<Type>> {

	private Observer parent;
	private ArrayList<Promise<Type>> promises = new ArrayList<Promise<Type>>();
	private int missing = 1;
	private ArrayList<Type> value;
	private Throwable error;

	public void add(Promise<Type> value) {
		assert(value != null);

		boolean added = false;

		synchronized(this) {
			if( promises != null ) {
				promises.add(value);

				assert(missing >= 1);
				missing += 1;
				
				added = true;
			}
		}
		
		if( added ) {
			value.register(this);
		}
		else {
			value.cancel();
		}
	}
	
	public void cancel() {
		ArrayList<Promise<Type>> list;

		synchronized(this) {
			list = promises;
			promises = null;
		}

		if( list != null ) {
			for(Promise<Type> promise : list) {
				promise.cancel();
			}
		}
	}

	void broken(Throwable err) {
		assert(err != null);
		
		ArrayList<Promise<Type>> list;
		Observer par = null;
		
		synchronized(this) {
			list = promises;
			promises = null;
			if( error == null ) {
				error = err;
				par = parent;
			}
		}
		
		if( list != null ) {
			for(Promise<Type> promise : list) {
				promise.cancel();
			}
		}
		
		if( par != null ) {
			par.broken(err);
		}
	}
	
	private void report() {
		ArrayList<Promise<Type>> list;

		synchronized(this) {
			assert(parent != null);

			list = promises;
			promises = null;
		}
		
		if( list )
	}
	
	void register(Observer parent) {
		assert(parent != null);

		synchronized(this) {
			assert(this.parent == null);
			this.parent = parent;
			
			assert(missing >= 1 || missing == -1);
		}
		
	}

	void fulfilled() {
		int m = -1;

		synchronized(this) {
			assert(missing != 0);
			
			if( missing >= 1 ) {
				m = --missing;
			}
		}
	}

	ArrayList<Type> getValue() {
		return value;
	}
}

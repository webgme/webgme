/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public abstract class Future<Type> implements Promise<Type>, Runnable {
	static final short STATE_EMPTY = 0; // null
	static final short STATE_FORWARDING = 1; // Future<Type>
	static final short STATE_RESOLVED = 2; // Promise<Type>
	static final short STATE_ARGUMENT = 3; // Future<?>
	static final short STATE_REJECTED = 4; // Exception

	protected short state = STATE_EMPTY;
	private short index;
	private Object object;

	public void debug1(String where, String extra) {
		try {
			Thread.sleep(2);
		}
		catch(Exception e) {
		}
/*
		System.out.println(where + " this=" + System.identityHashCode(this)
				+ " state=" + state + " " + extra);
*/
	}
	
	protected Future() {
		debug1("constructor", "");
	}

	@Override
	@SuppressWarnings("unchecked")
	public final Constant<Type> getConstant() {
		debug1("getConstant", "");

		Object object = this.object;
		if (object instanceof Constant<?>)
			return (Constant<Type>) object;
		else
			return null;
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestForwarding(Future<Type> parent) {
		debug1("requestForwarding", "parent=" + System.identityHashCode(parent));
		assert (parent != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			oldState = state;
			oldObject = object;

			if (oldState <= STATE_FORWARDING) {
				state = STATE_FORWARDING;
				object = parent;
			}
		}

		if (oldState == STATE_RESOLVED)
			parent.resolve((Promise<Type>) oldObject);
		else if (oldState == STATE_REJECTED)
			parent.reject((Exception) oldObject);
		else
			assert (oldState != STATE_ARGUMENT);
		
		debug1("requestForwarding end", "oldState=" + oldState + " oldObject=" + System.identityHashCode(oldObject));
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestArgument(short index, Future<?> parent) {
		debug1("requestArgument", "index=" + index + " parent=" + System.identityHashCode(parent));
		assert (parent != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			oldState = state;
			oldObject = object;

			if (oldState <= STATE_ARGUMENT) {
				state = STATE_ARGUMENT;
				object = parent;
				this.index = index;
			}
		}

		if (oldState == STATE_RESOLVED)
			parent.argumentResolved(index, (Promise<Type>) oldObject);
		else if (oldState == STATE_REJECTED)
			parent.reject((Exception) oldObject);

		debug1("requestArgument end", "oldState=" + oldState + " oldObject=" + System.identityHashCode(oldObject));
	}

	protected abstract <Arg> void argumentResolved(short index,
			Promise<Arg> argument);

	@SuppressWarnings("unchecked")
	protected final void resolve(Promise<Type> promise) {
		debug1("resolve", "promise=" + System.identityHashCode(promise));
		assert (promise != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			oldState = state;
			oldObject = object;

			if (oldState <= STATE_RESOLVED) {
				state = STATE_RESOLVED;
				object = promise;
			}
		}

		if (oldState == STATE_ARGUMENT)
			((Future<?>) oldObject).argumentResolved(index, promise);
		else if (oldState == STATE_FORWARDING)
			((Future<Type>) oldObject).resolve(promise);
		else if (oldState <= STATE_RESOLVED)
			promise.requestForwarding(this);

		debug1("resolve end", "oldState=" + oldState + " oldObject=" + System.identityHashCode(oldObject));
	}

	@Override
	public final void reject(Exception error) {
		debug1("reject", "error=" + System.identityHashCode(error));
		assert (error != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			oldState = state;
			oldObject = object;

			if (oldState < STATE_REJECTED) {
				state = STATE_REJECTED;
				object = error;
			}
		}

		if (oldState < STATE_REJECTED)
			rejectChildren(error);

		if (oldState == STATE_ARGUMENT || oldState == STATE_FORWARDING)
			((Future<?>) oldObject).reject(error);

		debug1("reject end", "oldState=" + oldState + " oldObject=" + System.identityHashCode(oldObject));
	}

	protected abstract void rejectChildren(Exception error);
}

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

// TODO: remove the special handling of exceptions
// TODO: futures should be resolved only once, even when collecting

public abstract class Future<Type> implements Promise<Type>, Runnable {
	static final short STATE_EMPTY = 0; // null
	static final short STATE_COLLECT = 1; // Promise<Type>
	static final short STATE_FORWARD = 2; // Future<Type>
	static final short STATE_ARGUMENT = 3; // Future<?>
	static final short STATE_RESOLVED = 4; // Promise<Type>
	static final short STATE_REJECTED = 5; // Exception

	protected short state = STATE_EMPTY;
	private short index;
	private Object object;

	public void debug1(String where) {
		try {
			Thread.sleep(1);
		} catch (Exception e) {
		}

		// System.out.println(where + " this=" + System.identityHashCode(this)
		// + " state=" + state);
	}

	protected Future() {
		debug1("constructor");
	}

	@Override
	@SuppressWarnings("unchecked")
	public final Constant<Type> getConstant() {
		debug1("getConstant");

		Object object = this.object;
		if (object instanceof Constant<?>)
			return (Constant<Type>) object;
		else
			return null;
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestForwarding(Future<Type> parent) {
		debug1("requestForwarding start");
		assert (parent != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug1("requestForwarding sync");

			oldState = state;
			oldObject = object;

			if (oldState == STATE_EMPTY) {
				state = STATE_FORWARD;
				object = parent;
			} else if (oldState == STATE_COLLECT)
				state = STATE_RESOLVED;
		}

		if (oldState == STATE_COLLECT)
			parent.resolve((Promise<Type>) oldObject);
		else if (oldState == STATE_REJECTED)
			parent.reject((Exception) oldObject);
		else
			assert (oldState == STATE_EMPTY);

		debug1("requestForwarding end");
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestArgument(short index, Future<?> parent) {
		debug1("requestArgument start");
		assert (parent != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug1("requestArgument sync");

			oldState = state;
			oldObject = object;

			if (oldState == STATE_EMPTY) {
				state = STATE_ARGUMENT;
				object = parent;
				this.index = index;
			} else if (oldState == STATE_COLLECT)
				state = STATE_RESOLVED;
		}

		if (oldState == STATE_COLLECT || oldState == STATE_RESOLVED)
			parent.argumentResolved(index, (Promise<Type>) oldObject);
		else if (oldState == STATE_REJECTED)
			parent.reject((Exception) oldObject);
		else
			assert (oldState == STATE_EMPTY);

		debug1("requestArgument end");
	}

	protected abstract <Arg> void argumentResolved(short index,
			Promise<Arg> argument);

	@SuppressWarnings("unchecked")
	protected final void resolve(Promise<Type> promise) {
		debug1("resolve start");
		assert (promise != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug1("resolve sync");

			oldState = state;
			oldObject = object;

			if (oldState == STATE_EMPTY || oldState == STATE_COLLECT) {
				state = STATE_COLLECT;
				object = promise;
			} else if (oldState == STATE_FORWARD || oldState == STATE_ARGUMENT) {
				state = STATE_RESOLVED;
				object = promise;
			}
		}

		if (oldState == STATE_ARGUMENT)
			((Future<?>) oldObject).argumentResolved(index, promise);
		else if (oldState == STATE_FORWARD)
			((Future<Type>) oldObject).resolve(promise);
		else if (oldState == STATE_EMPTY || oldState == STATE_COLLECT)
			promise.requestForwarding(this);
		else
			assert (oldState == STATE_RESOLVED && promise == oldObject);

		debug1("resolve end");
	}

	@Override
	public final void reject(Exception error) {
		debug1("reject start");
		assert (error != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug1("reject sync");

			oldState = state;
			oldObject = object;

			if (oldState != STATE_REJECTED) {
				state = STATE_REJECTED;
				object = error;
			}
		}

		if (oldState != STATE_REJECTED)
			rejectChildren(error);

		if (oldState == STATE_ARGUMENT || oldState == STATE_FORWARD)
			((Future<?>) oldObject).reject(error);

		debug1("reject end");
	}

	protected abstract void rejectChildren(Exception error);
}

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

// TODO: remove the special handling of exceptions
// TODO: futures should be resolved only once, even when collecting

public abstract class Future<Type> implements Promise<Type> {
	static final short STATE_EMPTY = 0x00; // null
	static final short STATE_FORWARD = 0x02; // Future<Type>
	static final short STATE_COLLECT = 0x05; // Promise<Type>
	static final short STATE_ARGUMENT = 0x06; // Future<?>
	static final short STATE_RESOLVED = 0x07; // Promise<Type>
	static final short STATE_REJECTED = 0x0f; // Exception

	protected short state = STATE_EMPTY;
	private short index;
	private Object object;

	@SuppressWarnings("unchecked")
	protected final void resolve(Promise<Type> promise) {
		debug("resolve start");
		assert (promise != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug("resolve sync");

			oldState = state;
			oldObject = object;

			state = (short) (state | STATE_COLLECT);
			if (oldState < STATE_RESOLVED)
				object = promise;
		}

		if (oldState == STATE_ARGUMENT)
			((Future<?>) oldObject).argumentResolved(index, promise);
		else if (oldState == STATE_FORWARD)
			((Future<Type>) oldObject).resolve(promise);
		else if (oldState == STATE_EMPTY || oldState == STATE_COLLECT) {
			if (promise instanceof Future<?>)
				((Future<Type>) promise).requestForwarding(this);
		} else
			assert (oldState == STATE_RESOLVED || oldState == STATE_REJECTED);

		debug("resolve end");
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestArgument(short index, Future<?> parent) {
		debug("requestArgument start");
		assert (parent != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug("requestArgument sync");

			oldState = state;
			oldObject = object;

			state = (short) (oldState | STATE_ARGUMENT);
			if (oldState <= STATE_FORWARD) {
				object = parent;
				this.index = index;
			}
		}

		if (oldState == STATE_COLLECT || oldState == STATE_RESOLVED)
			parent.argumentResolved(index, (Promise<Type>) oldObject);
		else if (oldState == STATE_REJECTED)
			parent.reject((Exception) oldObject);
		else
			assert (oldState == STATE_EMPTY || oldState == STATE_FORWARD);

		debug("requestArgument end");
	}

	@SuppressWarnings("unchecked")
	public final void requestForwarding(Future<Type> parent) {
		debug("requestForwarding start");
		assert (parent != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug("requestForwarding sync");

			oldState = state;
			oldObject = object;

			state = (short) (oldState | STATE_FORWARD);
			if (oldState <= STATE_FORWARD)
				object = parent;
		}

		if (oldState == STATE_COLLECT)
			parent.resolve((Promise<Type>) oldObject);
		else if (oldState == STATE_REJECTED)
			parent.reject((Exception) oldObject);
		else
			assert (oldState == STATE_EMPTY || oldState == STATE_FORWARD || oldState == STATE_RESOLVED);

		debug("requestForwarding end");
	}

	public final void debug(String where) {
		/*
		 * try { Thread.sleep(1); } catch (Exception e) { }
		 */

		// System.out.println(where + " this=" + System.identityHashCode(this)
		// + " state=" + state);
	}

	protected Future() {
		debug("constructor");
	}

	@Override
	@SuppressWarnings("unchecked")
	public final Constant<Type> getConstant() {
		debug("getConstant");

		Object object = this.object;
		if (object instanceof Constant<?>)
			return (Constant<Type>) object;
		else
			return null;
	}

	protected abstract <Arg> void argumentResolved(short index,
			Promise<Arg> argument);

	@Override
	public final void reject(Exception error) {
		debug("reject start");
		assert (error != null);

		short oldState;
		Object oldObject;

		synchronized (this) {
			debug("reject sync");

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

		debug("reject end");
	}

	protected abstract void rejectChildren(Exception error);
}

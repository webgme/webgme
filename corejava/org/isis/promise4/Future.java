/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public abstract class Future<Type> implements Promise<Type> {
	static final short STATE_EMPTY = 0; // null
	static final short STATE_FORWARDING = 1; // Future<Type>
	static final short STATE_RESOLVED = 1; // Promise<Type>
	static final short STATE_ARGUMENT = 2; // Future<?>
	static final short STATE_REJECTED = 3; // Exception

	private short state;
	private short index;
	private Object object;

	protected Future() {
		state = STATE_EMPTY;
	}

	@Override
	@SuppressWarnings("unchecked")
	public Promise<Type> getPromise() {
		Promise<Type> promise = null;
		synchronized (this) {
			if (state == STATE_RESOLVED)
				promise = (Promise<Type>) object;
		}
		return promise;
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestForwarding(Future<Type> parent) {
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
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void requestArgument(short index, Future<?> parent) {
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
		else
			assert (oldState != STATE_FORWARDING);
	}

	protected abstract <Arg> void argumentResolved(short index,
			Promise<Arg> argument);

	@SuppressWarnings("unchecked")
	protected final void resolve(Promise<Type> promise) {
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
	}

	@Override
	public final void reject(Exception error) {
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
	}

	protected abstract void rejectChildren(Exception error);
}

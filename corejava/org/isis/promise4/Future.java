package org.isis.promise4;

public abstract class Future<Type> implements Promise<Type> {
	static final short STATE_EMPTY = 0; // null
	static final short STATE_VALUE = 1; // Promise<Type>
	static final short STATE_ERROR = 2; // Exception
	static final short STATE_CANCEL = 3; // Exception

	private short state;
	private Object object;
	private Future<?> parent;

	protected Future() {
		state = STATE_EMPTY;
	}

	protected abstract <Arg> void childResolved(Future<Arg> child,
			Promise<Arg> promise);

	protected final void resolve(Promise<Type> promise) {
		short state;
		synchronized (this) {
			state = this.state;
			if (state <= STATE_VALUE) {
				this.state = STATE_VALUE;
				this.object = promise;
			}
		}

		if (state <= STATE_VALUE) {
			if (parent != null)
				parent.childResolved(this, promise);
			else
				promise.setParent(this);
		}
	}

	protected final void childFailed(Exception error) {
		assert (error != null);

		futureCanceled(error);
		reject(error);
	}

	protected final void reject(Exception error) {
		assert (error != null);

		short state;
		synchronized (this) {
			state = this.state;
			if (state < STATE_VALUE) {
				this.state = STATE_ERROR;
				this.object = error;
			}
		}

		if (state < STATE_VALUE && parent != null)
			parent.childFailed(error);
	}

	protected abstract void futureCanceled(Exception reason);

	@Override
	public final void cancel(Exception reason) {
		short state;
		synchronized (this) {
			state = this.state;
			if (state < STATE_VALUE) {
				this.state = STATE_CANCEL;
				this.object = reason;
			}
		}

		if (state < STATE_VALUE)
			futureCanceled(reason);
	}

	@Override
	@SuppressWarnings("unchecked")
	public final void setParent(Future<?> parent) {
		assert (parent != null);

		short state;
		synchronized (this) {
			this.parent = parent;
			state = this.state;
		}

		if (state == STATE_VALUE)
			parent.childResolved(this, (Promise<Type>) object);
		else if (state == STATE_ERROR)
			parent.childFailed((Exception) object);
	}
}

package org.isis.promise4;

public class Bind<Type, Arg> implements Promise<Type> {

	private static final short CALCULATED = 0x01;
	private static final short STATE_GET_ARGUMENT = 0x02;

	private short state;
	private Promise<?> object;
	private Bind<?, ?> parent;

	@Override
	public boolean isFulfilled() {
		return state == CALCULATED;
	}

	@Override
	public Type getValue() throws Exception {
		assert (state == CALCULATED);

		@SuppressWarnings("unchecked")
		Promise<Type> promise = (Promise<Type>) object;
		return promise.getValue();
	}

	public Bind(Promise<Arg> promise) {
		returnArgument(promise);
	}

	@SuppressWarnings("unchecked")
	protected void requestArgument(Bind<?, Type> parent) {
		assert (parent != null);

		int state;
		synchronized (this) {
			assert (this.parent == null);

			state = this.state;
			this.parent = parent;
		}

		if (state == CALCULATED) {
			parent.returnArgument((Promise<Type>) object);
		}
	}

	protected void returnArgument(Promise<Arg> promise) {
		assert (promise != null);

		if (promise.isFulfilled()) {
			try {
				Arg arg = promise.getValue();
				object = calculate(arg);
				state = CALCULATED;
			} catch (Exception error) {

			}
		} else {

		}
	}

	protected void getValue(Bind<Type, ?> parent) {
	}

	protected void setValue(Type value) {

		Bind<?, ?> parent = null;

		synchronized (this) {
			if (this.state < STATE_EXCEPTION) {
				this.state = STATE_EXCEPTION;
				this.object = promise;

				parent = this.parent;
			}
		}

		if (parent != null)
			parent.setException(promise);
	}

	public Promise<Type> calculate(Arg arg) throws Exception {
		return null;
	}
}

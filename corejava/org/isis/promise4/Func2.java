package org.isis.promise4;

public abstract class Func2<Type, Arg0, Arg1> {
	public abstract Promise<Type> call(Arg0 arg0, Arg1 arg1) throws Exception;

	public Promise<Type> call(Promise<Arg0> promise0, Promise<Arg1> promise1)
			throws Exception {
		promise0 = promise0.getPromise();
		promise1 = promise1.getPromise();

		if (promise0 instanceof Constant<?> && promise1 instanceof Constant<?>) {
			Arg0 arg0 = ((Constant<Arg0>) promise0).getValue();
			Arg1 arg1 = ((Constant<Arg1>) promise1).getValue();
			return call(arg0, arg1);
		}

		final Func2<Type, Arg0, Arg1> that = this;
		return new FutureCall2<Type, Arg0, Arg1>(promise0, promise1) {
			public Promise<Type> execute(Arg0 arg0, Arg1 arg1) throws Exception {
				return that.call(arg0, arg1);
			}
		};
	}

	public Promise<Type> call(Promise<Arg0> promise0, final Arg1 arg1)
			throws Exception {
		promise0 = promise0.getPromise();

		if (promise0 instanceof Constant<?>) {
			Arg0 arg0 = ((Constant<Arg0>) promise0).getValue();
			return call(arg0, arg1);
		}

		final Func2<Type, Arg0, Arg1> that = this;
		return new FutureCall1<Type, Arg0>(promise0) {
			public Promise<Type> execute(Arg0 arg0) throws Exception {
				return that.call(arg0, arg1);
			}
		};
	}

	public Promise<Type> call(final Arg0 arg0, Promise<Arg1> promise1)
			throws Exception {
		promise1 = promise1.getPromise();

		if (promise1 instanceof Constant<?>) {
			Arg1 arg1 = ((Constant<Arg1>) promise1).getValue();
			return call(arg0, arg1);
		}

		final Func2<Type, Arg0, Arg1> that = this;
		return new FutureCall1<Type, Arg1>(promise1) {
			public Promise<Type> execute(Arg1 arg1) throws Exception {
				return that.call(arg0, arg1);
			}
		};
	}
}

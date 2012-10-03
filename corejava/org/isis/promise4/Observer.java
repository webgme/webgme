package org.isis.promise4;

final class Observer<Type> {
	private final Future<Type> parent;
	private Promise<Type> child;

	Observer(Future<Type> parent, Promise<Type> child) {
		assert (parent != null && child != null);

		this.parent = parent;
		setChild(child);
	}

	void setChild(Promise<Type> child) {
		assert (child != null);

		this.child = child;
		if (child instanceof Constant<?>)
			parent.childReady();
		else {
			((Future<Type>) child).setParent(this);
		}
	}

	void cancel() {
		child.cancel();
	}
}

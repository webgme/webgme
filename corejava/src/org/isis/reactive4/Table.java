package org.isis.reactive4;

public class Table<T extends Table<T>> {

	public class Field<R extends Table<R>> {

	}
	
	public class Subset<R extends Table<R>> {
		
	}
	
	public class Expression<R extends Table<R>> {
		public <S extends Table<S>> Expression<S> get(Table<R>.Field<S> field) {
			return null;
		}

		public <S extends Table<S>> Expression<S> get(Table<R>.Subset<S> field) {
			return null;
		}
	}
	
	protected Expression<T> current = new Expression<T>();
	
	public <R extends Table<R>> Field<R> declareField() {
		return new Field<R>();
	}

	public <R extends Table<R>> Subset<R> declareSubset() {
		return new Subset<R>();
	}
}

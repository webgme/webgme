package org.isis.reactive2.test;

import org.isis.reactive2.*;

public class Client extends Record {
	protected int __queries;
	
	public static Setter<Client, Integer> queries = new Setter<Client, Integer>() {
		public void set(Client record, Integer value) {
			record.__queries = value;
		}

		public Integer get(Client record) {
			return record.__queries;
		}
	};
};

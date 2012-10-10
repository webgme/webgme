package org.isis.reactive2.test;

import org.isis.reactive2.*;

public class Query extends Record {
	protected Node __node;
	protected Client __client;

	public boolean loadSelf;
	public boolean loadChildren;
	public boolean loadAncestors;

	protected Query parent;
	
	public static Setter<Query, Node> node = new Setter<Query, Node>() {
		public void set(Query record, Node value) {
			record.__node = value;
		}

		public Node get(Query record) {
			return record.__node;
		}
	};

	public static Setter<Query, Client> client = new Setter<Query, Client>() {
		public void set(Query record, Client value) {
			record.__client = value;
		}

		public Client get(Query record) {
			return record.__client;
		}
	};
};

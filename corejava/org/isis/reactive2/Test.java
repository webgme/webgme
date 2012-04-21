package org.isis.reactive2;

import java.util.*;

public class Test {

	public static class Node extends Record {
		protected String __name;
		public static Setter<Node, String> name = new Setter<Node, String>() {
			public void set(Node record, String value) {
				record.__name = value;
			}

			public String get(Node record) {
				return record.__name;
			}
		};

		protected Node __parent;
		public static Setter<Node, Node> parent = new Setter<Node, Node>() {
			public void set(Node record, Node value) {
				record.__parent = value;
			}

			public Node get(Node record) {
				return record.__parent;
			}
		};

		protected List<Node> __children = new ArrayList<Node>();
		public static Getter<Node, Collection<Node>> children = new Getter<Node, Collection<Node>>() {
			public Collection<Node> get(Node record) {
				return record.__children;
			}
		};

		protected List<Query> __queries = new ArrayList<Query>();
		public static Getter<Node, Collection<Query>> queries = new Getter<Node, Collection<Query>>() {
			public Collection<Query> get(Node record) {
				return record.__queries;
			}
		};
	};

	public static class Client extends Record {
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

	public static class Query extends Record {
		protected Node __node;
		public static Setter<Query, Node> node = new Setter<Query, Node>() {
			public void set(Query record, Node value) {
				record.__node = value;
			}

			public Node get(Query record) {
				return record.__node;
			}
		};

		protected Client __client;
		public static Setter<Query, Client> client = new Setter<Query, Client>() {
			public void set(Query record, Client value) {
				record.__client = value;
			}

			public Client get(Query record) {
				return record.__client;
			}
		};

		public boolean loadSelf;
		public boolean loadChildren;
		public boolean loadAncestors;

		protected Query parent;
	};

	public Test() {

		StoredValue<Node, String> nodeName = new StoredValue<Node, String>(
				Node.name);

		StoredValue<Node, Node> nodeParent = new StoredValue<Node, Node>(
				Node.parent);

		PulledBag<Node, Node> nodeChildren = new StoredInverse<Node, Node>(
				Node.children, nodeParent);

		StoredValue<Query, Node> queryNode = new StoredValue<Query, Node>(
				Query.node);

		PulledBag<Node, Query> nodeQueries = new StoredInverse<Node, Query>(
				Node.queries, queryNode);

		PushedValue<Query, String> queryNodeName = new PushedImportValue<Query, String, Node>(
				nodeQueries, nodeName);

		PulledValue<Query, Node> queryNodeParent = new PulledImportValue<Query, Node, Node>(queryNode, nodeQueries, nodeParent);
		
		PushedBag<Node, String> nodeChildrenNames = new PushedImportBag<Node, String, Node>(
				nodeParent, nodeName);
		
		PushedBag<Query, Node> queryNodeChildren = new PushedImportBag<Query, Node, Node>(
				queryNode, nodeChildren);

		StoredValue<Query, Client> queryClient = new StoredValue<Query, Client>(
				Query.client);
		
		StoredCounter<Client> clientQueries = new StoredCounter<Client>(Client.queries);

	};
}

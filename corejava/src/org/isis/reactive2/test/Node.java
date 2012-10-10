package org.isis.reactive2.test;

import java.util.*;
import org.isis.reactive2.*;

public class Node extends Record {
	protected String __name;
	protected Node __parent;
	protected List<Node> __children = new ArrayList<Node>();
	protected List<Query> __queries = new ArrayList<Query>();
	
	public static Setter<Node, String> name = new Setter<Node, String>() {
		public void set(Node record, String value) {
			record.__name = value;
		}

		public String get(Node record) {
			return record.__name;
		}
	};

	public static Setter<Node, Node> parent = new Setter<Node, Node>() {
		public void set(Node record, Node value) {
			record.__parent = value;
		}

		public Node get(Node record) {
			return record.__parent;
		}
	};

	public static Getter<Node, Collection<Node>> children = new Getter<Node, Collection<Node>>() {
		public Collection<Node> get(Node record) {
			return record.__children;
		}
	};

	public static Getter<Node, Collection<Query>> queries = new Getter<Node, Collection<Query>>() {
		public Collection<Query> get(Node record) {
			return record.__queries;
		}
	};
};


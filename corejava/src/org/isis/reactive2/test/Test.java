package org.isis.reactive2.test;

import org.isis.reactive2.*;

public class Test {

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

		PushedValue<Query, String> queryNodeName = new ExportValue<Query, String, Node>(
				nodeName, nodeQueries);

		PulledValue<Query, Node> queryNodeParent = new ImportValue<Query, Node, Node>(
				queryNode, nodeQueries, nodeParent);
		
		PushedBag<Node, String> nodeChildrenNames = new ExportBag1<Node, String, Node>(
				nodeName, nodeParent);
		
		PushedBag<Query, Node> queryNodeChildren = new ExportBag2<Query, Node, Node>(
				nodeChildren, nodeQueries);

		StoredValue<Query, Client> queryClient = new StoredValue<Query, Client>(
				Query.client);

		PushedBag<Node, Client> nodeQueriesClient = new ExportBag1<Node, Client, Query>(
				queryClient, queryNode);

		StoredCounter<Client> clientQueries = new StoredCounter<Client>(Client.queries);
	};
}

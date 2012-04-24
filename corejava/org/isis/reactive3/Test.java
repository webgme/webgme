package org.isis.reactive3;

public class Test extends Project {

	public Test() {

		Table storages = createTable();
		Table nodes = createTable();
		Table clients = createTable();
		Table queries = createTable();

		Field storageName = storages.createField(strings);
		Subset storageNodes = storages.createSubset(nodes);
		
		Field nodeStorage = nodes.createField(storages);
		Field nodeParent = nodes.createField(nodes);
		Subset nodeChildren = nodes.createSubset(nodes);
		Subset nodeQueries = nodes.createSubset(queries);

		Field clientName = clients.createField(strings);
		Subset clientQueries = clients.createSubset(queries);

		Field queryNode = queries.createField(nodes);
		Field queryClient = queries.createField(clients);
		
		BooleanField queryLoadSelf = queries.createBoolean();

		Field nodeLoadSelf = nodes.createField(booleans);
		nodeLoadSelf.set(nodes.self.get(nodeQueries).get(queryLoadSelf).or());
		
	}
}

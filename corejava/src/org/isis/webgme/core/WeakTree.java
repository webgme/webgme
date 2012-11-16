package org.isis.webgme.core;

import java.util.*;

public class WeakTree extends WeakPath implements CoreTree<WeakNode> {
	@Override
	public Object getData(WeakNode node) {
		return node.data;
	}

	@Override
	public boolean isMutable(WeakNode node) {
		return node.data instanceof HashMap;
	}

	@Override
	public void mutate(WeakNode node) {

		for(;;) {
			
		}

		if (node.data instanceof JsonObject) {
			JsonObject json = (JsonObject) node.data;
			node.data = json.mutate();

			if (node.parent != null) {
				mutate(node.parent);

				HashMap map = (HashMap<String, Object>) node.parent.data;
			}
		} else {
			assert (node.data instanceof HashMap);
		}
	}

	@Override
	public String getHash(WeakNode node) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void setHash(WeakNode node, String hash) {
		// TODO Auto-generated method stub

	}

	@Override
	public List<String> getProperties() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public Object getProperty(String name) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void setProperty(String name, Object value) {
		// TODO Auto-generated method stub

	}

}

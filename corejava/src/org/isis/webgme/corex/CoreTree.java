package org.isis.webgme.corex;

import java.util.*;

public abstract class CoreTree<NODE extends CorePath.Node<NODE> & CoreTree.Node>
		extends CorePath<NODE> {

	public interface Node {
		public Object getData();

		public void setData(Object object);
	}

	public static final JsonObject EMPTY = new JsonObject(new String[0],
			new Object[0]);

	/**
	 * Returns the data corresponding to this node, which is null (invalid
	 * path), an Integer, a String, EMPTY or a regular compound object
	 */
	public Object getData(NODE node) {
		node = reattach(node);
		return node.getData();
	}

	public boolean isMutable(NODE node) {
		node = reattach(node);
		return node.getData() instanceof Map;
	}

	protected abstract void mutate(NODE node);

	/**
	 * Returns null (object is not hashed), or an empty string (hash is not yet
	 * calculated for mutable object) or a real hash string;
	 */
	public String getHash(NODE node) {
		Object object = getData(node);

		if (object instanceof JsonObject) {
			JsonObject json = (JsonObject) object;
			return (String) json.getProperty(JsonObject.ID_NAME);
		} else if (object instanceof Map) {
			@SuppressWarnings("unchecked")
			Map<String, Object> map = (Map<String, Object>) object;
			return (String) map.get(JsonObject.ID_NAME);
		} else
			return null;
	}

	/**
	 * Sets the hash of the node directly with no verification.
	 */
	public void setHash(NODE node, String hash) {
		assert (hash == null || hash.length() == 0);

		mutate(node);

		@SuppressWarnings("unchecked")
		Map<String, Object> map = (Map<String, Object>) getData(node);
		map.put(JsonObject.ID_NAME, hash);
	}
}

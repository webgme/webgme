package org.isis.webgme.corew;

import java.util.*;

public class WeakTree extends WeakPath {
	public final static JsonObject EMPTY = new JsonObject(new String[0],
			new Object[0]);

	public boolean isValid(WeakNode node) {
		return node.data != null;
	}

	public boolean isMutable(WeakNode node) {
		return node.data instanceof Map;
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> mutate(WeakNode node) {
		Map<String, Object> map = null;

		if (node.data instanceof Map)
			map = (Map<String, Object>) node.data;
		else if (node.data instanceof JsonObject) {
			map = ((JsonObject) node.data).mutate();

			if (node.parent != null) {
				Map<String, Object> parent = mutate(node.parent);
				assert (parent.get(node.relid) == node.data || map.get(
						JsonObject.ID_NAME).equals(parent.get(node.relid)));

				parent.put(node.relid, map);
			}

			if (map.get(JsonObject.ID_NAME) != null)
				map.put(JsonObject.ID_NAME, "");
		}

		return map;
	}

	public Object getData(WeakNode node) {
		if (node.data instanceof Map)
			throw new IllegalStateException();

		return node.data;
	}

	private static Object getJsonProperty(Object object, String name) {
		if (object instanceof JsonObject) {
			JsonObject json = (JsonObject) object;
			object = json.getProperty(name);
		} else if (object instanceof Map) {
			@SuppressWarnings("unchecked")
			Map<String, Object> map = (Map<String, Object>) object;
			object = map.get(name);
		} else
			return null;

		return object != null ? object : EMPTY;
	}

	public void resetData(WeakNode node, Object data) {
		assert (data == null || data instanceof String
				|| data instanceof Integer || data instanceof JsonObject);

		node.data = data;

		Iterator<WeakNode> iter = getChildren(node).iterator();
		while (iter.hasNext()) {
			WeakNode child = iter.next();
			resetData(child, getJsonProperty(data, child.relid));
		}
	}

	public void setData(WeakNode node, Object data) {
		if (!(data instanceof String || data instanceof Integer || data instanceof JsonObject))
			throw new IllegalArgumentException();

		resetData(node, data);

		if (node.parent != null) {
			Map<String, Object> map = mutate(node.parent);

			Object old = map.get(node.relid);
			if (old == null)
				assert (node.data == EMPTY);
			else if (old != node.data) {
				assert (old instanceof String);

			}
		}
	}

	public String getHash(WeakNode node) {
		return (String) getJsonProperty(node.data, JsonObject.ID_NAME);
	}

	public void setHash(WeakNode node, String hash) {
		Map<String, Object> map = mutate(node);
		assert (map != null);

		if (hash != null)
			map.put(JsonObject.ID_NAME, hash);
		else
			map.remove(JsonObject.ID_NAME);
	}

	public Object getProperty(WeakNode node, String name) {
		WeakNode child = getChild(node, name);
		return getData(child);
	}

	public void setProperty(WeakNode node, String name, Object value) {
		WeakNode child = getChild(node, name);
		setData(child, value);
	}

	@Override
	protected WeakNode createNode(WeakNode parent, String relid) {
		WeakNode node = super.createNode(parent, relid);

		if (parent != null)
			node.data = getJsonProperty(parent.data, relid);

		return node;
	}

	@Override
	public WeakNode getChild(WeakNode node, String relid) {
		if (relid.equals(JsonObject.ID_NAME))
			throw new IllegalArgumentException();

		return super.getChild(node, relid);
	}
}

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

	public Object getData(WeakNode node) {
		assert (!isMutable(node));
		return node.data;
	}

	public void setData(WeakNode node, Object data) {
		assert (data instanceof String || data instanceof Integer || data instanceof JsonObject);

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

	@SuppressWarnings("unchecked")
	private Object getJsonValue(Object object, String key) {
		if (object instanceof Map)
			return ((Map<String, Object>) object).get(key);
		else if (object instanceof JsonObject)
			return ((JsonObject) object).getProperty(key);
		else
			return null;
	}

	@Override
	public WeakNode getChild(WeakNode node, String relid) {
		WeakNode child = super.getChild(node, relid);
		if( child.data == WeakNode.UNINITIALIZED_DATA ) {
			child.data = 
			if( node.data instanceof JsonObject ) {
				Object data = ((JsonObject) node.data).getProperty(relid);
				child.data = data != null ? data : EMPTY;
			}
			else if( node.data instanceof Map ) 
		}

	
		if (node.data == null)
			assert (child.data == null);
		else if (child.data == null) {
			Object data = null;
			if (node.data instanceof JsonObject)
				data = ((JsonObject) node.data).getProperty(relid);
			else if(node.data instanceof Map)
			
			if (data child.data == null)
				child.data = EMPTY;
			}
		}

		return child;
	}

	@SuppressWarnings("unchecked")
	private void setJsonValue(Object object, String key, Object value) {
		if (object instanceof Map)
			((Map<String, Object>) object).put(key, value);
	}

	@Override
	public Map<String, Object> mutate(WeakNode node) {
		if (node.data instanceof JsonObject) {
			Map<String, Object> map = ((JsonObject) node.data).mutate();

			if (node.parent != null) {
				mutate(node.parent);

				Object data = getJsonValue(node.parent.data, node.relid);
				assert (data == node.data || (data instanceof String && data
						.equals(map.get(JsonObject.ID_NAME))));

				setJsonValue(node.parent.data, node.relid, node.data);
			}

			if (map.get(JsonObject.ID_NAME) != null)
				map.put(JsonObject.ID_NAME, "");

			node.data = map;
		}

		assert (node.data instanceof Map);
	}

	public String getHash(WeakNode node) {
		// TODO Auto-generated method stub
		return null;
	}

	public void setHash(WeakNode node, String hash) {
		// TODO Auto-generated method stub
	}
}

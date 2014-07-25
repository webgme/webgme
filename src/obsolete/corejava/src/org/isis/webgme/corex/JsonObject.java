package org.isis.webgme.corex;

import java.util.*;

public final class JsonObject {
	public static final String ID_NAME = "_id";

	public final String[] names;
	public final Object[] values;

	public Object getProperty(String name) {
		for (int i = 0; i < names.length; ++i) {
			if (name.equals(names[i]))
				return values[i];
		}

		return null;
	}

	public JsonObject(String[] names, Object[] values) {
		assert (names.length == values.length);
		for (int i = 0; i < names.length; ++i) {
			assert (names[i] != null && values[i] instanceof Integer
					|| values[i] instanceof String || values[i] instanceof JsonObject);
		}

		this.names = names;
		this.values = values;
	}

	public JsonObject(Map<String, Object> map) {
		int i = map.size();
		names = new String[i];
		values = new Object[i];

		i = 0;
		for (Map.Entry<String, Object> entry : map.entrySet()) {
			names[i] = entry.getKey();
			values[i] = entry.getValue();

			assert (names[i] != null && values[i] instanceof Integer
					|| values[i] instanceof String || values[i] instanceof JsonObject);

			++i;
		}
	}

	public Map<String, Object> mutate() {
		HashMap<String, Object> map = new HashMap<String, Object>();
		for (int i = 0; i < names.length; ++i) {
			Object value = values[i];

			String name = names[i];
			if (name.equals(ID_NAME))
				value = "";

			map.put(name, value);
		}

		return map;
	}
}

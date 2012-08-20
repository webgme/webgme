package org.isis.xpromise8;

public class Test {

	Function1<Promise<String[]>, String> loadDirectory = new Function1<Promise<String[]>, String>() {
		public Promise<String[]> invoke(String path) {
			assert (path != null);

			int size = 5 - path.length();
			if (size < 0) {
				size = 0;
			}

			String[] list = new String[size];
			for (int i = 0; i < size; ++i)
				list[i] = path + "/" + i;

			return Promise.constant(list);
		}
	};

	Function1<Promise<Integer>, String> getDirectorySize = new Function1<Promise<Integer>, String>() {
		public Promise<Integer> invoke(String path) {
			Promise<String[]> subdirs = loadDirectory.invoke(path);
			return Promise.call(new Function1<Promise<Integer>, String[]>() {
				public Promise<Integer> invoke(String[] arg) {
					return null;
				}
			}, subdirs);
		}
	};
}

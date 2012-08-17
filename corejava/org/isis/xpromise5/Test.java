package org.isis.xpromise5;

public class Test {

	Promise<String[]> loadDirectory(String path) {
		assert (path != null);

		int size = 5 - path.length();
		if (size < 0) {
			size = 0;
		}

		String[] list = new String[size];
		for (int i = 0; i < size; ++i)
			list[i] = path + "/" + i;

		return new PromiseConstant<String[]>(list);
	}

	Promise<Integer> getDirectorySize(String path) {
		Promise<String[]> subdirs = loadDirectory(path);
		return new PromiseProc1<Integer, String[]>(subdirs) {
			protected Promise<Integer> calc(String[] subdirs) {
				
				PromiseArray<Integer> sizes = new PromiseArray<Integer>();
				for(int i = 0; i < subdirs.length; ++i) {
					sizes.add(getDirectorySize(subdirs[i]));
				}
				sizes.done();
				
				return new PromiseFunc1<Integer, Integer[]>(sizes) {
					protected Integer calc(Integer[] sizes) {
						int s = 1;
						for(int i = 0; i < sizes.length; ++i) {
							s += sizes[i];
						}
						return s;
					}
				};
			}
		};
	}
}

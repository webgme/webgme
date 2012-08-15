package org.isis.xpromise4;

public class Test {
	static void loadDirectory(String dir, Callback<String[]> subdirs) {
		assert (dir != null);

		int size = 5 - dir.length();
		if (size < 0) {
			size = 0;
		}

		String[] list = new String[size];
		for (int i = 0; i < size; ++i)
			list[i] = dir + "/" + i;

		subdirs.done(list);
	}
	
	static void getDirectorySize(String dir, Callback<Integer> size) {
		assert(dir != null);
		
		AsyncProc<Integer, String[]> proc = new AsyncProc<Integer, String[]>(size) {
			void calc(String[] arg, Callback<Integer> callback) {
			}
		};
		
		loadDirectory(dir, proc.arg);
	}
}

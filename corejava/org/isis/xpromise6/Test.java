package org.isis.xpromise6;

public class Test {
	static final class LoadDirectory {
		public LoadDirectory(String dir, Callback<String[]> subdirs) {
			assert (dir != null);

			int size = 5 - dir.length();
			if (size < 0) {
				size = 0;
			}

			String[] list = new String[size];
			for (int i = 0; i < size; ++i)
				list[i] = dir + "/" + i;

			subdirs.setValue(list);
		}
	};

	static final class GetDirectorySize extends AsyncFunc1<Integer, String[]> {
		public GetDirectorySize(String dir, Callback<Integer> size) {
			super(size);
			
			new LoadDirectory(dir, this);
		}

		protected void calc(String[] subdirs, Callback<Integer> parent) {
		}
	};
}

package org.isis.xpromise7;

public abstract class Test {
	Promise<String[]> loadDirectory(final String path) {
		return new Promise<String[]>() {
			protected void prepare() {
				assert(path != null);
				
				int size = 5 - path.length();
				if( size < 0 ) {
					size = 0;
				}
				
				String[] list = new String[size];
				for(int i = 0; i < size; ++i)
					list[i] = path + "/"+ i;
				
				setValue(list);
			}
		};
	}
	
	Promise<Integer> getDirectorySize(final String path) {
		return new Function1<Integer, String[]>() {
			protected void prepare() {
				setArgument(loadDirectory(path));
			}
			
			protected Promise<Integer> calculate(final String[] subdirs) {
				return new FunctionA<Integer, Integer>() {
					protected void prepare() {
						for(int i = 0; i < subdirs.length; ++i) {
							addArgument(getDirectorySize(subdirs[i]));
						}
					}
					
					protected Promise<Integer> calculate(Integer[] arg) {
						return null;
					}
				};
			}
		};
	}
}

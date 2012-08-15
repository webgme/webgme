/**
 * Copyright (C) Miklos Maroti, 2012
 *
 * This program is free software; you can redistribute it and/or modify it 
 * under the terms of the GNU General Public License as published by the 
 * Free Software Foundation; either version 2 of the License, or (at your 
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General 
 * Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along 
 * with this program; if not, write to the Free Software Foundation, Inc., 
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 */

package org.isis.xpromise3;

public class PromiseFileCount { 

	static Promise<String[]> loadDirectory(String path) {
		assert(path != null);
		return new Calc1<String[], String>(path) {
			public Promise<String[]> calc(String path) {
				assert(path != null);
				
				int size = 5 - path.length();
				if( size < 0 ) {
					size = 0;
				}
				
				String[] list = new String[size];
				for(int i = 0; i < size; ++i)
					list[i] = path + "/"+ i;
				
				return new Constant<String[]>(list);
			}
		};
	};
	
	static Promise<Integer> getDirectorySize(String path) {
		assert(path != null);
		return new Calc1<Integer, String[]>(loadDirectory(path)) {
			public Promise<Integer> calc(String[] subdirs) {
				assert( subdirs != null );

				PromiseArray<Integer> array = new PromiseArray<Integer>();
				for(int i = 0; i < subdirs.length; ++i) {
					array.add(getDirectorySize(subdirs[i]));
				}

				return new Calc1<Integer, Integer[]>(array) {
					public Promise<Integer> calc(Integer[] sizes) {
						assert(sizes != null);

						int s = 1;
						for(int i = 0; i < sizes.length; ++i)
							s += sizes[i];

						return new Constant<Integer>(s);
					}
				};
			}
		};
	};
}

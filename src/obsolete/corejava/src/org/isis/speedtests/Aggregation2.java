package org.isis.speedtests;

public class Aggregation2 {

	private static final int COUNT = 1000000000;

	public interface Manager<Node> {
		void increase(Node node);
	}

	public static class Base1<Node> implements Runnable {
		private final Manager<Node> manager;
		private final Node node;

		public Base1(Manager<Node> manager, Node node) {
			this.manager = manager;
			this.node = node;
		}

		public void run() {
			for (int i = 0; i < COUNT; ++i)
				manager.increase(node);
		}
	}

	public static class NodeData {
		int counter;
	}

	public static Manager<NodeData> manager = new Manager<NodeData>() {
		@Override
		public void increase(NodeData node) {
			node.counter += 1;
		}
	};

	public static abstract class Base2<Node> implements Runnable {
		private final Node node;

		public Base2(Node node) {
			this.node = node;
		}

		public abstract void increase(Node node);
		
		public void run() {
			for (int i = 0; i < COUNT; ++i)
				increase(node);
		}
	}

	public static class Derived2 extends Base2<NodeData> {
		public Derived2(NodeData node) {
			super(node);
		}

		@Override
		public void increase(NodeData node) {
			node.counter += 1;
		}
	};
	
	public static void test(Runnable test) {
		long time = System.currentTimeMillis();
		for(int c = 0; c < 10; ++c)
			test.run();
		time = System.currentTimeMillis() - time;
		System.out.println("time " + time);
	}

	public static void main(String[] args) {
		test(new Base1<NodeData>(manager, new NodeData()));
		test(new Derived2(new NodeData()));
		test(new Base1<NodeData>(manager, new NodeData()));
		test(new Derived2(new NodeData()));
	}
}

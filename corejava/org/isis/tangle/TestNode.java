package org.isis.tangle;

public class TestNode extends Node {

	protected int value;

	public int getValue() {
		return value;
	}
	
	public void setValue(int value) {
		assert(isMutable());
		this.value = value;
	}
	
	public TestNode() {
		super();
		value = 0;
	}

	protected TestNode(TestNode node) {
		super(node);
		value = node.value;
	}

	protected TestNode clone() {
		return new TestNode(this);
	}

	public String toString() {
		return "value: " + value + ", " + super.toString();
	}
	
	public static void main(String[] args) {
		TestNode node = new TestNode();

		Cursor cursor = new Cursor(node);
		TestNode x = cursor.read();
		TestNode y = cursor.write();
		y.setValue(1);
		y.addChild(100, new TestNode());
		y.addChild(101, x);
		y.addChild(102, x);
		y.seal();
		
		TestNode z = cursor.getChild(101).write();
		z.setValue(2);

		System.out.println(x);
		System.out.println(y);
		System.out.println(z);
		System.out.println(cursor.read());
	}
}

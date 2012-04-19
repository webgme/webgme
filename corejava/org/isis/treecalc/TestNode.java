package org.isis.treecalc;

public class TestNode extends Tangle.Node {
    public int value;

    protected TestNode() {
	super();
	this.value = 1;
    }
    
    protected TestNode(TestNode node) {
	super(node);
	this.value = node.value;
    }
    
    public static Tangle<TestNode> TANGLE = new Tangle<TestNode>(new Tangle.Factory<TestNode>() {
	protected TestNode create() {
	    return new TestNode();
	}
	protected TestNode clone(TestNode node) {
	    return new TestNode(node);
	}
    });
    
    public static void main(String[] args) {
    }
}

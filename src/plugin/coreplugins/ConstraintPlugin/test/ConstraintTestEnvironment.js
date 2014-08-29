/*globals define,_*/
/*
 * This is a test environment for running constraint code
 * generated from the plugin.
 *
 * @author brollb / https://github/brollb
 *
 */

define(['./FakeCore',
        './ConstraintTests'], function (FakeCore,
                                        ConstraintTests){

    "use strict";

    var DEFAULT_TREE = 'basic';
    var ConstraintTestEnvironment = function(){
        this.currentNode = {};//one for each graph
        this.nodes = {};
        this._id = 0;
        this.META = {};
        this.core = new FakeCore();

        //load the tests
        this.tests = ConstraintTests;

        this.buildMeta();
        this.buildTrees();
    };

    ConstraintTestEnvironment.prototype._createTree = function(name){
        if (!this.nodes[name]){
            this.nodes[name] = {};
        }
    };

    ConstraintTestEnvironment.prototype._createNode = function(params){
        var tree = params.tree || DEFAULT_TREE,
            node = { base: this.META.fco, 
                     path: '/' + (++this._id),
                     parent: null,
                     children: [], 
                     attributes: { name: "node_" + this._id },
                     pointers: {} };

        _.extend(node, params);

        if (node.parent){
            node.path = node.parent.path + node.path;
            node.parent.children.push(node);
        } 

        if (_.isFunction(node.attributes)){
            node.attributes = node.attributes(this._id);
        } 

        //Add to nodes
        this.nodes[tree][node.path] = node;

        return node;
    };

    ConstraintTestEnvironment.prototype.buildMeta = function(){
        var meta = { fco: {},
                start: {},
                box: {},
                connection: { pointers: { src: null, dst: null} }},
            types = Object.keys(meta),
            nodesByName = {};

        this._createTree('META');
        for (var i = 0; i<types.length; i++){
            
            meta[types[i]].tree = 'META';
            //Add name to attributes
            if (!meta[types[i]].attributes){
                meta[types[i]].attributes = {};
            }
            meta[types[i]].attributes.name = types[i];

            //Resolve the base name to node object
            if (nodesByName[meta[types[i]].base]){
                meta[types[i]].base = nodesByName[meta[types[i]].base];
            }

            this.META[types[i]] = this._createNode(meta[types[i]]);
            nodesByName[types[i]] = this.META[types[i]];
        }

    };

    ConstraintTestEnvironment.prototype.buildTrees = function(){
        //I will create a tree with a branching factor of 5
        var branchingFactor = 4,
            height = 5,
            nodesAtCurrentLevel = [],
            nodesAtNextLevel = [],
            parent,
            defaultNodeInfo = { parent: parent, 
                base: this.META.box },
            treeRules = { "basic": {},
                          "duplicate names": { attributes: function(id){ 
                              return { name: "box_" + (id%5) };
                          }},
                          "multi start": { base: this.META.start } },
            nodeInfo,
            trees = Object.keys(treeRules),
            h = -1,
            b,
            i;
            

        i = trees.length;
        while (i--){
            this._createTree(trees[i]);
            nodeInfo = _.extend({}, defaultNodeInfo, treeRules[trees[i]]);
            nodeInfo.tree = trees[i];

            //Create root
            this.currentNode[trees[i]] = this._createNode({ tree: trees[i] });
            nodesAtCurrentLevel = [ this.currentNode[trees[i]] ];

            h = -1;
            while (++h < height){
                while (nodesAtCurrentLevel.length){
                    parent = nodesAtCurrentLevel.pop();
                    nodeInfo.parent = parent;
                    b = -1;
                    while (++b < branchingFactor){
                        nodesAtNextLevel.push(this._createNode(nodeInfo));
                    }
                }
                nodesAtCurrentLevel = nodesAtNextLevel;
                nodesAtNextLevel = [];
            }
        }

        console.log("Finished creating trees");

        i = trees.length;
        while(i--){
            console.log("size of ", trees[i], "is", Object.keys(this.nodes[trees[i]]).length);
        }
    };

    ConstraintTestEnvironment.prototype.runTest = function(testName, code, callback){
        var self = this,
            trees,
            codeFn,
            cb = function(err, results){
                if (!err){
                    self.compareResults(results, testName, trees[i]);
                    if (i === 0){
                        callback();
                    } else {
                        i--;
                        codeFn(self.core, self.currentNode[trees[i]], cb);
                    }
                } else {
                    console.log('ERROR RUNNING CODE: ', err);
                }
            },
            i;

        eval('codeFn = ' + code);

        //Run test on each tree
        trees = Object.keys(this.currentNode);
        i = trees.length-1;
        codeFn(this.core, this.currentNode[trees[i]], cb);
    };

    ConstraintTestEnvironment.prototype.compareResults = function(results, testName, tree){
        var passed = this.tests[testName](this, tree).hasViolation === results.hasViolation,
            msg = "FAILED";

        if (!this.tests.hasOwnProperty(testName)){
            console.log("Can't find test for", testName, "\nCannot test accuracy of", 
                        testName, "until we have a test to compare it against");
        }

        if (passed){
            msg = "PASSED";
        }

        console.log(testName, "on", tree, ": ( " + msg + " )");

        if (!passed){
            console.log("test results:", !this.tests[testName](this, tree).hasViolation, 
                        "gen result:", !results.hasViolation, "\n");
        }
    };

    /* * * * * * * * * * * CONVENIENCE METHODS FOR TESTS * * * * * * * * * * */
    ConstraintTestEnvironment.prototype._isTypeOf = function(node, type){
        var self = this,
            test = function (node){
            if (self.core.getAttribute(node, 'name') === type){
                return true;
            }
            return false;
        };

        test(node);
        while (this.core.getBase(node)){
            node = this.core.getBase(node);
            if (test(node)){
                return true;
            }
        }

        return false;
    };

    return ConstraintTestEnvironment;
});

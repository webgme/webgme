/*globals define,_*/
/*
 * This is a test environment for running constraint code
 * generated from the plugin.
 *
 * @author brollb / https://github/brollb
 *
 */

define(['./FakeCore'], function (FakeCore){

    "use strict";

    var DEFAULT_TREE = 'basic';
    var ConstraintTestEnvironment = function(){
        this.currentNode = {};//one for each graph
        this.nodes = {};
        this._id = 0;
        this.META = {};
        this.core = new FakeCore();

        this._createTests();
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
            node = {};

        if (!params){
            params = {};
        }

        if (params.parent){
            node.parent = params.parent;
            node.path = params.parent.path + '/' + (++this._id);

            node.parent.children.push(node);
        } else {
            node.path = '/' + (++this._id);
        }

        node.children = params.children || [];
        if (_.isFunction(params.attributes)){
            node.attributes = params.attributes(this._id);
        } else {
            node.attributes = params.attributes || { name: "node_" + this._id };
        }
        node.pointers = params.pointers || {};

        if (this.META.fco){
            node.base = params.base || this.META.fco;
        } 
        node.base = params.base || null;

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

    ConstraintTestEnvironment.prototype._createTests = function(){
        var self = this,
            uniqueName = function (tree){
                var nodes = Object.keys(self.nodes[tree]),
                    violation = { hasViolation: false, nodes: [] },
                    names = {},
                    name,
                    i;

                for (i = nodes.length-1; i>=0; i--){
                    name = self.core.getAttribute(self.nodes[tree][nodes[i]], 'name');
                    if (names[name]){
                        violation.hasViolation = true;
                        violation.message = name + ' is in conflict';

                        names[name].push(nodes[i]);
                        violation.nodes = names[name];
                    } else {
                        names[name] = [nodes[i]];
                    }
                } 
                return violation;
            },
            oneStartBlock = function (tree){
                var nodes = Object.keys(self.nodes[tree]),
                    violation = { hasViolation: false, nodes: []},
                    i;

                for (i = nodes.length-1; i>=0; i--){
                    if (self._isTypeOf(self.nodes[tree][nodes[i]], 'start')){
                        violation.nodes.push(self.nodes[tree][nodes[i]]);
                    }
                } 

                if (violation.nodes.length > 1){
                    violation.hasViolation = true;
                }
                return violation;
            };

        this._tests = { "Unique Name": uniqueName, "OneStartBlock": oneStartBlock };
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
        var passed = this._tests[testName](tree).hasViolation === results.hasViolation,
            msg = "FAILED";

        if (passed){
            msg = "PASSED";
        }

        console.log(testName, "on", tree, ": ( " + msg + " )");

        if (!passed){
            console.log("test results:", !this._tests[testName](tree).hasViolation, 
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

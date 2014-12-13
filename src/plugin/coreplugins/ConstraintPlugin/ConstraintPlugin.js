/*globals RegExp,_,define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * @author brollb / https://github/brollb
 * 
 * Visual constraint language for WebGME
 */

define(['plugin/PluginConfig',
        'plugin/PluginBase',
        '../CodeGenerator/CodeGenerator',
        './ConstraintCodeMap',
        './test/ConstraintTestEnvironment'], function (PluginConfig,
                                                       PluginBase,
                                                       CodeGenerator,
                                                       ConstraintCodeMap,
                                                       TestEnvironment){

    "use strict";

   var DEBUG_MODE = true;

   var ConstraintPlugin = function() {
        //Call base class's constructor
        PluginBase.call(this);
    };

    _.extend(ConstraintPlugin.prototype, CodeGenerator.prototype);  // Code generating functionality

    ConstraintPlugin.prototype.getName = function () {
        return "ConstraintPlugin";
    };
    
    ConstraintPlugin.prototype.getConfigStructure = function () {
        var config = [],
            constraints = [ 'Unique Name', 'OneStartBlock', "Limited Connection Count" ];

        //Apply To All Option
        config.push({ name: 'download',
                      displayName: 'Download constraint',
                      description: 'Download generated constraint code',
                      value: false, // this is the 'default config'
                      valueType: "boolean",
                      readOnly: false });

        config.push({ name: 'applyAll',
                      displayName: "Add constraints to node base",
                      description: 'Apply constraints to all nodes of this type',
                      value: false, // this is the 'default config'
                      valueType: "boolean",
                      readOnly: false });

        //Test?
        if (DEBUG_MODE){
            config.push({ name: 'testConstraints',
                          displayName: "Test Constraints",
                          description: 'Test Generated Constraint Code',
                          value: true, // this is the 'default config'
                          valueType: "boolean",
                          readOnly: false });
        }


        //Get the constraint names to populate the config
        //Currently this is not possible.
        //TODO

        for (var i = 0; i < constraints.length; i++){
            config.push({ name: constraints[i],
                          displayName: constraints[i],
                          description: 'Generate the ' + constraints[i] + ' constraint',
                          value: false, // this is the 'default config'
                          valueType: "boolean",
                          readOnly: false });
        }

        return config;
    };

    ConstraintPlugin.prototype.getConstraintNodes = function(){
        return this.constraintNodes;
    };

    ConstraintPlugin.prototype.getConstraintNames = function(){
        return Object.keys(this._nodesByConstraint);
    };


    ConstraintPlugin.prototype._loadConstraintNodes = function(callback){
        //we load the children of the constraintNodes
        var self = this,
            name,
            root = self.core.getRoot(self.activeNode),
            len,
            constraintsDirs = [];

        //Load the constraints to be run
        self.constraintNodes = {};

        var findConstraints = function(l, dirs){
            var dir = dirs[--l];
            self.core.loadChildren(dir, function(err, children){
                if (!err && children){
                    for (var i = 0; i < children.length; i++){
                        name = self.core.getAttribute(children[i], 'name');
                        if (self.config.hasOwnProperty(name) && self.config[name]){
                            self.constraintNodes[name] = children[i];//Store the node by constraint name
                        }
                    }
                }

                if (l > 0){
                    findConstraints(l, dirs);
                } else {
                    self._loadStartingNodes(callback);
                }
            });
        };

        self.core.loadChildren( root, function(err, children){
            if (!err && children){
                //Find the constraints dir
                for (var i = 0; i < children.length; i++){
                    if (self._isTypeOf(children[i], self.META.Constraints)){
                        //found constraints dir!
                        constraintsDirs.push(children[i]);
                    }
                }
                len = constraintsDirs.length;
                findConstraints(len, constraintsDirs);
            }
        });

    };

    ConstraintPlugin.prototype._loadStartingNodes = function(callback){
        var self = this,
        constraints = self.constraintNodes;

        self._nodeCache = {};
        self._nodesByConstraint = {};

        var load = function(name, node, fn){
            self.core.loadChildren(node,function(err,children){
                if(err){
                    fn(err);
                } else {
                    var j = children.length,
                    e = null; //error

                    if(j === 0){
                        fn(null);
                    }

                    var callbackIfDone = function(err){
                        e = e || err;
                        if(--j === 0){//callback only on last child
                            fn(e);
                        }
                    };

                    for(var i=0;i<children.length;i++){
                        self._nodesByConstraint[name].push(self.core.getPath(children[i]));
                        self._nodeCache[self.core.getPath(children[i])] = children[i];
                        load(name, children[i], callbackIfDone);
                    }
                }
            });
        };

        //Load the nodes and store them in their own nodeCache entry
        var loadConstraintNodes = function(constraints){
            var names = Object.keys(constraints),
                name,
                node,
                len = names.length,
                err = null,
                id,
                cb = function(e){
                    err = e || err;
                    len--;
                    if (len <= 0){
                        callback();
                    }
                };

            if (names.length){
                while (names.length){
                    name = names.pop();
                    self._nodesByConstraint[name] = [];

                    //Add the constraint node
                    node = self.constraintNodes[name];
                    id = self.core.getPath(node);
                    self._nodeCache[id] = node;  // May not need this FIXME

                    load(name, constraints[name], cb);
                }
            } else {
                cb();
            }
        };

        loadConstraintNodes(constraints);

    };

    ConstraintPlugin.prototype.main = function (callback) {
        var self = this,
            changedNode = this.activeNode,
            saveMessage = "Added constraints (";

        if (this.activeNode === null) {
            self.result.success = false;
            return callback('No node is specified. Please select a node and try again.',self.result);
        }

        self.config = self.getCurrentConfig();

        self._loadConstraintNodes(function(err){
            if (err){
                //finishing
                self.result.success = false;
                callback(err,self.result);
            } else {
                //executing the plugin
                self.logger.info("Finished loading children");
                err = self._runSync();

                //Create save message
                saveMessage += self.getConstraintNames().join(",") + ") to ";
                if (self.config.applyAll){
                    changedNode = self.core.getBase(changedNode);
                } 

                saveMessage += self.core.getAttribute(changedNode, 'name');

                if(err){
                    self.result.success = false;
                    callback(err,self.result);
                } else {
                    //Save the constraint changes
                    self.save(saveMessage, function(err){
                        self.testConstraintCode(function(){
                            //Download language files
                            if (self.config.download) {
                                self._saveOutput(function(err){
                                if(err){ 
                                    self.result.success = false;
                                    callback(err,self.result);
                                } else {
                                    if(callback){
                                        self.result.success = true;
                                        callback(null,self.result);
                                    }
                                }
                            });
                            } else if(callback) {
                                self.result.success = true;
                                callback(null,self.result);
                            }
                        });
                    });
                }
            }
        });
    };

    ConstraintPlugin.prototype._runSync = function(){
        var constraints = Object.keys(this.constraintNodes),
            options = {langSpec: ConstraintCodeMap},
            i = constraints.length,
            constNames,
            node = this.activeNode,
            code,
            err = null;

        this.constraints = {};

        if (this.config.applyAll){
            node = this.core.getBase(this.activeNode);
        }

        //delete old constraints
        constNames = this.core.getConstraintNames(node);
        for (var j = constNames.length-1; j >= 0; j--){
            this.core.delConstraint(node, constNames[j]);
        }

        while (i-- && !err){
            this.currentConstraint = constraints[i];
            options.nodes = this._nodesByConstraint[constraints[i]];
            code = this.createCode(options);

            this._createConstraintObject(constraints[i], code);
            this.core.setConstraint(node, constraints[i], this.constraints[constraints[i]]);
        }

        return err;
    };

    //Create constraint and store it 
    ConstraintPlugin.prototype._createConstraintObject = function(constraintName, code){

        this.constraints[constraintName] = { script: code,
            priority: 0,
            name: constraintName };
    };

    ConstraintPlugin.prototype.testConstraintCode = function(callback){
        var testEnvironment,
            constraints = Object.keys(this.constraints),
            name,
            len = constraints.length,
            cb = function(){
                if (--len <= 0){
                    console.log('\t\t*END TESTING*\n');
                    callback();
                }
            };

        if (this.config.testConstraints){
            testEnvironment = new TestEnvironment();
            //Test constraint code
            console.log('\t\t*TESTING*\n');
            while (constraints.length){
                name = constraints.pop();
                testEnvironment.runTest(name, this.constraints[name].script, cb);
            }
        } else {
            callback();
        }
    };

    ConstraintPlugin.prototype._saveOutput = function(callback){
        var self = this,
            filename = self.core.getAttribute(self.activeNode, 'name').replace(/ /g, "_"),
            artifact = self.blobClient.createArtifact(filename+"_constraint"),
            constraints = Object.keys(this.constraints),
            constraint,
            len = constraints.length,
            //Function to check if we have added all files
            checkIfShouldSaveAll = function(err){
                len--;
                if(err){
                    callback(err);
                } else if (len === 0){
                    self.blobClient.saveAllArtifacts(function(err, hashes) {
                        if (err) {
                            callback(err);
                        } else {
                            self.logger.info('Artifacts are saved here:');
                            self.logger.info(hashes);

                            // result add hashes
                            for (var j = 0; j < hashes.length; j += 1) {
                                self.result.addArtifact(hashes[j]);
                            }

                            self.result.setSuccess(true);
                            callback(null);
                        }
                    });
                }
            };

        //Save file for each language
        while (constraints.length){
            constraint = constraints.pop();
            artifact.addFile(filename + '_' + constraint + '.js',
                this.constraints[constraint].script, checkIfShouldSaveAll);
        }
    };

    return ConstraintPlugin;

});

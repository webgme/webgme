/**
 * Created by tkecskes on 8/4/2014.
 */
define(['addon/AddOnBase'],function(Base) {

    'use strict';
    var ConstraintAddOn = function (core, storage) {
        Base.call(this, core, storage);
    };

    ConstraintAddOn.prototype = Object.create(Base.prototype);
    ConstraintAddOn.prototype.constructor = ConstraintAddOn;

    ConstraintAddOn.prototype.root = null;
    ConstraintAddOn.prototype.contraints = {};
    ConstraintAddOn.prototype.contraintsStorage = {};

    ConstraintAddOn.prototype.getName = function () {
        return 'ConstraintAddOn';
    };

    ConstraintAddOn.prototype.update = function (root) {
        //TODO if we would like a continuous constraint checking we should use this function as well
        console.log('CAD update',this.core.getHash(root));
        this.root = root;
    };

    ConstraintAddOn.prototype.query = function (parameters, callback) {
        console.log('query CAD',parameters);
        //several query will be available but the first is the simple run constraint
        switch (parameters.querytype){
            case 'execute':
                this.executeConstraints(callback);
                break;
            case 'checkProject':
                break;
            case 'checkModel':
                break;
            case 'checkNode':
                break;
            default:
                callback('unknown command');
        }
    };

    ConstraintAddOn.prototype.start = function(parameters,callback){
        var self = this;
        Base.prototype.start.call(this,parameters,function(err){
            if(err){
                return callback(err);
            }
            self.project.getBranchHash(self.branchName,"#hack",function(err,commitHash){
                if(err){
                    return callback(err);
                }
                self.project.loadObject(commitHash,function(err,commit){
                    if(!err && commit){
                        self.commit = commit;
                        self.core.loadRoot(commit.root,function(err,root){
                            if(!err && root){
                                self.root = root;
                                callback(null);
                            } else {
                                callback(err || "cannot load initial root");
                            }
                        });
                    } else {
                        callback(err || "cannot find the starting commit");
                    }
                });
            });
        });
    };

    ConstraintAddOn.prototype.stop = function (callback) {
        callback(null);
    };

    ConstraintAddOn.prototype.checkProject = function(callback){

    };
    ConstraintAddOn.prototype.checkModel = function(root,callback){

    };
    ConstraintAddOn.prototype.checkNode = function(node,callback){
        var self = this,
            message = {},
            error = null,
            names = self.core.getConstraintNames(node),
            needed = names.length,
            i,
            check = function(name){
                self.executeContraint(node,name,function(err,msg){
                    error = error || err;
                    message[name] = msg;

                    if(--needed === 0){
                        callback(error,message);
                    }
                });
            };

        if(needed > 0){
            for(i=0;i<names.length;i++){
                check(names[i]);
            }
        } else {
            callback(error,message);
        }
    };
    ConstraintAddOn.prototype.loadNode = function(path,callback){
        this.core.loadByPath(this.root,path,callback);
    };
    ConstraintAddOn.prototype.executeContraint = function(node,name,callback){
        var self = this,
            script = self.core.getConstraint(node,name).script;

        if(!self.contraints[script]){
            var a="";
            eval("a = "+script);
            self.contraints[script] = a;
            self.contraintsStorage[script] = {};
        }
        self.contraints[script].call(self.contraintsStorage[script],self.core,node,callback);
    };
    ConstraintAddOn.prototype.executeConstraints = function(callback){
        var self = this,
            executeConstraint = function(node,name,cb){
                var guid = self.core.getGuid(node),
                    icb = function(err,msg){
                        error = error || err;
                        message[guid][name] = msg;
                        cb();
                    },
                    script = self.core.getConstraint(node,name).script;
                message[guid] = message[guid] || {};

                if(!self.contraints[script]){
                    var a="";
                    eval("a = "+script);
                    self.contraints[script] = a;
                    self.contraintsStorage[script] = {};
                    a.call(self.contraintsStorage[script],self.core,node,icb);
                }
                self.contraints[script].call(self.contraintsStorage[script],self.core,node,icb);
                //eval("("+self.core.getConstraint(node,name).script+")(self.core,node,icb)");
            },
            checkNode = function(node,cb){
                var names = self.core.getConstraintNames(node),
                    needed = names.length,
                    children = [],
                    countDown = function(){
                        if(--needed === 0){
                            checkChildren();
                        }
                    },
                    checkChildren = function(){
                        self.core.loadChildren(node,function(err,c){
                            if(!err && c){
                                children = c;
                                checkChild(0);
                            } else {
                                cb(err);
                            }
                        });
                    },
                    checkChild = function(index){
                        if(index<children.length){
                            checkNode(children[index],function(){
                                checkChild(index+1);
                            });
                        } else {
                            cb();
                        }
                    },
                    i;

                if(needed > 0){
                    for(i=0;i<names.length;i++){
                        executeConstraint(node,names[i],countDown);
                    }
                } else {
                    checkChildren();
                }
            },
            error = null,
            message = {};

            checkNode(self.root,function(){
                callback(error,message);
            });
    };

    return ConstraintAddOn;
});
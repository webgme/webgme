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

    ConstraintAddOn.prototype.getName = function () {
        return 'ConstraintAddOn';
    };

    ConstraintAddOn.prototype.update = function (root) {
        //TODO if we would like a continuous constraint checking we should use this function as well
        this.root = root;
    };

    ConstraintAddOn.prototype.query = function (parameters, callback) {
        //several query will be available but the first is the simple run constraint
        switch (parameters.command){
            case 'execute':
                this.executeConstraints(callback);
                break;
            default:
                callback('unknown command');
        }
    };

    ConstraintAddOn.prototype.stop = function (callback) {
        callback(null);
    };

    ConstraintAddOn.prototype.executeContraints = function(callback){
        var self = this,
            executeConstraint = function(node,name,cb){
                var guid = self.core.getGuid(node),
                    icb = function(err,msg){
                        error = error || err;
                        message[guid][name] = msg;
                        cb();
                };
                message[guid] = message[guid] || {};
                eval("("+self.core.getConstraint(node,name).script+")(self.core,node,icb)");
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
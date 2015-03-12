/**
 * Created by tkecskes on 7/29/2014.
 */
define(['addon/AddOnBase'],function(Base){

    'use strict';
    var TestAddOn = function(core,storage, gmeConfig){
        Base.call(this,core,storage, gmeConfig);
    };

    // Prototypal inheritance from PluginBase.
    TestAddOn.prototype = Object.create(Base.prototype);
    TestAddOn.prototype.constructor = TestAddOn;


    TestAddOn.prototype.getName = function(){
        return 'TestAddOn';
    };

    TestAddOn.prototype.update = function(root){
        console.log('TestAddOn',new Date().getTime(),'update',this.core.getGuid(root),this.core.getHash(root));
    };

    TestAddOn.prototype.query = function(parameters,callback){
        console.log('TestAddOn',new Date().getTime(), 'query', parameters);
        callback(null,parameters);
    };

    TestAddOn.prototype.stop = function(callback){
        console.log('TestAddOn',new Date().getTime(), 'stop');
        callback(null);
    };

    TestAddOn.prototype.start = function(parameters,callback){
        console.log('TestAddOn',new Date().getTime(), 'start');
        Base.prototype.start.call(this,parameters,callback);
    };
    return TestAddOn;
});
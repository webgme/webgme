/**
 * Created by tkecskes on 7/29/2014.
 */
define(['addon/AddOnBase'],function(Base){

    'use strict';
    var TestAddOn = function(core,storage){
        Base.call(this,core,storage);
    };

    // Prototypal inheritance from PluginBase.
    TestAddOn.prototype = Object.create(Base.prototype);
    TestAddOn.prototype.constructor = TestAddOn;


    TestAddOn.prototype.getName = function(){
        return 'TestAddOn';
    };

    TestAddOn.prototype.update = function(root){
        console.log('TestAddOn','update',this.core.getGuid(root),this.core.getHash(root));
    };

    return TestAddOn;
});
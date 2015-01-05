/**
 * kecso 2014
 */

define(['plugin/PluginConfig',
  'plugin/PluginBase'], function (PluginConfig, PluginBase) {
  'use strict';

  var BurstModificationCheck = function () {
    // Call base class' constructor.
    PluginBase.call(this);
  };

  // Prototypal inheritance from PluginBase.
  BurstModificationCheck.prototype = Object.create(PluginBase.prototype);
  BurstModificationCheck.prototype.constructor = BurstModificationCheck;

  BurstModificationCheck.prototype.getName = function () {
    return "Burst Modification Check";
  };

  BurstModificationCheck.prototype.getVersion = function () {
    return "0.4.2";
  };

  BurstModificationCheck.prototype.getConfigStructure = function () {
    return [
      {
        'name': 'finalAttributeValue',
        'displayName': 'Final value of name',
        'description': 'The final value of the node\'s name',
        'value': 'Something',
        'valueType': 'string',
        'readOnly': false
      },
      {
        'name': 'burstCount',
        'displayName': 'Burst Count',
        'description': 'how many burst modification we want to do',
        'value': 100,
        'valueType': 'number',
        'minValue': 0,
        'maxValue': 10000,
        'readOnly': false
      }
    ];
  };

  BurstModificationCheck.prototype.main = function (callback) {
    var self = this,
      currentConfig = self.getCurrentConfig(),
      i;

    for(i=0;i<currentConfig.burstCount;i++){
      self.core.setAttribute(self.activeNode,'name',currentConfig.finalAttributeValue+'_'+i);
      console.log('kecso0',i);
      self.save('saving'+i,function(err){console.log('kecso',i,err);});
    }
    self.core.setAttribute(self.activeNode,'name',currentConfig.finalAttributeValue);
    console.log('kecso0 final');
    self.save('saving final',function(err){
      self.result.setSuccess(true);
      console.log('kecso final',err);
      callback(null,self.result);
    });
  };

  return BurstModificationCheck;
});
define([
    'commonUtil'
],
    function(commonUtil){
        'use strict';
        var INSERTARR = commonUtil.insertIntoArray;
        var REMOVEARR = commonUtil.removeFromArray;

        var ClientMeta = function(client){
            var self = this,
                _rootid = "root",
                _myguid = null,
                _metafolderid = null,
                _myobjects = [];

            self.onOneEvent = function(eventarray){
                var needterritoryupdate = false;
                for(var i=0;i<eventarray.length;i++){
                    var event = eventarray[i];
                    switch (event.etype){
                        case "unload":
                            if(_myobjects.indexOf(event.eid) !== -1){
                                REMOVEARR(_myobjects,event.eid);
                            } else if(event.eid === _metafolderid){
                                    _metafolderid === null;
                                    needterritoryupdate = true;

                            } else if(event.eid === _rootid){
                                needterritoryupdate = true;
                            }
                            break;
                        case "load":
                                /*check where we should store the node*/
                            if(event.eid === _rootid || event.eid === _metafolderid){
                                //TODO currently nothing to do with them as they are not stored at all
                            } else {
                                var node = client.getNode(event.eid);
                                if(node.getParentId() === _metafolderid){
                                    INSERTARR(_myobjects,event.eid);
                                } else {
                                    if(_metafolderid === null && node.getAttribute("name") === "META" && node.getParentId() === _rootid){
                                        //currently that is the metafolder matching criteria
                                        _metafolderid = event.eid;
                                        needterritoryupdate = true;
                                    }
                                    // curently we are not interested in any other object
                                }
                            }
                            break;
                        default:
                            //currently we do not have to deal with any other object
                            break;
                    }
                }

                if(needterritoryupdate){
                    updateTerritory();
                }
            };

            var updateTerritory = function(){
                var territory = {"root":{children:1}};
                if(_metafolderid !== null){
                    territory[_metafolderid] = {children:1};
                }
                client.updateTerritory(_myguid,territory);
            };

            self.getValidChildrenTypes = function(cnode){
                //TODO we have to make really node based this reply by adding other METAlike functionality
                return _myobjects;
            };

            self.reLaunch = function(){
                _metafolderid = null;
                _myobjects = [];
                updateTerritory();
            };


            var _init = function(){
                _myguid = client.addUI(self,true);
                updateTerritory();
            };


            _init();
            /* not working here either :(
            return {
                onOneEvent : onOneEvent,
                getValidChildrenTypes :getValidChildrenTypes
            } */
        };
        return ClientMeta;
    });

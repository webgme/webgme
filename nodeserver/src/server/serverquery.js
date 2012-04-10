var ALIB = require('./arraylibrary.js');
Query = function(_queryid, _readstorage){
    var _objectlist = [];
    var _patterns = {};

    /*public funcitons*/
    /*
    the function refreshes the _objectlist
    and creates a proper querylist_item with ilist+mlist+dlist+id
     */
    this.updatePatterns = function(newpatterns){
        _patterns = newpatterns;
        return this.updateObjects([]);
    };
    /*
    the function checks what objects modified
    and it creates a proper querylist_item with ilist+mlist+dlist+id
     */
    this.updateObjects = function(modifiedobjects){
        var newlist = evaluatePatterns();
        var response = {};
        response.id = _queryid;
        response.ilist = [];
        response.dlist = [];
        response.mlist = [];

        /*
        the modified list is easy as we have to go through the modified objects
        and if the object is also in the newlist, we add to the modified list...
         */
        for(var i in modifiedobjects){
            if(newlist.indexOf(modifiedobjects[i]) !== -1){
                if ( _readstorage.get( modifiedobjects[i] ) ) {
                    ALIB.insert(response.mlist,modifiedobjects[i]);
                } else {
                    ALIB.insert(response.dlist,modifiedobjects[i]);
                }
            }
        }
        /*
        the deleted and inserted list is a bit more complex as we have to check
        the difference between the old and the new objectlist of the query
        we go through the newlist and if something was not in the old list
        we put into the ilist, otherwise we remove from the old list
        finally we go through the remaining elements in the old list
        which will then be exactly the dlist
         */
        for(var i in newlist){
            if(_objectlist.indexOf(newlist[i]) === -1){
                ALIB.insert(response.ilist,newlist[i]);
            }
            else{
                ALIB.remove(_objectlist,newlist[i]);
            }
        }

        for(var i in _objectlist){
            ALIB.insert(response.dlist,_objectlist[i]);
        }

        /*
        finally before the response we set the _objectlist to be
        up-to-date ;)
         */
        _objectlist = newlist;
        return response;
    }
    /*private functions*/
    var evaluatePatterns = function(){
        var objectlist = [];
        for(var i in _patterns){
            var pattern = _patterns[i];

            /*self*/
            if(pattern.self){
                ALIB.insert(objectlist,i);
            }
            /*children*/
            if(pattern.children){
                var object =  _readstorage.get(i);
                if(object !== undefined){
                    for(var j in object.children){
                        ALIB.insert(objectlist,object.children[j]);
                    }
                }
            }
            /*etc*/
        }
        return objectlist;
    };
};
/*
exports
 */
exports.Query = Query;
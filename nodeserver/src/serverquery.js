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
                    insertIntoArray(response.mlist,modifiedobjects[i]);
                } else {
                    insertIntoArray(response.dlist,modifiedobjects[i]);
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
                insertIntoArray(response.ilist,newlist[i]);
            }
            else{
                removeFromArray(_objectlist,newlist[i]);
            }
        }

        for(var i in _objectlist){
            insertIntoArray(response.dlist,_objectlist[i]);
        }

        /*
        finally before the response we set the _objectlist to be
        up-to-date ;)
         */
        _objectlist = newlist;
        return response;
    }
    /*private functions*/
    var insertIntoArray = function(list,item){
        if(list.indexOf(item) === -1){
            list.push(item);
        }
    };
    var removeFromArray = function(list,item){
      var position = list.indexOf(item);
        if(position !== -1){
            list.splice(position,1);
        }
    };
    var evaluatePatterns = function(){
        var objectlist = [];
        for(var i in _patterns){
            var pattern = _patterns[i];

            /*self*/
            if(pattern.self){
                insertIntoArray(objectlist,i);
            }
            /*children*/
            if(pattern.children){
                var object =  _readstorage.get(i);
                if(object !== undefined){
                    for(var j in object.children){
                        insertIntoArray(objectlist,object.children[j]);
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
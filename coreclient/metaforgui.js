define([], function () {
    "use strict";
    function metaForGui(META){

        function indexOfPathInRefObjArray(array,path){
            var index = 0;
            while(index < array.length){
                if(path === META.refObjectToPath(array[index])){
                    return index;
                }
                index++;
            }
            return -1;
        }
        function getChildrenMeta(path){
            //the returned object structure is : {"min":0,"max":0,"items":[{"id":path,"min":0,"max":0},...]}
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                var childrenMeta = {};
                childrenMeta.min = rawMeta.children.min;
                childrenMeta.max = rawMeta.children.max;
                childrenMeta.items = rawMeta.children.items;
                if(childrenMeta.items !== null){
                    for(var i=0;i<childrenMeta.items.length;i++){
                        var child = {};
                        child.id = META.refObjectToPath(childrenMeta.items[i]);
                        if(rawMeta.children.minItems){
                            child.min = rawMeta.children.minItems[i] === -1 ? undefined : rawMeta.children.minItems[i];
                        }
                        if(rawMeta.children.maxItems){
                            child.max = rawMeta.children.maxItems[i] === -1 ? undefined : rawMeta.children.maxItems[i];
                        }

                        childrenMeta.items[i] = child;
                    }
                }

                return childrenMeta;
            }
            return null;
        }

        function getChildrenMetaAttribute(path,attrName){
            var childrenMeta = getChildrenMeta(path);
            if(childrenMeta){
                return childrenMeta.attrName;
            }
            return null;
        }
        function setChildrenMetaAttribute(path,attrName,value){
            if(attrName !== "items"){
                var rawMeta = META.getMeta(path);
                rawMeta.children[attrName] = value;
                META.setMeta(path,rawMeta);
            }
        }

        function getValidChildrenItems(path){
            var childrenMeta = getChildrenMeta(path);
            if(childrenMeta){
                return childrenMeta.items;
            }
            return null;
        }

        function updateValidChildrenItem(path,newTypeObj){
            if(newTypeObj && newTypeObj.id){
                var rawMeta = META.getMeta(path);
                if(rawMeta){
                    if(rawMeta.children.minItems === null || rawMeta.children.minItems == undefined){
                        rawMeta.children.minItems = [];
                        for(var i=0;i<rawMeta.children.items.length;i++){
                            rawMeta.children.minItems.push(-1);
                        }
                    }
                    if(rawMeta.children.maxItems === null || rawMeta.children.maxItems == undefined){
                        rawMeta.children.maxItems = [];
                        for(var i=0;i<rawMeta.children.items.length;i++){
                            rawMeta.children.maxItems.push(-1);
                        }
                    }
                    var refObj = META.pathToRefObject(newTypeObj.id);
                    var index = indexOfPathInRefObjArray(rawMeta.children.items,newTypeObj.id);
                    if(index === -1){
                        index = rawMeta.children.items.length;
                        rawMeta.children.items.push(refObj);
                        rawMeta.children.minItems.push(-1);
                        rawMeta.children.maxItems.push(-1);
                    }
                    (newTypeObj.min === null || newTypeObj.min === undefined) ? rawMeta.children.minItems[index] = -1 : rawMeta.children.minItems[index] = newTypeObj.min;
                    (newTypeObj.max === null || newTypeObj.max === undefined) ? rawMeta.children.maxItems[index] = -1 : rawMeta.children.maxItems[index] = newTypeObj.max;

                    META.setMeta(path,rawMeta);
                }
            }
        }
        function removeValidChildrenItem(path,typeId){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                var refObj = META.pathToRefObject(typeId);
                var index = indexOfPathInRefObjArray(rawMeta.children.items,typeId);
                if(index !== -1){
                    rawMeta.children.items.splice(index,1);
                    if(rawMeta.children.minItems){
                        rawMeta.children.minItems.splice(index,1);
                    }
                    if(rawMeta.children.maxItems){
                        rawMeta.children.maxItems.splice(index,1);
                    }
                    META.setMeta(path,rawMeta);
                }
            }
        }

        function getAttributeSchema(path,name){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                if(rawMeta.attributes[name]){
                    return rawMeta.attributes[name];
                }
            }
            return null;
        }

        function setAttributeSchema(path,name,schema){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                //TODO check schema validity - but it is also viable to check it only during setMeta
                rawMeta.attributes[name] = schema;
                META.setMeta(path,rawMeta);
            }
        }

        function removeAttributeSchema(path,name){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                delete rawMeta.attributes[name];
                META.setMeta(path,rawMeta);
            }
        }

        function getPointerMeta(path,name){
            //the returned object structure is : {"min":0,"max":0,"items":[{"id":path,"min":0,"max":0},...]}
            var rawMeta = META.getMeta(path);
            if(rawMeta && rawMeta.pointers[name]){
                var pointerMeta = {};
                pointerMeta.min = rawMeta.pointers[name].min;
                pointerMeta.max = rawMeta.pointers[name].max;
                pointerMeta.items = rawMeta.pointers[name].items;
                if(pointerMeta.items !== null){
                    for(var i=0;i<pointerMeta.items.length;i++){
                        var child = {};
                        child.id = META.refObjectToPath(pointerMeta.items[i]);
                        if(rawMeta.pointers[name].minItems){
                            child.min = rawMeta.pointers[name].minItems[i] === -1 ? undefined : rawMeta.pointers[name].minItems[i];
                        }
                        if(rawMeta.pointers[name].maxItems){
                            child.max = rawMeta.pointers[name].maxItems[i] === -1 ? undefined : rawMeta.pointers[name].maxItems[i];
                        }
                        pointerMeta.items[i] = child;
                    }
                }
                return pointerMeta;
            }
            return null;
        }

        function getValidTargetItems(path,name){
            var pointerMeta = getPointerMeta(path,name);
            if(pointerMeta){
                return pointerMeta.items;
            }
            return null;
        }

        function updateValidTargetItem(path,name,targetObj){
            var rawMeta = META.getMeta(path);
            if(rawMeta && targetObj && targetObj.id){
                var pointer = rawMeta.pointers[name] || null;
                if(pointer === null){
                    rawMeta.pointers[name] = {"items":[],"minItems":[],"maxItems":[]};
                    pointer = rawMeta.pointers[name];
                }
                var refObj = META.pathToRefObject(targetObj.id);
                var index = indexOfPathInRefObjArray(pointer.items,targetObj.id);
                if(index === -1){
                    index = pointer.items.length;
                    pointer.items.push(refObj);
                    pointer.minItems.push(-1);
                    pointer.maxItems.push(-1);
                }

                (targetObj.min === null || targetObj.min === undefined) ? pointer.minItems[index] = -1 : pointer.minItems[index] = targetObj.min;
                (targetObj.max === null || targetObj.max === undefined) ? pointer.maxItems[index] = -1 : pointer.maxItems[index] = targetObj.max;

                META.setMeta(path,rawMeta);
            }
        }

        function removeValidTargetItem(path,name,targetId){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                var pointer = rawMeta.pointers[name] || null;
                if(pointer !== null){
                    var refObj = META.pathToRefObject(targetId);
                    var index = indexOfPathInRefObjArray(pointer.items,targetId);
                    if(index !== -1){
                        pointer.items.splice(index,1);
                        if(pointer.minItems){
                            pointer.minItems.splice(index,1);
                        }
                        if(pointer.maxItems){
                            pointer.maxItems.splice(index,1);
                        }
                        META.setMeta(path,rawMeta);
                    }
                }
            }
        }

        function deleteMetaPointer(path,name){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                delete rawMeta.pointers[name];
                META.setMeta(path,rawMeta);
            }
        }

        function setPointerMeta(path,name,meta){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                var pointer = rawMeta.pointers[name] || null;
                if(pointer === null){
                    rawMeta.pointers[name] = {"items":[],"minItems":[],"maxItems":[]};
                    pointer = rawMeta.pointers[name];
                }
                pointer.min = meta.min;
                pointer.max = meta.max;
                if(meta.items && meta.items.length){
                    for(var i=0;i<meta.items.length;i++){
                        pointer.items.push(META.pathToRefObject(meta.items[i].id));
                        pointer.minItems.push(meta.items[i].min || -1);
                        pointer.maxItems.push(meta.items[i].max || -1);
                    }
                }
                META.setMeta(path,rawMeta);
            }
        }

        function setChildrenMeta(path,name,meta){
            var rawMeta = META.getMeta(path);
            if(rawMeta){
                var children = rawMeta.children;

                children.min = meta.min;
                children.max = meta.max;
                if(meta.items && meta.items.length){
                    for(var i=0;i<meta.items.length;i++){
                        children.items.push(META.pathToRefObject(meta.items[i].id));
                        children.minItems.push(meta.items[i].min || -1);
                        children.maxItems.push(meta.items[i].max || -1);
                    }
                }
                META.setMeta(path,rawMeta);
            }
        }

        return {
            initialize: META.initialize,
            getMeta   : META.getMeta,
            setMeta   : META.setMeta,

            //containment
            getChildrenMeta         : getChildrenMeta,
            setChildrenMeta         : setChildrenMeta,
            getChildrenMetaAttribute: getChildrenMetaAttribute,
            setChildrenMetaAttribute: setChildrenMetaAttribute,
            getValidChildrenItems   : getValidChildrenItems,
            updateValidChildrenItem : updateValidChildrenItem,
            removeValidChildrenItem : removeValidChildrenItem,

            //attribute
            getAttributeSchema       : getAttributeSchema,
            setAttributeSchema       : setAttributeSchema,
            removeAttributeSchema    : removeAttributeSchema,
            getValidAttributeNames   : META.getValidAttributeNames,
            getOwnValidAttributeNames: META.getOwnValidAttributeNames,

            //pointer
            getPointerMeta       : getPointerMeta,
            setPointerMeta       : setPointerMeta,
            getValidTargetItems  : getValidTargetItems,
            updateValidTargetItem: updateValidTargetItem,
            removeValidTargetItem: removeValidTargetItem,
            deleteMetaPointer    : deleteMetaPointer,

            //misc functions from lower layer
            getOwnValidChildrenTypes: META.getOwnValidChildrenTypes,
            getOwnValidTargetTypes  : META.getOwnValidTargetTypes,
            isValidChild            : META.isValidChild,
            isValidTarget           : META.isValidTarget,
            isValidAttribute        : META.isValidAttribute,
            getValidChildrenTypes   : META.getValidChildrenTypes,
            getValidTargetTypes     : META.getValidTargetTypes,
            hasOwnMetaRules         : META.hasOwnMetaRules,
            filterValidTarget       : META.filterValidTarget,
            isTypeOf                : META.isTypeOf
        }
    }
    return metaForGui;
});


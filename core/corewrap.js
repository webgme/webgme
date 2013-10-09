/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(['core/tasync'], function (TASYNC) {
    "use strict";

    function WrappedCore(innerCore){
        var wrapped = {};
        for(var i in innerCore){
            wrapped[i] = innerCore[i];

        }

        //now the wrapping
        wrapped.persist = TASYNC.wrap(wrapped.persist);
        wrapped.loadByPath = TASYNC.wrap(wrapped.loadByPath);
        wrapped.loadRoot = TASYNC.wrap(wrapped.loadRoot);
        wrapped.loadChildren = TASYNC.wrap(wrapped.loadChildren);
        wrapped.loadPointer = TASYNC.wrap(wrapped.loadPointer);

        return wrapped;
    }
    return WrappedCore;
});


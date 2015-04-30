/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

//TODO this functionality will be refactored sooon
define([], function () {
    'use strict';

    function serverEventer(_clientGlobal) {
        var lastGuid = '',
            nextServerEvent = function (err, guid, parameters) {
                lastGuid = guid || lastGuid;
                if (!err && parameters) {
                    switch (parameters.type) {
                        case 'PROJECT_CREATED':
                            _clientGlobal.eDispatcher.dispatchEvent(_clientGlobal.events.SERVER_PROJECT_CREATED,
                                parameters.project);
                            break;
                        case 'PROJECT_DELETED':
                            _clientGlobal.eDispatcher.dispatchEvent(_clientGlobal.events.SERVER_PROJECT_DELETED,
                                parameters.project);
                            break;
                        case 'BRANCH_CREATED':
                            _clientGlobal.eDispatcher.dispatchEvent(_clientGlobal.events.SERVER_BRANCH_CREATED,
                                {
                                    project: parameters.project,
                                    branch: parameters.branch,
                                    commit: parameters.commit
                                });
                            break;
                        case 'BRANCH_DELETED':
                            _clientGlobal.eDispatcher.dispatchEvent(_clientGlobal.events.SERVER_BRANCH_DELETED,
                                {
                                    project: parameters.project,
                                    branch: parameters.branch
                                });
                            break;
                        case 'BRANCH_UPDATED':
                            _clientGlobal.eDispatcher.dispatchEvent(_clientGlobal.events.SERVER_BRANCH_UPDATED,
                                {
                                    project: parameters.project,
                                    branch: parameters.branch,
                                    commit: parameters.commit
                                });
                            break;
                    }
                    return _clientGlobal.db.getNextServerEvent(lastGuid, nextServerEvent);
                } else {
                    setTimeout(function () {
                        return _clientGlobal.db.getNextServerEvent(lastGuid, nextServerEvent);
                    }, 1000);
                }
            };
        _clientGlobal.db.getNextServerEvent(lastGuid, nextServerEvent);
    }
    
    return serverEventer;
});
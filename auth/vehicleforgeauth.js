/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(['https','http' ],function(HTTPS,HTTP){

    function VFAuth(_options){
        var _cachedUserData = {},
            _web = _options.https === true ? HTTPS : HTTP,
            _session = _options.session,
            _validity = _options.validity || 100000,
            _host = _options.host || /*'https://dev.vf.isis.vanderbilt.edu'*/'kecskes.isis.vanderbilt.edu',
            _port = _options.port || /*_options.https === true ? 443 : 80*/888,
            _path = _options.path || '/auth/webgme/get_user_info',
            _projectPath = _options.projectpath || '/auth/webgme/get_project_info',
            _idCookie = _options.cookie || 'isisforge';



        function clearData(id){
            if(_cachedUserData[id]){
                delete _cachedUserData[id];
            }
        }

        function authenticate(req,res,next){
            var VFID = req.cookies[_idCookie];
            getUser(VFID,function(err,data){
                if(!err && data){
                    req.session.udmId = VFID;
                    req.session.authenticated = true;
                    req.session.userType = 'vehicleForge';
                    next(null);
                } else {
                    res.redirect('/');
                }
            });
        }
        function authorize(sessionId,projectName,type,callback){
            _session.getSessionUser(sessionId,function(err,VFID){
                if(!err && VFID){
                    var projId = VFID+'/'+projectName;
                    if(type === 'create'){
                        if(_cachedUserData[VFID]){
                            callback(null,_cachedUserData[VFID].canCreateChild === true);
                        } else {
                            getUser(VFID,function(err,userData){
                                if(!err && userData){
                                    callback(null,userData.canCreate === true);
                                } else {
                                    err = err || 'no valid user permissions found';
                                    callback(err,false);
                                }
                            });
                        }
                    } else {
                        if(_cachedUserData[projId]){
                            callback(null,_cachedUserData[projId].permissions[type] === true);
                        } else {
                            getUserProject(VFID,projectName,function(err,userData){
                                if(!err && userData){
                                    callback(null,userData.permissions[type] === true);
                                } else {
                                    err = err || 'no valid user permissions found';
                                }
                            });
                        }
                    }

                } else {
                    err = err || 'not valid session';
                    callback(err,false);
                }
            });
        }
        function getUser(VFID,callback){
            _web.get({
                hostname: _host,
                port: _port,
                path: _path,
                headers: {
                    Cookie: "isisforge="+VFID
                }
            },function(res){
                var data = "";
                res.on('data',function(chunk){
                    console.log('more data');
                    data+=chunk;
                });
                res.on('end',function(){
                    console.log('finally',data);
                    data = JSON.parse(data);
                    _cachedUserData[VFID] = data;
                    callback(null,data);
                });
            }).on('error',function(err){
                    callback(err);
                });
        }
        function getUserProject(VFID,projectName,callback){
            _web.get({
                hostname: _host,
                port: _port,
                path: _projectPath+"?project_name="+projectName, //todo is this really have to be this way???
                headers: {
                    Cookie: "isisforge="+VFID
                }
            },function(res){
                var data = "";
                res.on('data',function(chunk){
                    data+=chunk
                });
                res.on('end',function(){
                    data = JSON.parse(data);
                    _cachedUserData[VFID+'/'+projectName] = data;
                    setTimeout(clearData,_validity,VFID+'/'+projectName);
                    callback(null,_cachedUserData[VFID+'/'+projectName]);
                })
            }).on('error',function(error){
                    callback(error);
                });
        }
        return {
            authenticate: authenticate,
            authorize: authorize
        }
    }

    return VFAuth;
});

define([
    'core/core',
    'core/setcore',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient',
    'storage/log',
    'storage/commit',
    'core/tasync',
    'util/common',
    'storage/mongo'
], function(
    Core,
    SetCore,
    Cache,
    Failsafe,
    Client,
    Log,
    Commit,
    TASYNC,
    Common,
    Mongo) {

    function Rest(_configuration){
        var _tokens = {};
        var _projects = {};
        /*var _database = new Commit(
                new Cache(
                    new Failsafe(
                        new Client(
                            {
                                host:_configuration.host,
                                port:_configuration.port
                            }
                        ),{}
                    ),{}
                ),{}
            );*/
        var _database = new Mongo({
            host: _configuration.ip,
            port: _configuration.port,
            database: _configuration.database
        });
        var token = function(){

            return {

            }
        };

        //available commands
        var getProjects = function(callback){
            _database.getProjectNames(callback);
        };




        var processURI = function(uri,callback){
            var uriArray = uri.split('/');
            var startindex = uriArray.indexOf('rest')+1;
            if(startindex>0 && startindex<uriArray.length){
                if(uriArray[startindex] === 'projects'){
                    getProjects(callback);
                } else {
                    callback('not implemented yet',null);
                }
            } else {
                callback('wrong URI',null);
            }
        };

        return {
            processURI : processURI,
            open: _database.openDatabase
        }
    }

    return Rest;
});

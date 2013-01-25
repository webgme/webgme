define([
    'commonUtil'
],
    function(commonUtil){
        var ClientTest = function(parameters){

            var self = this,
                print = false,
                patterns = {'root':{sets:true}},
                master = parameters.master,
                id = null;

            var setEventPrint = function(doprint){
                if(doprint !== null){
                    print = doprint;
                } else {
                    print = !print;
                }
            };

            var setTerritoryRoot = function(root){
                if(!patterns[root]){
                    patterns = {};
                    patterns[root] = {sets:true};
                    master.updateTerritory(id,patterns);
                }
            };

            var onOneEvent = function(events){
                if(print){
                    console.log("printitng test events");
                    console.dir(events);
                }
            };

            var init = function(){
                id = master.addUI({onOneEvent:onOneEvent},true);
                master.updateTerritory(id,patterns);
            };

            return {
                init : init,
                setEventPrint : setEventPrint,
                setTerritoryRoot : setTerritoryRoot,
                onOneEvent : onOneEvent
            }
        };

        return ClientTest;
    });

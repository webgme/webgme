define([],function(){
    var DeleteTestCtrl = function(project,div){
        /*set self style ;)*/
        div.style.backgroundColor="#0000ee";
        div.style.cssFloat = "left";
        div.style.height="30px";
        div.style.width="80px";

        /*pasteroot button*/
        var delbutton = document.createElement('input');
        delbutton.type = "button";
        delbutton.value = "deletetest";
        div.appendChild(delbutton);
        delbutton.onclick = function(){
            if(_nodes.length === 0){
                alert("no node info received yet or the root does not have any children left...");
            }
            else{
                var objpos = Math.floor(Math.random()*(_nodes.length));
                project.delNode(_nodes[objpos]);
            }
        };
        var _nodes = [];
        var query = project.createQuery();
        query.addUI(this);
        query.addPattern("root",{self:false,children:true});
        this.onRefresh = function(nodes){
            _nodes = [];
            for(var i in nodes){
                if(project.storage.get(nodes[i])!==undefined){
                    _nodes.push(nodes[i]);
                }
            }
        };
    };

    return DeleteTestCtrl;
});

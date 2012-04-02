define([],function(){
    var PasteRootCtrl = function(project,div){
        /*set self style ;)*/
        div.style.backgroundColor="#aaaaaa";
        div.style.cssFloat = "left";
        div.style.height="30px";
        div.style.width="80px";

        /*pasteroot button*/
        var pasterootbutton = document.createElement('input');
        pasterootbutton.type = "button";
        pasterootbutton.value = "pastetest";
        div.appendChild(pasterootbutton);
        pasterootbutton.onclick = function(){
            project.copyNode("root");
            project.pasteTo(null);
        }


    };

    return PasteRootCtrl;
});


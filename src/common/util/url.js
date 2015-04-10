define(function(){
    function decodeUrl(url){
        var start = url.indexOf('%');
        while(start>-1){
            var char = String.fromCharCode(parseInt(url.substr(start+1, 2), 16));
            url=url.replace(url.substr(start, 3),char);
            start = url.indexOf('%');
        }
        return url;
    }
    function parseCookie(cookie){
        cookie = decodeUrl(cookie);
        var parsed = {};
        var elements = cookie.split(/[;,] */);
        for(var i=0;i<elements.length;i++){
            var pair = elements[i].split('=');
            parsed[pair[0]] = pair[1];
        }
        return parsed;
    }
    function removeSpecialChars(text){
        text = text.replace(/%23/g,'#');
        text = text.replace(/%26/g,'&');
        text = text.replace(/%2f/g,'/');text = text.replace(/%2F/g,'/');
        return text;
    }
    function addSpecialChars(text){
        if(text === undefined){
            return text;
        }
        text = text.replace(/#/g,'%23');
        text = text.replace(/&/g,'%26');
        text = text.replace(/\//g,'%2F');
        return text;
    }
    function urlToRefObject(url){
        return {
            '$ref':url
        };
    }
    return {
        decodeUrl : decodeUrl,
        parseCookie : parseCookie,
        removeSpecialChars : removeSpecialChars,
        addSpecialChars : addSpecialChars,
        urlToRefObject : urlToRefObject
    };
});

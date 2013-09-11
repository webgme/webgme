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
    return {
        decodeUrl : decodeUrl,
        parseCookie : parseCookie
    }
});

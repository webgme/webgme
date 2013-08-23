define([], function(){

    function key(){
        function getPrivateKey(username){
            return localStorage.getItem("*webgme*"+username);
        }

        return {
            getPrivateKey : getPrivateKey
        }
    }
    return key;
});

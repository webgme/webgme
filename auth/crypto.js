define( [],function(){
    function encrypt(publicKey,data){
        return ""+publicKey+data;
    }
    function decrypt(privateKey,data){
        return data.substr(privateKey);
    }
    function sign(privateKey){
        var signature = "jatszos alairas";
        return data.substr(0,privateKey);
    }
    function checkSignature(publicKey,signature){
        if(publicKey.length === signature.length){
            return true
        }
        return false;
    }
    return {
        encrypt : encrypt,
        decrypt : decrypt,
        sign : sign,
        checkSignature : checkSignature
    }
});

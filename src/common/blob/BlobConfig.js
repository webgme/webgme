define([], function(){

    var BlobConfig = {
        hashMethod: 'sha1', // TODO: in the future we may switch to sha512
        hashRegex: new RegExp('^[0-9a-f]{40}$')
    };
    return BlobConfig;
});
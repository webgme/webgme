var WebGMEGlobal = WebGMEGlobal || {};
WebGMEGlobal.classes = WebGMEGlobal.classes || {};
define(['client','blob/BlobClient'],function(Client,BlobClient){
    WebGMEGlobal.classes.Client = Client;
    WebGMEGlobal.classes.BlobClient = BlobClient;
});

"use strict"; 

define(['logManager',
	    'util/assert',
        './AutoRouter.Utils',
        './AutoRouter.Constants'], function (logManager,
										        assert,
                                                UTILS,
                                                CONSTANTS) {

    var AutoRouterCustomPathData = function (_x, _y){
        this.version = CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION;
        this.aspect = 0;
        this.edgeIndex = 0;
        this.edgeCount = 0;
        this.type = CONSTANTS.CustomPointCustomization; //By default, it is a point
        this.horizontalOrVerticalEdge = false;
        this.x = _x;
        this.y = _y;
        this.l;
        this.d;
    };

    //Functions
    AutoRouterCustomPathData.prototype.assign = function(other){
        this.version					= other.version;
        this.aspect					    = other.aspect;
        this.edgeIndex					= other.edgeIndex;
        this.edgeCount					= other.edgeCount;
        this.type						= other.type;
        this.horizontalOrVerticalEdge	= other.horizontalOrVerticalEdge;
        this.x							= other.x;
        this.y							= other.y;
        this.l							= other.l;
        this.d							= other.d;

        return this;
    };

    AutoRouterCustomPathData.prototype.serialize = function(){
        var outChannel = (this.getVersion() + "," + this.getAspect() + "," + this.getEdgeIndex() + "," + this.getEdgeCount() + "," + this.getType());

        outChannel += ("," + this.isHorizontalOrVertical() ? 1 : 0 + "," + this.getX() + "," + this.getY() + "," + this.getLongDataCount());

        for(var i = 0; i < this.getLongDataCount(); i++) {
            outChannel += "," + this.l[i];
        }

        outChannel += "," + this.getDoubleDataCount();

        for(var i = 0; i < this.getDoubleDataCount(); i++) {
            outChannel += "," + this.d[i];
        }

        return outChannel;
    };

    AutoRouterCustomPathData.prototype.deserialize = function(inChannel){
        console.log("\tResulting token: " + inChannel);

        var curSubPos = inChannel.indexOf(","),
            versionStr = inChannel.substr(0, curSubPos);

        this.setVersion(Number(versionStr));
        assert(this.getVersion() === CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION, "AutoRouterCustomPathData.deserialize: getVersion() === CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION FAILED");

        if (this.getVersion() != CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION) {
            // TODO: Convert from older version to newer
            return false;
        }

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var aspectStr = inChannel.substr(0, curSubPos);
        this.setAspect(Number(aspectStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeIndexStr = inChannel.substr(0, curSubPos);
        this.setEdgeIndex(Number(edgeIndexStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeCountStr = inChannel.substr(0, curSubPos);
        this.setEdgeCount(Number(edgeCountStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeCustomTypeStr = inChannel.substr(0, curSubPos);
        this.setType(Number(edgeCustomTypeStr));

        console.log("\tAsp " + getAspect() + ", Ind " + getEdgeIndex() + ", Cnt " + getEdgeCount() + ", Typ " + getType());

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var directionStr = inChannel.substr(0, curSubPos);
        this.setHorizontalOrVertical(Number(directionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var positionStr = inChannel.substr(0, curSubPos);
        this.setX(Number(positionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        positionStr = inChannel.substr(0, curSubPos);
        this.setY(Number(positionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        positionStr = inChannel.substr(0, curSubPos);
        var numOfExtraLongData = Number(positionStr);
        assert(numOfExtraLongData >= 0 && numOfExtraLongData <= 4, "AutoRouterCustomPathData.deserialize: numOfExtraLongData >= 0 && numOfExtraLongData <= 4 FAILED");

        console.log(", Dir " + UTILS.isHorizontalOrVertical() + ", x " + getX() + ", y " + getY() + ", num " + numOfExtraLongData);

        for(var i = 0; i < numOfExtraLongData; i++) {
            positionStr = inChannel.substr(0, inChannel.indexOf(",", ++curSubPos));
            this.addLongData(Number(positionStr));
            console.log(", l" + i + " " +  l[i]);
        }

        positionStr = inChannel.substr(0, inChannel.indexOf(","));
        var numOfExtraDoubleData = Number(positionStr);
        assert(numOfExtraDoubleData >= 0 && numOfExtraDoubleData <= 8, "AutoRouterCustomPathData.deserialize: numOfExtraDoubleData >= 0 && numOfExtraDoubleData <= 8 FAILED");
        console.log(", num " + numOfExtraDoubleData);
        for(var i = 0; i < numOfExtraDoubleData; i++) {
            positionStr = inChannel.substr(0, inChannel.indexOf(",", ++curSubPos));
            this.addDoubleData(Number(positionStr));
            console.log(", l" + i + " " + d[i]);
        }
        return true;
    };

    AutoRouterCustomPathData.prototype.getVersion = function(){
        return this.version;
    };

    AutoRouterCustomPathData.prototype.setVersion = function(_version){
        this.version = _version;
    };

    AutoRouterCustomPathData.prototype.getAspect = function(){
        return this.aspect;
    };

    AutoRouterCustomPathData.prototype.setAspect = function(_aspect){
        this.aspect = _aspect;
    };

    AutoRouterCustomPathData.prototype.getEdgeIndex = function(){
        return this.edgeIndex;
    };

    AutoRouterCustomPathData.prototype.setEdgeIndex = function(index){
        this.edgeIndex = index;
    };

    AutoRouterCustomPathData.prototype.getEdgeCount = function(){
        return this.edgeCount;
    };

    AutoRouterCustomPathData.prototype.setEdgeCount = function(count){
        this.edgeCount = count;
    };

    AutoRouterCustomPathData.prototype.getType = function(){
        return this.type;
    };

    AutoRouterCustomPathData.prototype.setType = function(_type){
        this.type = _type;
    };

    AutoRouterCustomPathData.prototype.isHorizontalOrVertical = function(){
        return this.horizontalOrVerticalEdge;
    };

    AutoRouterCustomPathData.prototype.setHorizontalOrVertical = function(parity){
        this.horizontalOrVerticalEdge = parity;
    };

    AutoRouterCustomPathData.prototype.getX = function(){
        return this.x;
    };

    AutoRouterCustomPathData.prototype.setX = function(_x){
        this.x = _x;
    };

    AutoRouterCustomPathData.prototype.getY = function(){
        return this.y;
    };

    AutoRouterCustomPathData.prototype.setY = function(_y){
        this.y = _y;
    };

    AutoRouterCustomPathData.prototype.getLongDataCount = function(){
        return this.l.length;
    };

    AutoRouterCustomPathData.prototype.getLongData = function(index){
        return this.l[index];
    };

    AutoRouterCustomPathData.prototype.setLongData = function(index, dat){
        this.l[index] = dat;
    };

    AutoRouterCustomPathData.prototype.addLongData = function(dat){
        this.l.push(dat);
    };

    AutoRouterCustomPathData.prototype.getDoubleDataCount = function(){
        return this.d.length;
    };

    AutoRouterCustomPathData.prototype.getDoubleData = function(index){
        return this.d[index];
    };

    AutoRouterCustomPathData.prototype.setDoubleData = function(index, data){
        this.d[index] = data;
    };

    AutoRouterCustomPathData.prototype.addDoubleData = function(data){
        this.d.push(data);
    };

    return AutoRouterCustomPathData;
});


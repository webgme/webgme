"use strict"; 

define(['logManager',
	    'util/assert',
        './AutoRouter.Utils'
        './AutoRouter.Constants'], function (logManager,
										        assert,
                                                UTILS,
                                                CONSTANTS) {

    var AutoRouterCustomPathData = function (_x, _y){
        var version = CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION,
            aspect = 0,
            edgeIndex = 0,
            edgeCount = 0,
            type = CONSTANTS.CustomPointCustomization, //By default, it is a point
            horizontalOrVerticalEdge = false,
            x = _x,
            y = _y,
            l,
            d;
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

        outChannel += ("," + this.UTILS.isHorizontal OrVertical() ? 1 : 0 + "," + this.getX() + "," + this.getY() + "," + this.getLongDataCount());

        for(var i = 0; i < this.getLongDataCount(); i++) {
            outChannel += "," + l[i];
        }

        outChannel += "," + this.getDoubleDataCount();

        for(var i = 0; i < this.getDoubleDataCount(); i++) {
            outChannel += "," + d[i];
        }

        return outChannel;
    };

    AutoRouterCustomPathData.prototype.deserialize = function(inChannel){
        console.log("\tResulting token: " + inChannel);

        var curSubPos = inChannel.indexOf(","),
            versionStr = inChannel.substr(0, curSubPos);

        setVersion(Number(versionStr));
        assert(getVersion() === CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION, "AutoRouterCustomPathData.deserialize: getVersion() === CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION FAILED");

        if (getVersion() != CONSTANTS.CONNECTIONCUSTOMIZATIONDATAVERSION) {
            // TODO: Convert from older version to newer
            return false;
        }

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var aspectStr = inChannel.substr(0, curSubPos);
        setAspect(Number(aspectStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeIndexStr = inChannel.substr(0, curSubPos);
        setEdgeIndex(Number(edgeIndexStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeCountStr = inChannel.substr(0, curSubPos);
        setEdgeCount(Number(edgeCountStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeCustomTypeStr = inChannel.substr(0, curSubPos);
        setType(Number(edgeCustomTypeStr));

        console.log("\tAsp " + getAspect() + ", Ind " + getEdgeIndex() + ", Cnt " + getEdgeCount() + ", Typ " + getType());

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var directionStr = inChannel.substr(0, curSubPos);
        setHorizontalOrVertical(Number(directionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var positionStr = inChannel.substr(0, curSubPos);
        setX(Number(positionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        positionStr = inChannel.substr(0, curSubPos);
        setY(Number(positionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        positionStr = inChannel.substr(0, curSubPos);
        var numOfExtraLongData = Number(positionStr);
        assert(numOfExtraLongData >= 0 && numOfExtraLongData <= 4, "AutoRouterCustomPathData.deserialize: numOfExtraLongData >= 0 && numOfExtraLongData <= 4 FAILED");

        console.log(", Dir " + UTILS.isHorizontal OrVertical() + ", x " + getX() + ", y " + getY() + ", num " + numOfExtraLongData);

        for(var i = 0; i < numOfExtraLongData; i++) {
            positionStr = inChannel.substr(0, inChannel.indexOf(",", ++curSubPos));
            AddLongData(Number(positionStr));
            console.log(", l" + i + " " +  l[i])
        }

        positionStr = inChannel.substr(0, inChannel.indexOf(","));
        var numOfExtraDoubleData = Number(positionStr);
        assert(numOfExtraDoubleData >= 0 && numOfExtraDoubleData <= 8, "AutoRouterCustomPathData.deserialize: numOfExtraDoubleData >= 0 && numOfExtraDoubleData <= 8 FAILED");
        console.log(", num " + numOfExtraDoubleData);
        for(var i = 0; i < numOfExtraDoubleData; i++) {
            positionStr = inChannel.substr(0, inChannel.indexOf(",", ++curSubPos));
            AddDoubleData(Number(positionStr));
            console.log(", l" + i + " " + d[i]);
        }
        return true;
    };

    AutoRouterCustomPathData.prototype.getVersion = function(){
        return version;
    };

    AutoRouterCustomPathData.prototype.setVersion = function(_version){
        version = _version;
    };

    AutoRouterCustomPathData.prototype.getAspect = function(){
        return aspect;
    };

    AutoRouterCustomPathData.prototype.setAspect = function(_aspect){
        aspect = _aspect;
    };

    AutoRouterCustomPathData.prototype.getEdgeIndex = function(){
        return edgeIndex;
    };

    AutoRouterCustomPathData.prototype.setEdgeIndex = function(index){
        edgeIndex = index;
    };

    AutoRouterCustomPathData.prototype.getEdgeCount = function(){
        return edgeCount;
    };

    AutoRouterCustomPathData.prototype.setEdgeCount = function(count){
        edgeCount = count;
    };

    AutoRouterCustomPathData.prototype.getType = function(){
        return type;
    };

    AutoRouterCustomPathData.prototype.setType = function(_type){
        type = _type;
    };

    AutoRouterCustomPathData.prototype.UTILS.isHorizontal OrVertical = function(){
        return horizontalOrVerticalEdge;
    };

    AutoRouterCustomPathData.prototype.setHorizontalOrVertical = function(parity){
        horizontalOrVerticalEdge = parity;
    };

    AutoRouterCustomPathData.prototype.getX = function(){
        return x;
    };

    AutoRouterCustomPathData.prototype.setX = function(_x){
        x = _x;
    };

    AutoRouterCustomPathData.prototype.getY = function(){
        return y;
    };

    AutoRouterCustomPathData.prototype.setY = function(_y){
        y = _y;
    };

    AutoRouterCustomPathData.prototype.getLongDataCount = function(){
        return l.length;
    };

    AutoRouterCustomPathData.prototype.getLongData = function(index){
        return l[index];
    };

    AutoRouterCustomPathData.prototype.setLongData = function(index, dat){
        l[index] = dat;
    };

    AutoRouterCustomPathData.prototype.addLongData = function(dat){
        l.push(dat);
    };

    AutoRouterCustomPathData.prototype.getDoubleDataCount = function(){
        return d.length;
    };

    AutoRouterCustomPathData.prototype.getDoubleData = function(index){
        return d[index];
    };

    AutoRouterCustomPathData.prototype.setDoubleData = function(index, data){
        d[index] = data;
    };

    AutoRouterCustomPathData.prototype.addDoubleData = function(data){
        d.push(data);
    };

    return AutoRouterCustomPathData;
});


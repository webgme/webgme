var insertIntoArray = function(list,item){
    if (list instanceof Array){
        if(list.indexOf(item) === -1){
            list.push(item);
        }
    }
};
var removeFromArray = function(list,item){
    if (list instanceof Array){
        var position = list.indexOf(item);
        if(position !== -1){
            list.splice(position,1);
        }
    }
};

exports.insert = insertIntoArray;
exports.remove = removeFromArray;

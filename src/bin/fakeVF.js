var app = require('express')();

app.get('/',function(req,res){
    res.cookie('isisforge','teszt');
    res.redirect('http://kecskes.isis.vanderbilt.edu');
});
app.get('/auth/webgme/get_user_info',function(req,res){
    console.log(req.headers.cookie);
    res.write(JSON.stringify({
        fullName: 'vehicle forge user',
        username: 'vfuser',
        canCreate: false
    }));
    res.send();
});
app.get('/auth/webgme/get_project_info', function(req,res){
    console.log('kecso',req.url,req.query['project_name']);
    res.write(JSON.stringify({
        permissions:{
            read : true,
            write : false,
            'delete': false
        }
    }));
    res.send();
});
app.get('*',function(req,res){
    console.log('wattafuck',req.url);
    res.send(404);
});

app.listen(888);

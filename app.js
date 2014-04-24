var flash = require('connect-flash')
  , express = require('express')
  , passport = require('passport')
  , util = require('util')
  , http = require('http')
  , path = require('path')
  , logic = require('./logic.js')
  , LocalStrategy = require('passport-local').Strategy;

var app = express();  
  
// configure Express
app.configure(function() {
  app.set('port', process.env.PORT || 8888);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(flash());
  app.use(app.router);
  app.use(express.static(__dirname + '/../../public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
    'mongodb://localhost:3001/meteor';

var collections=["users","kbz","actions","members","pulses","proposals","statements","variables"];
var db = require("mongojs").connect(mongoUri,collections);
var ObjectId = db.ObjectId;

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});


app.get('/setkbz/:kbz_id', function(req, res){
  req.session.kbz_id = req.params.kbz_id;
  res.send(req.session);
});

app.get('/setmember/:member_id', function(req, res){
  req.session.member_id = req.params.member_id;
  res.send(req.session);
});

app.get('/:col/:skip/:limit', function(req, res) {
        eval("db."+req.params.col).find({},{},{"skip": req.params.skip,"limit": req.params.limit} ,function(err, ret) {
        if(err) return;
        var response = {return  : ret};
        res.json(response);
        });
});

app.post('/support', function(req, res){
  Support(ObjectId(req.session.kbz_id),req.params.support,ObjectId(req.session.member_id),function(err,ret) {
    if(err){
      res.send(500);
    }
    if(ret){
      res.send(ret);
    }
  });
}); 

app.post('/createproposal', function(req, res){
  CreateProposal(ObjectId(req.session.kbz_id),ObjectId(req.session.passport.user),req.params.title,req.params.body,req.params.type,req.params.uniq,function(err,ret) {
    if(err){
      res.send(500);
    }
    if(ret){
      res.send(ret);
    }
  });
});   

app.post('/createmember', function(req, res){
  CreateMember(ObjectId(req.session.kbz_id),ObjectId(req.session.passport.user) ,function(err,ret) {
    if(err){
      res.send(500);
    }
    if(ret){
      res.send(ret);
    }
  });
}); 

app.post('/createkbz', function(req, res){
  CreateKbz(0,function(err,ret) {
    if(err){
      res.send(err);
    }
    if(ret){
      res.send(ret);
    }
  });
}); 

/*app.listen(3000);*/
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


app.get('/deleteall', function(req, res) {
  db.kbz.remove();
  db.members.remove();
  db.pulses.remove();
  db.statements.remove();
  db.proposals.remove();
  res.json({delete : 'all'});
});

app.get('/runit', function(req, res) {
  logic.runit();
  res.json({runit:'lunch'});
});

app.get('/next', function(req, res) {
  logic.next();
  res.json({runit:'lunch'});
});

app.get('/test', function(req, res) {
  logic.test();
  res.json({test:'lunch'});
});

app.get('/vars', function(req, res) {
  res.json({vars:logic.vars});
});

app.get('/init', function(req, res) {
  logic.init();
  res.json({init:'lunch'});
});
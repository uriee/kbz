
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


var status = {
  "2" : "Draft",
  "3" : "Canceled",
  "5" : "Debate",
  "10" : "Assigned",
  "11" : "Failed",
  "15" :"On The Air",
  "20" : "Aprroved",
  "21" : "Rejected"
};

var types = {
  "1" : "Membership",
  "2" : "End Membership",
  "10" : "New Statement",
  "11" : "Cancel Statment",
  "12" : "Replace Statement",
  "20" : "Change Variables",
  "30" : "New Action",
  "31" : "Cancel Action",
  "32" : "Committee Member",
  "33" : "Out Of Committee"
};
//var dbUrl = "test";
//var collections=["test","actions","members","pulse","proposals","statements","variables"];
//var db = require("mongojs").connect(dbUrl,collections);
//var ObjectId = db.ObjectId;

var MongoClient = require('mongodb').MongoClient;

//Connect to the db
MongoClient.connect("mongodb://localhost:27017/test", function(err, db) {
if(err) { return console.dir(err); }


var ObjectId = db.ObjectId;
console.log(ObjectId);
var actions = db.collection('actions', {w:1}, function(err, collection) {});
console.log(db.collection('proposals', {w:1}, function(err, collection) {}));
var variables = db.collection('variables', {w:1}, function(err, collection) {});
var statements = db.collection('statements', {w:1}, function(err, collection) {});
var pulse = db.collection('pulse', {w:1}, function(err, collection) {});
var members = db.collection('members', {w:1}, function(err, collection) {});


//	GET Full collection 
app.get('/:col', function(req, res) {
        variables.find({},function(err, ret) {
        if(err) return;
        var response = {return  : ret};
        res.json(response);
        });
});

//	Get by ID
app.get('/:col/:id', function(req, res) {
        eval(req.params.col).findOne({"_id" : ObjectId(req.params.id)},function(err, ret) {
        if(err) return;
        var response = {return : ret};
        res.json(response);
        });
});

//	Get by Query
app.get('/:col/where/:where', function(req, res) {
//	console.log(req.params.where);
        eval(req.params.col).find(JSON.parse(req.params.where),function(err, ret) {
        if(err) return;
        var response = {return : ret};
        res.json(response);
        });
});


//Insert to collection
//On success, return the http response code 201
app.post('/:col', function(req, res){
  eval(req.params.col).insert(JSON.parse(req.body.content), function(err, doc){
    if(err) res.send("ERR: " + err);
    if(doc){
      res.send(201);
    }
  });
});

//Update by id
//On success, return the http response code 200
app.put('/:col', function(req, res){
console.log(req.body.id);
  eval(req.params.col).update({"_id":ObjectId(req.body.id)},{$set: JSON.parse(req.body.content)},{multi:true}, function(err){
    if(err) {
	res.send("ERR: " + err);
	return;
	}
      res.send(200);
  });
});

//Update by id - push,pull
//On success, return the http response code 200
app.put('/:col/:act/:type', function(req, res){
act = {};
val = {};
if(req.params.type == "num")  req.body.content = parseInt( req.body.content);
if(req.params.type == "oi")  req.body.content = ObjectId( req.body.content);
val[req.body.field+""] = req.body.content;
act["$"+req.params.act] = val;
console.log(act);
  eval(req.params.col).update({"_id":ObjectId(req.body.id)},act, function(err){
    if(err) {
        res.send("ERR: " + err);
        return;
        }
      res.send(200);
  });
});


//Update by query
//On success, return the http response code 200
app.put('/:col/where', function(req, res){
  eval(req.params.col).update(JSON.parse(req.body.where),{$set: JSON.parse(req.body.content)},{multi:true}, function(err){
    if(err) {
	res.send("ERR: " + err);
	return;
	}
    res.send(200);
  });
});


app.delete('/:col/:id', function(req,res) {
	eval(req.params.col).remove({"_id":ObjectId(req.params.id)},function(err,doc){
		if(err) {
			res.send("Error - "+err);
			return;
			}
		res.send(200);
	});
});


//get member_id,proposal_id,field,inc
app.put('/vote/vote', function(req, res){
member_id = ObjectId(req.body.member_id);
proposal_id = ObjectId( req.body.proposal_id);
inc = parseInt(req.body.inc);
pushmember = check = {};
pushmember[req.body.field+""] = member_id;
field = req.body.field+"";

check[req.body.field+""] = member_id;
 proposals.findAndModify ( {
   query: {
            _id: proposal_id,
            field : { $nin : member_id }
          },
   update: {
             $inc: { count : inc },
             $push: pushmember
           }
	},function(){return 0;});

});

uri = {};
app.get('/', routes.index);
app.get('/users', user.list);


}); //end connection to db

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


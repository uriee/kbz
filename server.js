var flash = require('connect-flash')
  , express = require('express')
  , passport = require('passport')
  , util = require('util')
  , http = require('http')
  , path = require('path')
  , LocalStrategy = require('passport-local').Strategy;

var app = express();  
  
// configure Express
app.configure(function() {
  app.set('port', process.env.PORT || 8888);
  app.use(express.favicon());
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
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


function findById(id, cb) {
  db.users.find({"_id":ObjectId(id)},function(err,ret){
    if(!err){
      console.log(err,ret);
      cb(null, ret[0]);
    }
    else {
      cb(new Error('User ' + id + ' does not exist'));
    }
  });
};

function findByUsername(username, cb) {
  db.users.find({"username":username},function(err,ret){
    if(!err){
      cb(null, ret[0]);
    }
    else {
      cb(null, null);
    }
  });
};


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    console.log("deserializeUser",err,user,done);
    done(err, user);
  });
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));



app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error') });
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  });
  
// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
/*
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/users/' + user.username);
    });
  })(req, res, next);
});
*/

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
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

app.get('/users', ensureAuthenticated, function(req, res){
  db.users.find({},function(err,ret){
    if(err) {
      throw err;
    }
    res.json(ret);
  });
});


/*app.listen(3000);*/
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

var status = {
  "1" : "Draft",
  "2" : "Canceled",
  "3" : "OutThere",
  "4" : "Assigned",
  "5" : "Failed",
  "6" : "On The Air",
  "7" : "Aprroved",
  "8" : "Rejected"
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

/*---FUNCTIONS------*/

var ChangeVariableValue = function(id,value,cb){
  db.kbz.update({"kbz_id":kbz_id,"variables.id" : id},{$set: {"value": value}}, function(err,ret){
    if(err) {
  cb("ERR ChangeVariableValue: " + err,0);
    }
  cb(err,ret);    
  });
};


var ReplaceStatment = function(id,statment,cb){
  db.statements.find({"_id":id},{"value" : 1},function(err, ret) {
        if(err) cb("ERR InsertMember1: " + err,0);
        db.statements.update({"_id":id},{$set: {"value": statment},$push : {"history" : ret[0].value}}, function(err,ret){
            if(err) cb("ERR InsertMember2: " + err,0);
            cb(err,ret)
              });
  });
}  

var IncPulseStatus = function(pulse_id,cb){
  db.pulse.update({"_id":pulse_id},{$inc: {"status": 1}}, function(err,ret){
    if(err) {
      cb("ERR ChangePulseStatus: " + err,0);
    }
  cb(err,ret);
  });
};

var  SetProposalStatus = function(proposal_id,value,cb){
  db.proposals.update({"_id":proposal_id},{$set: {"status": value}}, function(err,ret){
    if(err) {
      cb("ERR SetProposalStatus: " + err,0);
    }
    db.proposals.update({"_id":proposal_id},{$push : {"log" : {"log" : "Status changed to "+value}}} , function(err,ret){
      if(err){
        cb("SetProposalStatus2"+err,0);
      }
      cb(err,ret)
    });  
  });
};

var CreateStatement = function(kbz_id,value,cb){
  statement = {};
  statement.kbz_id = kbz_id;
  statement.statement = value;
  db.statements.insert(statement, function(err,ret){
    if(err) {
  cb("ERR InsertStatement: " + err,0);
    }
  cb(err,ret);    
  });
};


var CreateMember = function(kbz_id,user_id,cb){
  if (!kbz_id) cb("no kbz_id",0);
  Member = {};
  Member.kbz_id = kbz_id;
  Member.user = user_id;
  Member.actions = [];
  Member.status = 1;
  db.members.insert(Member, function(err,ret){
    if(err) {
     cb("ERR InsertMember: " + err,0);
    }
    db.users.update({"_id" : user_id},{$push : {kbz: {"kbz_id":kbz_id}}}, function(err,ret){
      console.log("m2:",err,ret);
     if(err) {
      cb("ERR InsertMember2: " + err,0);
      }
         cb(err,ret)    
    });  
  });
};

var CreateKbz = function(parent_id,cb){
  kbz = {};
  kbz.parent_id = parent_id;
  kbz.type = (parent_id ? 1 : 0);
  kbz.actions = [];
  kbz.status = 1;
  kbz.size = 0;
  kbz.pulsesupport = {members : [], count : 0};
  kbz.pulses = {Assigned: 0 ,OnTheAir : 0,Past :[]};
  db.variables.find({},function(err,ret){
    if(err){
      throw "Cannot Fetch Variables"+err;
    }
    kbz.variables = ret[0];  
    db.kbz.insert(kbz, function(err,newkbz){
      if(err) {
        throw "ERR InsertKbz1: " + err;
      }
      /*
        CreatePulse(newkbz[0]._id, function(err,pulse){ 
          if(err) {
            throw err;
            CreateMember(newkbz[0]._id,ObjectId(req.session.passport.user),function(err,pulse){ 
               if(err) {
                throw err;
                cb(err,newkbz);
               }
           });    
          }  
        });  
*/
    });
  });   

};

var CreateAction = function(parent_id,cb){
  CreateKbz(parent_id,function(err,newkbz){
      if(err) {throw err;
      }
        db.kbz.update({"_id":parent_id},{$push : {"actions" : {"id": ret[0]._id, "type" : 1}}}, function(err,ret){
          if(err) {
            throw "ERR InsertKbz2: " + err;
          }
           cb(err,newkbz);
        });  
      });
};

var addtoAction = function(action_id,user_id,cb){
  CreateMember(action_id,user_id,function(err,ret){
      if(err) {
        throw err;
      }
        db.users.update({"_id":user_id},{$push : {"actions" : {"id": action_id}}}, function(err,ret){
          if(err) {
            throw "ERR addtoAction: " + err;
          }
           cb(err,ret);
        });  
  });
};

var CreateProposal = function(kbz_id,initiator,title,body,type,uniq,cb){
  if (!kbz_id) throw "no kbz_id";
 
  Proposal = {};
  Proposal.kbz_id = kbz_id;
  Proposal.initiator = initiator;
  Proposal.title = title;
  Proposal.body = body;
  Proposal.status = "1";
  Proposal.type = type;
  Proposal.log = [];
  Proposal.age = 0;
  Proposal.support = {"count" : 0, "percent" : 0,"members" : []};
  Proposal.votes = {"pro" : 0,"against" : 0, "members" : []};
  
  /* Set the specific Proposal fields*/
  if (type=="1" || type=="2") {  
    Proposal.member = uniq.member;
  }
  if (type=="10" || type=="11") {
    Proposal.statement = uniq.statement;
  }
  if (type=="12") {
    Proposal.statement = uniq.statement
    Proposal.newstatement = uniq.newstatement;
    Proposal.oldstatement = uniq.oldstatement;
  }
  if (type=="20") {
    Proposal.variable = uniq.variable;
  }
    if (type=="30" || type=="31") {
    Proposal.actionname = uniq.actionname;
  }
    if (type=="31" || type=="32") {
    Proposal.member = uniq.member;
    Proposal.action = uniq.action;
  }

  db.proposals.insert(Proposal, function(err,ret){
    console.log(err,ret);
    if(err) {
  throw "ERR InsertProposal: " + err;
    }
  cb(err,ret);    
  });
};  

var RemoveMember = function(kbz_id,member_id,cb){
  db.members.update({"_id":member_id},{$set: {"status": 0}}, function(err,ret){
    if(err) {
  throw "ERR RemoveMember1: " + err;
    }
    db.kbz.update({"kbz_id" : kbz_id},{$pull : { members :{members_id : member_id}}},function(err,ret){
    if(err) {
     throw "ERR RemoveMember1: " + err;
      }
      cb(err,ret);
    });
  });
};

var AssignetoPulse = function(proposal_id,pulse_id,cb){
  SetProposalStatus(proposal_id,"4",function(err,ret){
    if(err){
      throw err;
    } 
    db.pulses.update({"_id" : pulse_id},{$push : {"Assigned" : {"proposal_id" : proposal_id}}}, function(err,ret){
      if(err){
        throw err;
      }
      cb(err,ret);
    });
  });    
}

var GetProposal = function(proposal_id,cb) {
  db.proposals.find({"_id":proposal_id},function(err,ret){
    if(err) {
      cb("GetProposal"+err,0);
    }
    cb(err,ret);
  });
}

var Support = function(kbz_id,proposal_id,member_id,cb) {
  db.proposals.update({"_id" : proposal_id , "support.members" : {$nin : [member_id]}},{$inc : {"support.count" : 1},$push :{"support.members": member_id}},function(err,ret){
    if(err) {
      cb("support1:"+err,0);
    }
    if (ret){
      db.kbz.find({"_id":kbz_id},{"variables.ProposalSupport.value" : 1,"size" : 1,"pulses.Assigned" : 1} , function(err,ret)  {
        if(err){
          cb("support2:"+err,0);
        }
        var pulse_id = ret[0].pulses.Assigned;
        var ProposalSupport = ret[0].variables.ProposalSupport.value;
        var size = ret[0].size;
        db.proposals.find({"_id":proposal_id},{"support.count" : 1,"status" : 1},function(err,ret){
          if(err){
            b("support3:"+err,0);
          }
          var current = ret[0].support.count;
          var status = ret[0].status;
          if(status == "3" && (current/size*100 >= ProposalSupport)) {
              AssignetoPulse(proposal_id,pulse_id,cb);
          }
          else cb(err,ret);
        });  
      });
    }  
    else{
        db.proposals.update({"_id" : proposal_id, "support.members" : {$in : [member_id]}},{$inc : {"support.count" : -1},$pull :{"support.members": member_id}},function(err,ret){
          if(err) {
            throw err;
          }
        cb(err,ret);
        });
    }
  });  
}

var PulseSupport = function(kbz_id,member_id,cb) {
  db.kbz.update({"_id" : kbz_id , "pulsesupport.members" : {$nin : [member_id]}},{$inc : {"pulsesupport.count" : 1},$push :{"pulsesupport.members": member_id}},function(err,ret){
    if(err) {
      cb("Pulsesupport1:"+err,0);
    }
    if (ret){
      var current = ret[0].support.count;
      db.kbz.find({"_id":kbz_id},{"variables.PulseSupport.value" : 1,"size" : 1} , function(err,ret)  {
        if(err){
          cb("Pulsesupport2:"+err,0);
        }
        var PulseSupport = ret[0].variables.PulseSupport.value;
        var size = ret[0].size;
        if(current/size*100 >= PulseSupport) {
              Pulse(kbz_id,cb);
          }
          else cb(err,ret);
        });  
    }  
    else{
        db.kbz.update({"_id" : kbz_id,"pulsesupport.members" : {$in : [member_id]}},{$inc : {"pulsesupport.count" : -1},$pull :{"pulsesupport.members": member_id}},function(err,ret){
          if(err) {
            cb("pulsesupport4:"+err,0);
          }
        cb(err,ret);
        });
    }
  });  
}

var Vote = function(proposal_id,member_id,vote,cb) {
  var pro = 0;
  var against = 0;
  if(vote == 1) {
    pro = 1;
  }
  else{
    against = 1;
  }
  db.proposals.update({"_id" : proposal_id , "votes.members" : {$nin : [member_id]}},{$inc : {"votes.pro" : pro},$inc : {"votes.against" : against},$push :{"votes.members": member_id}},function(err,ret){
    if(err) {
      cb("Vote1:"+err,0);
    }
    if(!ret){
      pro = pro * -1;
      against = against * -1;
      db.proposals.update({"_id" : proposal_id,"votes.members" : {$in : [member_id]}},{$inc : {"votes.pro" : pro},$inc : {"votes.against" : against},$pull :{"votes.members": member_id}},function(err,ret){
        if(err) {
          throw err;
        }
      cb(err,ret);
      });
    }
  });  
}


var Pulse = function(kbz_id,cb){
  db.kbz.findOne({"_id" : kbz_id },function(err,ret){
    if(err) {
      cb("Pulse: could not find kbz:"+err,0);
    }
    var kbz = ret[0];
    db.pulses.findOne({"_id" : ObjectId(kbz.pulses.OnTheAir)},function(err,ret){
      if(err){
        cb("pulse: could not find OnTheAir", 0);
      }
      var OnTheAir = ret[0].OnTheAir;
      for(var proposal_id in OnTheAir) {
        db.proposals.findOne({"_id" : ObjectId(proposal_id)},function(err,ret){
          proposal = ret[0];
          t = proposal.type;
          type = types.t
          var variable = eval("kbz.variables."+type);
          if(proposal.pro.count/(proposal.against.count + proposal.pro.count) >= variable.value){ /*proposal had passed*/
            ExecuteVertic(proposal,function(err,ret){
              if (err) {
                cb("Pulse: Proposal id:"+proposal_id+" failed to resolve", 0);
                return;
              }
              if(ret){
                proposal.status = "7"; /* Approved */
                db.proposals.save(proposal);
                OnTheAir.Approved.push(proposal_id);
              }
            });
          }
          else { /*proposal had been rejected*/
            proposal.status = "8"; /* rejected */
            db.proposal.save(proposal);
            OnTheAir.Rejected.push(proposal_id);
          }
        });
      } /*resolved all proposals*/
      OnTheAir.OnTheAir = [];
      OnTheAir.status = 3;
      db.pulses.save(OnTheAir);
    });
    db.pulses.findOne({"_id" : ObjectId(kbz.pulses.OnTheAir)},function(err,ret){
      if(err){
        cb("pulse: could not find Pulse Assigned", 0);
      }
      var Assigned = ret[0].Assigned;
      for(var proposal_id in Assigned) {
        db.proposals.update({"_id" : proposal_id},{$set : {"status" : "6"}},function(err,ret){
          if(err){
            cb("coul'nt update proposal:"+proposal_id+" status", 0);
          }
        });
      }
      Assigned.status = 2;
      Assigned.Assigned = [];
      db.pulses.save(Assigned);
      kbz.pulses.OnTheAir = Assigned._id
      db.kbz.save(kbz) ;
    });
    CreatePulse(kbz_id,function(err,ret){
      if(err){
        cb("could not create Pulse for kbz"+kbz_id, 0);
      }
    });
    db.proposal.update({"kbz_id" : kbz_id, "status" : "3", "age" : {$gt : kbz.variables.MaxAge}},{$set :{"status": "5"}},function(err,ret){
      if(err){
        cb("could not update status failed to proposals", 0);
      }
      db.proposal.update({"kbz_id" : kbz_id, status : "3"},{$inc : {"age" :1}},function(err,ret){
        if(err){
          cd("could not inc age of OutThere", 0);
        }
      });      
    })
  });  
}


var ExecuteVertic = function(proposal,cb){
  if(proposal.type == "1"){
    db.memebers.update({"_id" : ObjectId(proposal.member_id)},{$set : {"status" : 2}},function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    });
  }
  if(proposal.type == "2"){
    db.memebers.update({"_id" : ObjectId(proposal.member_id)},{$set : {"status" : 3}},function(err,ret){
      if(ret){
        cb(err,ret);
        /*send email to former member*/
        return;
      }
    });  
  } 
  if(proposal.type == "10"){
    db.statements.update({"_id" : ObjectId(proposal.statement_id)},{$set : {"status" : 2}},function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    });  
  }  
  if(proposal.type == "11"){
    db.statements.update({"_id" : ObjectId(proposal.statement_id)},{$set : {"status" : 3}}, function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    }); 
  }  
  if(proposal.type == "12"){
    db.statements.update({"_id" : ObjectId(proposal.statement_id)},{$push : {"history" : proposal.oldstatement},$set : {"statement" : proposal.newstatement},$inc : {"status":1}}, function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    }); 
  }  
  if(proposal.type == "20"){
    db.statements.update({"_id" : ObjectId(proposal.variable_id)},{$push : {"history" : proposal.oldvalue},$set : {"value" : proposal.value},$inc : {"status":1}}, function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    });
  }   
  if(proposal.type == "30"){
    CreateAction(proposal.kbz_id, function(err,ret){
      if(ret){
        cb(err,ret);
        action = ret[0];
        db.kbz.update({"_id" : action._id},{$set : {"variables.Name.value" : proposal.title}},function(err,ret){});
        return;
      }
    });              
  }  
  if(proposal.type == "31"){
    db.kbz.update({"_id" : ObjectId(proposal.action_id)},{$inc : {"status" : 1},}, function(err,ret){
      if(ret){
        db.kbz.update({"_id" : ObjectId(proposal.kbz_id)},{$pull : {"actions" : ObjectId(proposal.action_id)}},function(err,ret){
          cb(err,ret);
          return;
        });
      }
    }); 
  }  
  if(proposal.type == "32"){
    db.members.update({"_id" : ObjectId(proposal.member_id)},{$set : {"status" : 2}}, function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    });
  }  
  if(proposal.type == "33"){
    db.members.update({"_id" : ObjectId(proposal.member_id)},{$set : {"status" : 3}}, function(err,ret){
      if(ret){
        cb(err,ret);
        return;
      }
    });                      
  }
  cb(1,0);
}  


var CreatePulse = function(kbz_id,cb){
  pulse = {};
  pulse.kbz_id = kbz_id;
  pulse.status = 1;
  pulse.Assigned = [];
  pulse.OnTheAir = [];
  pulse.Accepted = [];
  pulse.Rejected = [];
  db.pulses.insert(pulse, function(err,ret){
    if(err) {
  throw "ERR InsertPulse: " + err;
    }
    db.kbz.update({"_id":kbz_id},{$set : {"pulses.Assigned" :ObjectId(ret[0]._id)}},function(err,ret){
      if(err){
        cb(1,0);
      }
      cb(err,ret);
    });
  });
};




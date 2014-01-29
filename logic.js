var mongo = require('mongodb'),
    mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/kbzmain',
    dbUrl = "kbzmain",
    collections=["users","kbz","actions","members","pulses","proposals","statements","variables"],
    db = require("mongojs").connect(mongoUri,collections),
    ObjectId = db.ObjectId,
    Q = require("q"),
    status = {
    "1" : "Draft",
    "2" : "Canceled",
    "3" : "OutThere",
    "4" : "Assigned",
    "5" : "Failed",
    "6" : "On The Air",
    "7" : "Aprroved",
    "8" : "Rejected"
    },
    types = {
    "ME" : "Membership",
    "EM" : "End Membership",
    "NS" : "New Statement",
    "CS" : "Cancel Statment",
    "RS" : "Replace Statement",
    "CV" : "Change Variable",
    "NA" : "New Action",
    "CA" : "Cancel Action",
    "CM" : "Committee Member",
    "OC" : "Out Of Committee"
    };
// sudo mongod --profile=1 --slowms=1 --fork --logpath /var/log/mongodb/mongodb.log --logappend
//db.setProfilingLevel(2,0,1)
/*-------Declare Promisses------*/
exports.test = function(){
db_findOne('kbz',ObjectId("52e49f04f3ac8acf1d000001"),{})
  .then(function(kbz,err) {
    db_findOne('members',kbz.memberships[0],{})
  .then(console.log,console.error);
    });
};

var db_find = function(collection,where,select){
  if (collections.indexOf(collection) == -1) {throw "not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
  col.find(where,function(err,data) {
    if(err) d.reject(err);
    else d.resolve(data);
  });
  return d.promise;
};

var db_findOne = function(collection,id,select){
  if(collections.indexOf(collection) == -1) {throw "not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
  col.findOne({'_id' : id},select,function(err,data) {
        console.log("inthecallback:",data);
    if(err) d.reject(err);
    else d.resolve(data);
  });
  return d.promise;
};

var db_updateOne = function(collection,id,update){
  if(collections.indexOf(collection) == -1) {throw "not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
//console.log("IN db_updateOne:",JSON.stringify(id),JSON.stringify(update));
  col.update({'_id' : id},update,{multi : false},function(err,data,a,b) {
    if(err) d.reject(err);
    else d.resolve(data);
  });
  return d.promise;
};

var db_insert = function(collection,obj){
  if(collections.indexOf(collection) == -1) {throw "not a valid collection";}
  var d = Q.defer(),
      col = eval("db."+collection);
  col.insert(obj,function(err,data) {
    if(err) d.reject(err);
    else d.resolve(data);
  });
  return d.promise;
};

var db_save = function(collection,obj){
  if(collections.indexOf(collection) == -1) {throw "not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
  col.save(obj,function(err,data) {
    if(err) d.reject(err);
    else d.resolve(data);
  });
  return d.promise;
};

var Console = function(data){
  console.log("data:",data);
  var d = Q.defer();
  if(err) d.reject(err);
  else d.resolve(data);
  return d.promise;
};

var Error = function(err){
  console.error("err",err);
  var d = Q.defer();
  if(err) d.reject(err);
  else d.resolve(data);
  return d.promise;
};
/*---FUNCTIONS------*/

var CreateStatement = function(kbz_id,value,proposal_id){
  var d = Q.defer(),
      statement = {};
  statement.kbz_id = kbz_id;
  statement.statement = value;
  statement.status = 1;
  statement.proposals = [proposal_id];
  db_insert('statements',statement)
  .then(function(data,err){
    if(err) d.reject(err);
    else d.resolve(data);
    });
  return d.promise;
};

var CreateMember = function(kbz_id,user_id,proposal_id){
  if (!kbz_id) throw "no kbz_id";
  var d = Q.defer(),
      Member = {};
  Member.kbz_id = kbz_id;
  Member.parent = user_id;
  Member.user_id = user_id;
  Member.proposals = (proposal_id ? [proposal_id] : []);
  Member.actions = {live : [] , past : []};
  Member.status = 1;
  Member.type = 1;
  db_insert('members',Member)
  .then(function(member,err){
    member = member[0];
    if (!member) throw ("no member");
    db_updateOne('users',member.user_id,{$push : {'memberships': member._id}})
    .then(db_updateOne('kbz', kbz_id,{$inc : {size : 1},$push : {'memberships' : member._id}}))
    .then(function(data,err){
      if(err) d.reject(err);
      else d.resolve(member);
    });
  });
  return d.promise;
};

var CreateCommitteeMember = function(action_id,member_id,proposal_id){
  if (!action_id) {}//throw "no action_id";
  console.log("in CreateCommitteeMember");
    var d = Q.defer(),
      Member = {};
  Member.kbz_id = action_id;
  Member.parent = member_id;
  Member.actions = {live : [] , past : []};
  Member.status = 1;
  Member.type = 2;
  Member.proposals = [proposal_id];
  db_insert('members',Member)
  .then(Console)
  .then(function(member,err){
    member = member[0];
    console.log("in CreateCommitteeMember",member);
    if (!member) throw ("CreateCommitteeMember: no member");
    db_updateOne('members',member_id,{$push : {"actions.live" : {"member_id" : member._id, "action_id" : action_id}}})
    .then(db_updateOne('kbz',action_id,{$inc : {size : 1},$push : {"memberships" : member[0]._id}}))
    .then(function(data,err){
      if(err) d.reject(err);
      else d.resolve(data);
    });
  });
  return d.promise;
};

var oldCreateKbz = function(parent_id,user_id,proposal_id,cb){
  kbz = {};
  kbz.parent_id = parent_id;
  kbz.type = (parent_id ? 1 : 0);
  kbz.actions = {live : [] , past : []};
  kbz.status = 1;
  kbz.size = 0;
  kbz.pulsesupport = {members : [], count : 0};
  kbz.pulses = {Assigned: 0 ,OnTheAir : 0,Past :[]};
  kbz.proposals = (proposal_id ? [proposal_id] : []);
  kbz.memberships = [];
  db.variables.find({},function(err,ret){
    if(err){
      cb(err,0);
    }
    kbz.variables = ret[0];
    db.kbz.insert(kbz, function(err,newkbz){
      if(err) {
        cb(err,0);
      }
      CreatePulse(newkbz[0]._id, function(err,pulse){
        if(err) {
          cb(err,0);
        }
        if(kbz.type === 0) {
          CreateMember(newkbz[0]._id,user_id,0,function(err,member){
           if(err) {
             cb(err,0);
           }
           newkbz[0].member = member._id;
          });
        }
      cb(err,newkbz[0]);
      });
    });
  });
};

var CreateKbz = function(parent_id,user_id,proposal_id,cb){
  kbz = {};
  kbz.parent_id = parent_id;
  kbz.type = (parent_id ? 1 : 0);
  kbz.actions = {live : [] , past : []};
  kbz.status = 1;
  kbz.size = 0;
  kbz.pulsesupport = {members : [], count : 0};
  kbz.pulses = {Assigned: [] ,OnTheAir : [],Past :[]};
  kbz.proposals = (proposal_id ? [proposal_id] : []);
  kbz.memberships = [];
  db.variables.find({},function(err,ret){
    if(err){
      cb(err,0);
    }
    kbz.variables = ret[0];
    db.kbz.insert(kbz, function(err,newkbz){
      if(err) {
        cb(err,0);
      }
      CreatePulse(newkbz[0]._id, function(err,pulse){
        if(err) {
          cb(err,0);
        }
        if(kbz.type === 0) {
          CreateMember(newkbz[0]._id,user_id,0)
          .then(function(data,err){
            newkbz[0].member = data._id;
          });
  //        CreateMember(newkbz[0]._id,user_id,0,function(err,member){
    //       if(err) {
    //         cb(err,0);
    //       }
     //      newkbz[0].member = member._id;
    //      });
        }
      cb(err,newkbz[0]);
      });
    });
  });
};

var CreateAction = function(parent_id,proposal_id,cb){
  CreateKbz(parent_id,0,proposal_id,function(err,newkbz){
      if(err) {cb(err,0);
      }
        db.kbz.update({"_id":parent_id},{$push : {"actions.live" : newkbz._id}}, function(err,ret){
          if(err) {
            cb(err,0);
          }
           cb(err,newkbz);
        });
      });
};

var CreateProposal = function(kbz_id,initiator,title,body,type,uniq,cb){
 // if (!kbz_id) throw "no kbz_id";
  Proposal = {};
  Proposal.kbz_id = kbz_id;
  Proposal.initiator = initiator;
  Proposal.title = title;
  Proposal.body = body;
  Proposal.status = "3";
  Proposal.type = type;
  Proposal.log = [];
  Proposal.age = 0;
  Proposal.support = {"count" : 0, "percent" : 0,"members" : []};
  Proposal.votes = {"pro" : 0,"against" : 0, "members" : []};
  
  /* Set the specific Proposal fields*/
  if (type=="ME" || type=="EM") {
    Proposal.member_id = uniq.member_id;
  }
  if (type=="CS") {
    Proposal.statement_id = uniq.statement_id;
  }
  if (type=="NS") {
    Proposal.statement = uniq.statement;
  }
  if (type=="RS") {
    Proposal.statement_id = uniq.statement_id;
    Proposal.newstatement = uniq.newstatement;
    Proposal.oldstatement = uniq.oldstatement;
  }
  if (type=="CV") {
    Proposal.variable = uniq.variable;
    Proposal.newvalue = uniq.newvalue;
  }
    if (type=="NA") {
    Proposal.actionname = uniq.actionname;
  }
    if (type=="CA") {
    Proposal.action_id = uniq.action_id;
  }
    if (type=="CM" || type=="OC") {
    Proposal.member_id = uniq.member_id;
    Proposal.action_id = uniq.action_id;
  }

  db.proposals.insert(Proposal, function(err,proposal){
    if(err) {
      cb(err,0);
    }
    proposal = proposal[0];
   //initiator
    db.members.update({"_id" : proposal.initiator},{$push : {"myproposals" : proposal._id}},function(err,ret){});
    //ReWrite
    if (proposal.member_id ){
      db.members.update({"_id" :proposal.member_id},{$push : {"proposals" : proposal._id}},function(err,ret){});
    }

    if (proposal.statement_id) {
      db.statements.update({"_id" :proposal.statement_id},{$push : {"proposals" : proposal._id }},function(err,ret){});
    }

    if (proposal.variable) {
      key = "variables."+proposal.variable+".proposals";
      variable = {};
      variable[key] = proposal._id;
      db.kbz.update({"_id" :proposal.kbz_id},{$push : variable},function(err,ret){});
    }

    if (proposal.action_id) {
      db.kbz.update({"_id" :proposal.action_id},{$push : {"proposals" : proposal._id}},function(err,ret){});
    }

    cb(err,proposal);
  });
};

var RemoveMember = function(member_id,level,cb){
  db.members.findAndModify({
    query: {"_id" : member_id} ,
    update: {$set: {"status": 0}},
    new : true
    },function(err,member){
      if(err) {
        cb(err,0);
      }
      db.kbz.update({"_id" : member.kbz_id},{$pull : { "memberships" : member_id},$inc : {size : -1}},function(err,ret){
        if(err) {
        cb(err,0);
        }
      });
      if (level === 1) {
        if (member.type === 1) {
          db.users.update({"_id" : member.parent},{$pull : {"memberships" : member_id}},function(err,ret){
            if(err){
              cb(err,0);
            }

          });
        }
        if (member.type === 2) {
          db.members.update({"_id" : member.parent},
            {$pull : {"actions.live" :  {"member_id" : member._id, "action_id" : member.kbz_id}},
             $push : {"actions.past" : {"member_id" : member._id, "action_id" : member.kbz_id}}
            },function(err,ret){
            if(err){
              cb(err,0);
            }

          });
        }
      }
      member.actions.live.forEach(function (m) {
        i = member.actions.live.indexOf(m);
        member.actions.live.splice(i,1);
        member.actions.past.push(m);
        db.members.save(member,function(err,ret){});
        RemoveMember(m.member_id,level++,function(err,ret){
          if(err) {cb(err,0);}
        });
      });
      console.log("exit recursion",level);
      cb(err,member);
  });
};

var AssignetoPulse = function(proposal,pulse_id,cb){
  db.proposals.update({"_id" : proposal._id},{$set: {"status": 4}}, function(err,ret){
    if(err){
      cb(err,0);
    }
    db.pulses.update({"_id" : pulse_id},{$push : {"Assigned" : proposal._id}}, function(err,ret){
      if(err){
        cb(err,0);
      }
      cb(err,ret);
    });
  });
};

var Support = function(kbz_id,proposal_id,member_id,cb) {
  db.proposals.update({"_id" : proposal_id , "support.members" : {$nin : [member_id]}},{$inc : {"support.count" : 1},$push :{"support.members": member_id}},function(err,ret){
    if(err) {
      cb(err,0);
    }
    if (ret){
      db.kbz.find({"_id":kbz_id},{"variables.ProposalSupport.value" : 1,"size" : 1,"pulses.Assigned" : 1} , function(err,ret)  {
        if(err){
          cb(err,0);
        }
        var pulse_id = ret[0].pulses.Assigned;
        var ProposalSupport = ret[0].variables.ProposalSupport.value;
        var size = ret[0].size;
        db.proposals.find({"_id":proposal_id},function(err,ret){
          if(err){
            cb(err,0);
          }
          var current = ret[0].support.count;
          var status = ret[0].status;
          if(status == "3" && (current/size*100 >= ProposalSupport)) {
              AssignetoPulse(ret[0],pulse_id,cb);
          }
          else cb(err,ret);
        });
      });
    }
    else{
        db.proposals.update({"_id" : proposal_id, "support.members" : {$in : [member_id]}},{$inc : {"support.count" : -1},$pull :{"support.members": member_id}},function(err,ret){
          if(err) {
            cb(err,0);
          }
        cb(err,ret);
        });
    }
  });
};

var PulseSupport = function(kbz_id,member_id,cb) {
  db.kbz.findAndModify({
    query: {"_id" : kbz_id , "pulsesupport.members" : {$nin : [member_id]}},
    update: {$inc : {"pulsesupport.count" : 1},$push :{"pulsesupport.members": member_id}},
    new : true
    },function(err,kbz){
      if(err) {
      cb("Pulsesupport1:"+err,0);
    }
    if (kbz){
      var current = kbz.pulsesupport.count;
      var PulseSupport = kbz.variables.PulseSupport.value;
      var size = kbz.size;
      if(current/size*100 >= PulseSupport) {
        Pulse(kbz_id,function(err,ret){
          if(err){cb(err,0);}
          cb(err,ret);
        });
      }
      else cb(err,kbz);
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
};

var Vote = function(proposal_id,member_id,vote,cb) {
  var pro = 0;
  var against = 0;
  if(vote == 1) {
    pro = 1;
  }
  else{
    against = 1;
  }
  db.proposals.update({"_id" : proposal_id , "votes.members" : {$nin : [member_id]}},{$inc : { "votes.pro" : pro, "votes.against" : against},$push :{"votes.members": member_id}},function(err,ret){
    if(err) {
      cb("Vote1:"+err,0);
    }
    if(!ret){
    }
    cb(err,ret);
  });
};

var PulseOnTheAir = function(pulse_id,cb) {
  db.pulses.findOne({"_id" : pulse_id},function(err,OnTheAir){
    OnTheAir.status = 3;
    if(err){
      cb(err,0);
    }
    if(OnTheAir.OnTheAir[0]) {
      db.proposals.find({"_id" :{$in : OnTheAir.OnTheAir}},function(err,proposals){
        if(err){
          cb(err,0);
        }
        proposals.forEach(function (proposal) {
          type = proposal.type;
          var variable = eval("kbz.variables."+type);
          if(proposal.votes.pro/(proposal.votes.against + proposal.votes.pro)*100 >= variable.value){ /*proposal had passed*/
            console.log("approved ",proposal.type);
            ExecuteVertic(proposal,function(err,ret){
              if (err) {
                cb("Pulse: Proposal id:"+proposal._id+" failed to resolve",0);
              }
              if(ret){
                proposal.status = "7"; /* Approved */
                OnTheAir.Approved.push(proposal._id);
                db.proposals.save(proposal,function(err,ret){});
                if (OnTheAir.OnTheAir.length == OnTheAir.Rejected.length + OnTheAir.Approved.length) {
                  OnTheAir.OnTheAir = [];
                  db.pulses.save(OnTheAir,function(err,ret){});
                }
              }
            });
          }
            else { /*proposal had been rejected*/
              console.log("Rejected",proposal.type);
              proposal.status = "8"; /* rejected */
              OnTheAir.Rejected.push(proposal._id);
              db.proposals.save(proposal,function(err,ret){});
              if (OnTheAir.OnTheAir.length == OnTheAir.Rejected.length + OnTheAir.Approved.length) {
                OnTheAir.OnTheAir = [];
                db.pulses.save(OnTheAir,function(err,ret){});
              }
            }
        });
      });
    }
    else {
      db.pulses.save(OnTheAir,function(err,ret){});
      }
  });
  cb(0,1);
};

var Pulse = function(kbz_id,cb){
  db.kbz.findOne({"_id" : kbz_id },function(err,kbz){
    if(err) {
      cb(err,0);
    }
    if (kbz.pulses.OnTheAir[0]) { //in case it is not the first kbz pulse
      PulseOnTheAir(kbz.pulses.OnTheAir,function(err,ret){
        if(err){
          cb(err,0);
        }
      });
    }
    db.pulses.findOne({"_id" : kbz.pulses.Assigned},function(err,Assigned){
      if(err){
        cb("pulse: could not find Pulse Assigned "+err,0);
      }
      db.proposals.update({"_id" : {$in : Assigned.Assigned}},{$set : {"status" : "6"}},function(err,ret){
        if(err){
          cb("coul'nt update proposal no:"+pr+" status", 0);
        }
        Assigned.status = 2;
        Assigned.OnTheAir = Assigned.Assigned;
        Assigned.Assigned = [];
        db.pulses.save(Assigned,function(err,ret){
          if (err) {
            cb(err,0);
          }
          CreatePulse(kbz_id,function(err,ret){
            if(err){
              cb(err,0);
            }
          });
        });
      });
    });
    db.proposals.update({"kbz_id" : kbz_id, "status" : "3", "age" : {$gt : kbz.variables.MaxAge}},{$set :{"status": "5"}},function(err,ret){
      if(err){
        cb("could not update status failed to proposals", 0);
      }
      db.proposals.update({"kbz_id" : kbz_id, status : "3"},{$inc : {"age" :1}},function(err,ret){
        if(err){
          cd("could not inc age of OutThere", 0);
        }
      });
    });
    kbz.pulses.Past.push(kbz.pulses.OnTheAir);
    kbz.pulses.OnTheAir = kbz.pulses.Assigned;
    kbz.pulsesupport = {count : 0 ,members : []};
    db.kbz.save(kbz,function(err,ret){}) ;
  });
cb(0,1);
};


var ExecuteVertic = function(proposal,cb){
  console.log("executing proposal type: ",proposal.type);
  if(proposal.type == "ME"){
    CreateMember(proposal.kbz_id,proposal.initiator,proposal._id)
    .then(Console);
  }
  if(proposal.type == "EM" || proposal.type == "OC"){
    RemoveMember(proposal.member_id,1,function(err,ret){
      if(err) {
       cb(err,0);
      }
      cb(err,ret);
    });
  }
  if(proposal.type == "NS"){
    CreateStatement(proposal.kbz_id,proposal.statement,proposal._id)//,function(err,ret){
    .then(null,console.error);
  }
  if(proposal.type == "CS"){
    db.statements.update({"_id" : proposal.statement_id},{$set : {"status" : 0}}, function(err,ret){
      if(err) {
        cb(err,0);
      }
      cb(err,ret);
    });
  }
  if(proposal.type == "RS"){
    db.statements.update({"_id" : proposal.statement_id},{$set : {"statement" : proposal.newstatement}}, function(err,ret){
      if(err) {
        cb(err,0);
      }
      cb(err,ret);
    });
  }
  if(proposal.type == "CV"){
    key = "variables."+proposal.variable+".value";
    variable = {};
    variable[key] = proposal.newvalue;
    db.kbz.update({"_id" : proposal.kbz_id},{$set : variable}, function(err,ret){
      if(err) {
        cb(err,0);
      }
      cb(err,ret);
    });
  }
  if(proposal.type == "NA"){
    CreateAction(proposal.kbz_id,proposal._id, function(err,action){
      if(err) { cb(err,0);}
      db.kbz.update({"_id" : action._id},{$set : {"variables.Name.value" : proposal.actionname}},function(err,ret){});
      cb(err,action);
    });
  }
  if(proposal.type == "CA"){
    db.kbz.update({"_id" : proposal.action_id},{$set : {"status" : 0},}, function(err,ret){
      if(ret){
        db.kbz.update({"_id" : proposal.kbz_id},{
          $pull : {"actions.live" : proposal.action_id},
          $push : {"actions.past" : proposal.action_id}
          },function(err,ret){
            cb(err,ret);
        });
      }
    });
  }
  if(proposal.type == "CM"){
    CreateCommitteeMember(proposal.action_id,proposal.member_id,proposal._id)
    .then(console.log,console.err);
  }
};


var CreatePulse = function(kbz_id,cb){
  pulse = {};
  pulse.kbz_id = kbz_id;
  pulse.status = 1;
  pulse.Assigned = [];
  pulse.OnTheAir = [];
  pulse.Approved = [];
  pulse.Rejected = [];
  db.pulses.insert(pulse, function(err,ret){
    if(err) {
  cb(err,0);
    }
    db.kbz.update({"_id":kbz_id},{$set : {"pulses.Assigned" :ret[0]._id}},function(err,ret){
      if(err){
        cb(err,0);
      }
      cb(err,ret);
    });
  });
};

var vars = {},
    cmds = [
"db.users.find({},function(ret,users){vars.users = users;})",
"CreateKbz(0,vars.users[0]._id,0,function(err,kbz) {vars.kbz = kbz});",
"console.log('-------------------vars.kbz.pulses-----------------',vars.kbz.pulses,vars.kbz.memberships,vars.kbz.member);",
"CreateProposal(vars.kbz._id,vars.users[1]._id,'i want in','let me in','ME',{member : 0},function(err,p1){vars.p1 = p1});",
"CreateProposal(vars.kbz._id,vars.users[2]._id,'i want in too','let me in too','ME',{member : 0},function(err,p11){vars.p11 = p11});",
"CreateProposal(vars.kbz._id,vars.users[3]._id,'i want in toooo','let me in toooo','ME',{member : 0},function(err,p14){vars.p14 = p14});",
"CreateProposal(vars.kbz._id,vars.kbz.member,'our moto','Just kidding','NS',{statement : 'Dont Be Evil!!'},function(err,p2){vars.p2 = p2});",
"CreateProposal(vars.kbz._id,vars.kbz.member,'Change Name','WE need to change','CV',{variable : 'Name' , newvalue : 'our House'},function(err,p3){vars.p3 = p3});",
"CreateProposal(vars.kbz._id,vars.kbz.member,'new action','new action','NA',{actionname : 'TheAction'},function(err,p4){vars.p4 = p4});",
"Support(vars.kbz._id,vars.p11._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p1._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p2._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p3._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p4._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p14._id,vars.kbz.member,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.kbz.member,function(err,ret){});",
"Vote(vars.p11._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p1._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p2._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p3._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p4._id,vars.kbz.member,1,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.kbz.member,function(err,ret){});"
];
    cmds2 = [
"db.users.find({},function(ret,users){vars.users = users;})",
"CreateKbz(0,vars.users[0]._id,0,function(err,kbz) {vars.kbz = kbz});",
"console.log('-------------------vars.kbz.pulses-----------------',vars.kbz.pulses);",
"CreateProposal(vars.kbz._id,vars.users[1]._id,'i want in','let me in','ME',{member : 0},function(err,p1){vars.p1 = p1});",
"CreateProposal(vars.kbz._id,vars.users[2]._id,'i want in too','let me in too','ME',{member : 0},function(err,p11){vars.p11 = p11});",
"CreateProposal(vars.kbz._id,vars.users[3]._id,'i want in toooo','let me in toooo','ME',{member : 0},function(err,p14){vars.p14 = p14});",
"CreateProposal(vars.kbz._id,vars.kbz.member,'our moto','Just kidding','NS',{statement : 'Dont Be Evil!!'},function(err,p2){vars.p2 = p2});",
"CreateProposal(vars.kbz._id,vars.kbz.member,'Change Name','WE need to change','CV',{variable : 'Name' , newvalue : 'our House'},function(err,p3){vars.p3 = p3});",
"CreateProposal(vars.kbz._id,vars.kbz.member,'new action','new action','NA',{actionname : 'TheAction'},function(err,p4){vars.p4 = p4});",
"Support(vars.kbz._id,vars.p11._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p1._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p2._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p3._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p4._id,vars.kbz.member,function(err,ret){});",
"Support(vars.kbz._id,vars.p14._id,vars.kbz.member,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.kbz.member,function(err,ret){});",
"Vote(vars.p11._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p1._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p2._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p3._id,vars.kbz.member,1,function(err,ret){});",
"Vote(vars.p4._id,vars.kbz.member,1,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.kbz.member,function(err,ret){});",
"db.members.find({},function(err,m) {vars.m = m});",
"db.kbz.findOne({_id : vars.kbz._id},function(err,kbz) {vars.kbz = kbz});",
"db.kbz.findOne({_id :{$ne : vars.kbz._id}},function(err,kbz) {vars.action_id = kbz._id});",
"db.statements.findOne({},function(err,statement) {vars.statement = statement});",
"console.log('-------------------vars.kbz.actions.live-----------------',vars.kbz.actions.live);",
"CreateProposal(vars.kbz._id,vars.m[1]._id,'i want in action','let me in actionn','CM',{member_id :vars.m[1]._id , action_id : vars.kbz.actions.live[0]._id},function(err,p5){vars.p5 = p5});",
"CreateProposal(vars.kbz._id,vars.m[2]._id,'i want in action too','let me in actionn too','CM',{member_id :vars.m[2]._id , action_id : vars.kbz.actions.live[0]._id},function(err,p12){vars.p12 = p12});",
"CreateProposal(vars.kbz._id,vars.m[1]._id,'Evil is good','dont tell us what we are not!','RS',{statement_id : vars.statement._id , newstatement : 'we are Evil!',oldstatement : vars.statement.statement},function(err,p6){vars.p6 = p6});",
"Support(vars.kbz._id,vars.p5._id,vars.m[0]._id,function(err,ret){});",
"Support(vars.kbz._id,vars.p12._id,vars.m[2]._id,function(err,ret){});",
"Support(vars.kbz._id,vars.p6._id,vars.m[1]._id,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[1]._id,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[2]._id,function(err,ret){});",
"CreateProposal(vars.kbz._id,vars.m[1]._id,'i want out','let me out','EM',{member_id : vars.m[1]._id},function(err,p7) {vars.p7 = p7});",
"CreateProposal(vars.kbz._id,vars.m[0]._id,'cancel it!','Cancel it now!!','CS',{statement_id : vars.statement._id},function(err,p8) {vars.p8 = p8});",
"Vote(vars.p5._id,vars.m[0]._id,1,function(err,ret){});",
"Vote(vars.p12._id,vars.m[2]._id,1,function(err,ret){});",
"Vote(vars.p5._id,vars.m[1]._id,1,function(err,ret){});",
"Vote(vars.p6._id,vars.m[0]._id,1,function(err,ret){});",
"Support(vars.kbz._id,vars.p7._id,vars.m[1]._id,function(err,ret){});",
"Support(vars.kbz._id,vars.p8._id,vars.m[0]._id,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[0]._id,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[2]._id,function(err,ret){});",
"Vote(vars.p7._id,vars.m[0]._id,1,function(err,ret){});",
"Vote(vars.p8._id,vars.m[0]._id,1,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[0]._id,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[2]._id,function(err,ret){});",
"db.members.find({'type' : 2 , 'status' : 1},function(err,m) {vars.m2 = m});",
"CreateProposal(vars.kbz._id,vars.m[0]._id,'throw out','let him out','OC',{member_id : vars.m2[0]._id},function(err,p13) {vars.p13 = p13});",
"console.log('actionID:',vars.action_id);",
"CreateProposal(vars.kbz._id,vars.m[0]._id,'End Action','let it end','CA',{action_id : vars.action_id},function(err,p15) {vars.p15 = p15});",
"Support(vars.kbz._id,vars.p13._id,vars.m[0]._id,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[0]._id,function(err,ret){});",
"Support(vars.kbz._id,vars.p15._id,vars.m[0]._id,function(err,ret){});",
"Vote(vars.p13._id,vars.m[0]._id,1,function(err,ret){});",
"Vote(vars.p13._id,vars.m[2]._id,1,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[0]._id,function(err,ret){});",
"Vote(vars.p15._id,vars.m[0]._id,1,function(err,ret){});",
"PulseSupport(vars.kbz._id,vars.m[0]._id,function(err,ret){});",
];
 

function next() { run(cmds.splice(0,1));}

function run(cmd) {
  console.log('executing: '+cmd[0]);
  eval(cmd[0]);
}

function async(cmd, cb) {
  console.log('executing: '+cmd);
  eval(cmd);
  setTimeout(function() { cb(); }, 350);
}
// Final task (same in all the examples)
function final() { console.log('Done'); }

function runCommand(item) {
  if(item) {
    async(item, function() {
      return runCommand(cmds.shift());
    });
  } else {
    return final();
  }
}

exports.runit = function(){
  runCommand(cmds.shift());
};

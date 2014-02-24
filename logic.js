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

var db_find = function(collection,where,s){
  if (collections.indexOf(collection) == -1) {throw "db_find not a valid collection";}
  var d = Q.defer(),
      select = {};
  if(s) {select = s;}
  col = eval("db."+collection);
  col.find(where,function(err,data) {
    if(err) {console.log("db_find e:",collection,err); d.reject(err);}
    else d.resolve(data);
  });
  return d.promise;
};

var db_findOne = function(collection,id,s){
  console.log("In FindOne :",collection,id);
  if(collections.indexOf(collection) == -1) {throw "db_findOne not a valid collection";}
  var d = Q.defer(),
      select = {};
  if(s) {select = s;}
  col = eval("db."+collection);
  if(id) {
    col.findOne({'_id' : id},select,function(err,data) {
          console.log("findone output:",collection,data._id);
      if(err) {console.log("db_findOne e:",collection,err); d.reject(err);}
      else d.resolve(data);
    });
  };
  return d.promise;
};

var db_findAndModify = function(collection,query,update){
  console.log("In db_findAndModify",collection,query,update);
  if(collections.indexOf(collection) == -1) {throw "db_findAndModify not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
  col.findAndModify({
    query : query ,
    update : update ,
    new : true },function(err,data) {
      console.log("In db_findAndModify out put",collection,err,data._id);
      if(err) d.reject(err);
      else d.resolve(data);
  });
  return d.promise;
};

var db_updateOne = function(collection,id,update){
  console.log("db_updateOne:",collection,id,update);
  if(collections.indexOf(collection) == -1) {throw "db_ipdateone not a valid collection"+id;}
  var d = Q.defer();
  col = eval("db."+collection);
  col.update({'_id' : id},update,{multi : false},function(err,data) {
    console.log("db_updateOne data:",collection,id,data,err);
    if(err) {console.log("db+updateOne e:",collection,err);d.reject(err);}
    else d.resolve(data);
  });
  return d.promise;
};

var db_update = function(collection,where,update){
  console.log("db_update:",collection,where,update);
  if(collections.indexOf(collection) == -1) {throw "db_update not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
  col.update(where,update,{multi : true},function(err,data) {
    console.log("db_update:",collection,where,data,err);
    if(err) {console.log("db_update e:",collection,err);d.reject(err);}
    else d.resolve(data);
  });
  return d.promise;
};

var db_insert = function(collection,obj){
  console.log("db_insert:",collection);
  if(collections.indexOf(collection) == -1) {throw "db_insert not a valid collection";}
  var d = Q.defer(),
      col = eval("db."+collection);
  col.insert(obj,function(err,data) {
    if(err) {console.log("db_insert e:",collection,err);d.reject(err);}
    else d.resolve(data);
  });
  return d.promise;
};

var db_save = function(collection,obj){
  console.log("db_save",collection);
  if(collections.indexOf(collection) == -1) {throw "db_save not a valid collection";}
  var d = Q.defer();
  col = eval("db."+collection);
  col.save(obj,function(err,data) {
    if(err) {console.log("db_save e:",err);d.reject(err);}
    else d.resolve(data);
  });
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

var CreatePulse = function(kbz_id){
  var d = Q.defer(),
          pulse = {};
  pulse.kbz_id = kbz_id;
  pulse.status = 1;
  pulse.Assigned = [];
  pulse.OnTheAir = [];
  pulse.Approved = [];
  pulse.Rejected = [];
  db_insert('pulses',pulse)
  .then(function(data,err) {
    if(err) d.reject(new Error('CreatePulse'+err));
    db_updateOne('kbz',kbz_id,{$set : {"pulses.Assigned" :data._id}})
    .then(function(data,err){
    if(err) d.reject(new Error('CreatePulse'+err));
    else d.resolve(data);
    });
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
    if (!member) throw ("no member");
    db_updateOne('users',member.user_id,{$push : {'memberships': member._id}})
    .then(db_updateOne('kbz', kbz_id,{$inc : {size : 1},$push : {'memberships' : member._id}}))
    .then(function(data,err){
      if(err) d.reject(new Error('CreateMember'+err));
      else d.resolve(member);
    });
  });
  return d.promise;
};

var CreateCommitteeMember = function(action_id,member_id,proposal_id){
  if (!action_id) {}//throw "no action_id";
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
    if (!member) throw ("CreateCommitteeMember: no member");
    db_updateOne('members',member_id,{$push : {"actions.live" : {"member_id" : member._id, "action_id" : action_id}}})
    .then(db_updateOne('kbz',action_id,{$inc : {size : 1},$push : {"memberships" : member._id}}))
    .then(function(data,err){
      if(err) d.reject(err);
      else d.resolve(member);
    });
  });
  return d.promise;
};


var CreateKbz = function(parent_id,user_id,proposal_id,action_name){
  var d = Q.defer(),
    kbz = {};
  kbz.parent_id = parent_id;
  kbz.type = (parent_id ? 1 : 0);
  kbz.actions = {live : [] , past : []};
  kbz.status = 1;
  kbz.size = 0;
  kbz.pulsesupport = {members : [], count : 0};
  kbz.pulses = {Assigned: null ,OnTheAir : null,Past :[]};
  kbz.proposals = (proposal_id ? [proposal_id] : []);
  kbz.memberships = [];
  db_find('variables',{},{})
  .then(function(data,err) {
    data[0].Name.value = action_name || 'No Name';
    kbz.variables = data[0];
    db_insert('kbz',kbz)
    .then(function(newkbz,err){
      if (err) {}
      CreatePulse(newkbz._id).then(function(a,b){});
      if(kbz.type === 0) {
        CreateMember(newkbz._id,user_id,0);
      }
      if(err) d.reject(err);
      else d.resolve(newkbz);
    });
  });
  return d.promise;
};

var CreateAction = function(parent_id,proposal_id,action_name){
  var d = Q.defer();
  CreateKbz(parent_id,0,proposal_id,action_name)
  .then(function(newaction,err){
    db_updateOne('kbz',parent_id,{$push : {"actions.live" : newaction._id}})
    .then(function(data,err){
      if(err) d.reject(err);
      else d.resolve(data);
    });
  });
  return d.promise;
};


var CreateProposal = function(kbz_id,initiator,title,body,type,uniq){
  //console.log("in CreateProposal",kbz_id,initiator,title,body,type,uniq);
  var d = Q.defer(),
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
  db_insert('proposals',Proposal)
  .then(function(proposal,err){
      //console.log("in CreateProposal2",proposal,err);
    if (!(type=="ME")){      
      db_updateOne('members',proposal.initiator,{$push : {"myproposals" : proposal._id}});
    }

    if (proposal.member_id ){
      db_updateOne('members',proposal.member_id,{$push : {"proposals" : proposal._id}});
    }

    if (proposal.statement_id) {
      db_updateOne('statements',proposal.statement_id,{$push : {"proposals" : proposal._id }});
    }

    if (proposal.variable) {
      key = "variables."+proposal.variable+".proposals";
      variable = {};
      variable[key] = proposal._id;
      db_updateOne('kbz',proposal.kbz_id,{$push : variable});
    }

    if (proposal.action_id) {
      db_updateOne('kbz',proposal.action_id,{$push : {"proposals" : proposal._id}});
    }

    if(err) d.reject(err);
    else d.resolve(proposal);
  });
  return d.promise;
};

var RemoveMember = function(member_id,level){
  var d = Q.defer();
  db_findAndModify('members' ,{'_id' : member_id} ,{$set: {"status": 0}})
  .then(function(member,err){
    if(err){}
    db_updateOne('kbz',member.kbz_id,{$pull : { "memberships" : member_id},$inc : {size : -1}})
    .then(null,console.err);
    if(level === 1) {
      if (member.type === 1) {
        db_updateOne('users' ,member.parent ,{$pull : {"memberships" : member_id}})
        .then(null,console.err);
        }
      if (member.type === 2) {
        db_updateOne('members',member.parent,
          {$pull : {"actions.live" :  {"member_id" : member._id, "action_id" : member.kbz_id}},
           $push : {"actions.past" : {"member_id" : member._id, "action_id" : member.kbz_id}}
          })
          .then(null,console.err);
      }
    }
    member.actions.live.forEach(function (action) {
      i = member.actions.live.indexOf(action);
      member.actions.live.splice(i,1);
      member.actions.past.push(action);
      db_save('members',member)
      .then(d.resolve(member));
      RemoveMember(action.member_id,level++)
      .then(null,console.error);
    });
    console.log("exit recursion",level);
  });
  return d.promise;
};


var AssignetoPulse = function(proposal,pulse_id){
  console.log("In AssignetoPulse",proposal._id);
  var d = Q.defer();
  db_updateOne('proposals',proposal._id,{$set: {"status": 4}})
  .then(db_updateOne('pulses',pulse_id,{$push : {"Assigned" : proposal._id}})
    .then(function(data,err) {
      if(err) d.reject(err);
      else d.resolve(proposal);
    })
  );
  return d.promise;
};

var Support = function(kbz_id,proposal_id,member_id) {
  var d = Q.defer();
  db_update('proposals',{"_id" : proposal_id , "support.members" : {$nin : [member_id]}},{$inc : {"support.count" : 1},$push :{"support.members": member_id}})
  .then(function(ret,err){
    if (ret){
      db_findOne('kbz',kbz_id,{"variables.ProposalSupport.value" : 1,"size" : 1,"pulses.Assigned" : 1})
      .then(
        function(kbz,err){
          var pulse_id = kbz.pulses.Assigned,
              ProposalSupport = kbz.variables.ProposalSupport.value,
              size = kbz.size;
          db_findOne('proposals',proposal_id)
          .then(
            function(proposal,err){
              var current = proposal.support.count;
              var status = proposal.status;
              if(status == "3" && (current/size*100 >= ProposalSupport)) {
                AssignetoPulse(proposal,pulse_id).then(null,console.error)
                .then(
                  function(data,err){
                    if(err) d.reject(err);
                    else d.resolve(proposal);
                  }
                ).then(null,console.error);
              }
            });
      });
    }
    else{
      db_update('proposals',{"_id" : proposal_id, "support.members" : {$in : [member_id]}},{$inc : {"support.count" : -1},$pull :{"support.members": member_id}})
      .then(
        function(data,err){
          if(err) d.reject(err);
          else d.resolve(proposal);
        });
    }
  });
return d.promise;
};


var PulseSupport = function(kbz_id,member_id) {
  console.log("In PulseSupport",kbz_id,member_id);
  var d = Q.defer();
  db_findAndModify('kbz',{"_id" : kbz_id , "pulsesupport.members" : {$nin : [member_id]}}, {$inc : {"pulsesupport.count" : 1},$push :{"pulsesupport.members": member_id}})
  .then(
    function(kbz,err){
      if (kbz){
        var current = kbz.pulsesupport.count;
        var PulseSupport = kbz.variables.PulseSupport.value;
        var size = kbz.size;
        if(current/size*100 >= PulseSupport) {
          Pulse(kbz_id)
          .then(
            function(data,err){
              if(err) d.reject(err);
              else d.resolve(proposal);
            }
          );
        }
      }
      else{
        db_update('kbz',{"_id" : kbz_id,"pulsesupport.members" : {$in : [member_id]}},{$inc : {"pulsesupport.count" : -1},$pull :{"pulsesupport.members": member_id}})
        .then(
          function(data,err){
            if(err) d.reject(err);
            else d.resolve(proposal);
          }
        );
      }
    }
  );
  return d.promise;
};



var Vote = function(proposal_id,member_id,vote) {
  console.log("Vote :",proposal_id,member_id,vote);
  var d = Q.defer(),
      pro = 0,
      against = 0;
  if(vote === 1) {
    pro = 1;
  }
  else{
    against = 1;
  }
  db_update('proposals',{"_id" : proposal_id , "votes.members" : {$nin : [member_id]}},{$inc : { "votes.pro" : pro, "votes.against" : against},$push :{"votes.members": member_id}})
  .then(d.resolve);
  return d.promise;
};


var ExecuteOnTheAir = function(OnTheAir,variables){
  console.log("IN ExecuteOnTheAir",OnTheAir);
  var d = Q.defer(),
      proposal_id = OnTheAir.OnTheAir.splice(0,1);
      console.log("IN ExecuteOnTheAir proposal:",proposal_id,proposal_id==[],!proposal_id,!proposal_id[0],proposal_id===[],proposal_id==null);
  if(!proposal_id[0]) {
    console.log("ppPPppPPppPPppPP",proposal_id,proposal_id==[]);
    d.resolve(OnTheAir);
  }
  else{
    console.log("IN ExecuteOnTheAir proposal2:",proposal_id[0]);
    db_findOne('proposals',proposal_id[0])
    .then(function(proposal) {
      console.log("IN ExecuteOnTheAir proposal3:",proposal);
      type = proposal.type;
      var variable = eval("variables."+type);
      console.log("IN ExecuteOnTheAir proposal4:",proposal.votes,variable.value);
      if(proposal.votes.pro/(proposal.votes.against + proposal.votes.pro)*100 >= variable.value){ /*proposal had passed*/
        console.log("approved ",type);
        ExecuteVertic(proposal)
        .then(function(vertic){
          console.log("IN ExecuteOnTheAir proposal5: REturned from EV",vertic);
          proposal.status = "7"; /* Approved */
          OnTheAir.Approved.push(proposal._id);
          db_save('proposals',proposal).then(null,console.error);
          //console.log("111:",OnTheAir.OnTheAir.length,OnTheAir.Rejected.length, OnTheAir.Approved.length);
          d.resolve(ExecuteOnTheAir(OnTheAir,variables));
        });
      }
      else { /*proposal had been rejected*/
        console.log("Rejected",proposal.type);
        proposal.status = "8"; /* rejected */
        OnTheAir.Rejected.push(proposal._id);
        db_save('proposals',proposal).then(null,console.error);
        //console.log("222:",OnTheAir.OnTheAir.length,OnTheAir.Rejected.length, OnTheAir.Approved.length);
        d.resolve(ExecuteOnTheAir(OnTheAir,variables));
      }
    });
  }
  return d.promise;
};

var PulseOnTheAir = function(pulse_id,variables) {
  console.log("IN PulseOnTheAir",pulse_id);
  //if(!pulse_id) {console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");q.resolve(1);}
  var d = Q.defer();
  db_findOne('pulses',pulse_id).fail(d.resolve)
  .then(function(OnTheAir){
    OnTheAir.status = 3;
    console.log("IN PulseOnTheAir !OnTheAir.OnTheAir[0]",!OnTheAir.OnTheAir[0]);
    if(!OnTheAir.OnTheAir[0]) {
      db_save('pulses',OnTheAir).then(d.resolve);
    }
        //db_find('proposals',{$in : OnTheAir.OnTheAir})
    //  .then(function(proposals){
    ExecuteOnTheAir(OnTheAir,variables)
    .then(function(OnTheAir) {
      console.log("IN PulseOnTheAir return ontheair: ",OnTheAir);
      OnTheAir.OnTheAir = [];
      db_save('pulses',OnTheAir).then(d.resolve);
    });
  });
  return d.promise;
};

/*
var Age = function(kbz_id,maxage){
  console.log("IN Age",kbz_id,maxage);
  var d = Q.defer();
  db_update('proposals',{"kbz_id" : kbz_id, "status" : "3", "age" : {$gt : maxage}},{$set :{"status": "5"}})
  .then(function(data,err){
    if(data.n) {}
    db_update('proposals',{"kbz_id" : kbz_id, status : "3"},{$inc : {"age" :1}})
    .then(d.resolve(data));
  });
  return d.promise;
};
*/


var Age = function(kbz_id,maxage){
  console.log("IN Age",kbz_id,maxage);
  var d = Q.defer();
  db_update('proposals',{"kbz_id" : kbz_id, "status" : "3", "age" : {$gt : maxage}},{$set :{"status": "5"}})
  .then(db_update('proposals',{"kbz_id" : kbz_id, status : "3"},{$inc : {"age" :1}})
  .then(d.resolve).fail(d.resolve)
  );
  return d.promise;
};


var Pulse = function(kbz_id){
  console.log("IN Pulse",kbz_id);
  var d = Q.defer();
  db_findOne('kbz', kbz_id)
  .then(function(kbz){
    Age(kbz_id,kbz.variables.MaxAge.value)
    .then(PulseOnTheAir(kbz.pulses.OnTheAir,kbz.variables)
    .then(
      db_findOne('pulses',kbz.pulses.Assigned)
      .then(function(Assigned,err){
        db_update('proposals',{"_id" : {$in : Assigned.Assigned}},{$set : {"status" : "6"}})
        .then(function(){
          Assigned.status = 2;
          Assigned.OnTheAir = Assigned.Assigned;
          Assigned.Assigned = [];
          db_save('pulses',Assigned)
          .then(function(){
            CreatePulse(kbz_id);
            kbz.pulses.Past.push(kbz.pulses.OnTheAir);
            kbz.pulses.OnTheAir = kbz.pulses.Assigned;
            kbz.pulsesupport = {count : 0 ,members : []};
            db_save('kbz',kbz)
            .then(d.resolve());
          });
        });
      }))
    );
  });
  return d.promise;
};


var ExecuteVertic = function(proposal){
  var d = Q.defer();
  console.log("executing proposal type: ",proposal.type);
  if(proposal.type == "ME"){
    CreateMember(proposal.kbz_id,proposal.initiator,proposal._id)
    .then(d.resolve);
  }
  if(proposal.type == "EM" || proposal.type == "OC"){
    RemoveMember(proposal.member_id,1)
    .then(d.resolve);
  }
  if(proposal.type == "NS"){
    CreateStatement(proposal.kbz_id,proposal.statement,proposal._id)//,function(err,ret){
    .then(d.resolve);
  }
  if(proposal.type == "CS"){
    db_updateOne('statements',proposal.statement_id,{$set : {"status" : 0}})
    .then(d.resolve);
  }
  if(proposal.type == "RS"){
    db_updateOne('statements',proposal.statement_id,{$set : {"statement" : proposal.newstatement}})
    .then(d.resolve);
  }
  if(proposal.type == "CV"){
    key = "variables."+proposal.variable+".value";
    variable = {};
    variable[key] = proposal.newvalue;
    db_updateOne('kbz',proposal.kbz_id,{$set : variable})
    .then(d.resolve);
  }
  if(proposal.type == "NA"){
    CreateAction(proposal.kbz_id,proposal._id,proposal.action_name)
    .then(d.resolve);
  }
  if(proposal.type == "CA"){
    db_updateOne('kbz',proposal.action_id,{$set : {"status" : 0}})
    .then(db_updateOne('kbz',proposal.kbz_id,{
          $pull : {"actions.live" : proposal.action_id},
          $push : {"actions.past" : proposal.action_id}
          }).then(d.resolve)
    );
  }
  if(proposal.type == "CM"){
    CreateCommitteeMember(proposal.action_id,proposal.member_id,proposal._id)
    .then(d.resolve);
  }
  return d.promise;
};




var vars = {},
    cmds = [
"db_find('users',{}).then(function(users,err){vars.users = users;throw err;});",
"CreateKbz(0,vars.users[0]._id,0).then(function(kbz,err){vars.kbz = kbz;throw err;});",
"CreateProposal(vars.kbz._id,vars.users[1]._id,'i want in','let me in','ME',{member : 0}).then(function(p1){vars.p1 = p1}).fail(console.log);",
"CreateProposal(vars.kbz._id,vars.users[2]._id,'i want in too','let me in too','ME',{member : 0}).then(function(p11){vars.p11 = p11}).fail(console.log);",
"CreateProposal(vars.kbz._id,vars.users[3]._id,'i want in toooo','let me in toooo','ME',{member : 0}).then(function(p14){vars.p14 = p14}).fail(console.log);",
"db_find('members',{}).then(function(members,err){vars.members = members;throw err;});",
"CreateProposal(vars.kbz._id,vars.members[0]._id,'our moto','Just kidding','NS',{statement : 'Dont Be Evil!!'}).then(function(p2){vars.p2 = p2}).fail(console.log);",
"CreateProposal(vars.kbz._id,vars.members[0]._id,'Change Name','WE need to change','CV',{variable : 'Name' , newvalue : 'our House'}).then(function(p3){vars.p3 = p3}).fail(console.log);",
"CreateProposal(vars.kbz._id,vars.members[0]._id,'new action','new action','NA',{actionname : 'TheAction'}).then(function(p4){vars.p4 = p4}).fail(console.log);",
"Support(vars.kbz._id,vars.p1._id,vars.members[0]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p2._id,vars.members[0]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p3._id,vars.members[0]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p4._id,vars.members[0]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p11._id,vars.members[0]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p14._id,vars.members[0]._id).then(console.log, console.error);",
"PulseSupport(vars.kbz._id,vars.members[0]._id).then(console.log, console.error);",
"Vote(vars.p1._id,vars.members[0]._id,1).then(console.log, console.error);",
"Vote(vars.p2._id,vars.members[0]._id,1).then(console.log, console.error);",
"Vote(vars.p3._id,vars.members[0]._id,1).then(console.log, console.error);",
"Vote(vars.p4._id,vars.members[0]._id,1).then(console.log, console.error);",
"Vote(vars.p11._id,vars.members[0]._id,1).then(console.log, console.error);",
"Vote(vars.p14._id,vars.members[0]._id,0).then(console.log, console.error);",
"PulseSupport(vars.kbz._id,vars.members[0]._id,function(err,ret){});",
/*
"db_find('members',{}).then(function(members){vars.m = members;console.log('mmmmmmmmm',m);});",
"db_findOne('kbz',vars.kbz._id).then(function(d){vars.kbz = d});",
"db_find('statements',{}).then(function(d){vars.statement = d[0]});",
"CreateProposal(vars.kbz._id,vars.m[1]._id,'i want in action','let me in actionn','CM',{member_id :vars.m[1]._id , action_id : vars.kbz.actions.live[0]._id}).then(function(d){vars.p5 = d});",
"CreateProposal(vars.kbz._id,vars.m[2]._id,'i want in action too','let me in actionn too','CM',{member_id :vars.m[2]._id , action_id : vars.kbz.actions.live[0]._id}).then(function(d){vars.p12 = d});",
"CreateProposal(vars.kbz._id,vars.m[1]._id,'Evil is good','dont tell us what we are not!','RS',{statement_id : vars.statement._id , newstatement : 'we are Evil!',oldstatement : vars.statement.statement}).then(function(d){vars.p6 = d});",
"Support(vars.kbz._id,vars.p5._id,vars.m[0]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p12._id,vars.m[2]._id).then(console.log, console.error);",
"Support(vars.kbz._id,vars.p6._id,vars.m[1]._id).then(console.log, console.error);",
"PulseSupport(vars.kbz._id,vars.m[2]._id).then(console.log, console.error);",
"PulseSupport(vars.kbz._id,vars.m[1]._id).then(console.log, console.error);",
*/
];
    cmds2 = [
"db.users.find({},function(ret,users){vars.users = users;})",
"CreateKbz(0,vars.users[0]._id,0function(err,kbz) {vars.kbz = kbz});",
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
"CreateProposal(vars.kbz._id,vars.m[1]._id,'i want in action','let me in actionn','CM',{member_id :vars.m[1]._id , action_id : vars.kbz.actions.live[0]._id},function(err,p5){vars.p5 = p5});",
"CreateProposal(vars.kbz._id,vars.m[2]._-id,'i want in action too','let me in actionn too','CM',{member_id :vars.m[2]._id , action_id : vars.kbz.actions.live[0]._id},function(err,p12){vars.p12 = p12});",
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

exports.next = function(){
  run(cmds.splice(0,1));
};

exports.vars = vars;
  



var mongoUri = 'mongodb://localhost:3001/meteor',
    //mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/kbzmain',
    collections = ["users", "kbz", "actions", "members", "pulses", "proposals", "statements", "variables"],
    db = require("mongojs").connect(mongoUri, collections),
    ObjectId = db.ObjectId,
    Q = require("q"),
    status = {
        "1": "Draft",
        "2": "Canceled",
        "3": "OutThere",
        "4": "Assigned",
        "5": "Failed",
        "6": "On The Air",
        "7": "Aprroved",
        "8": "Rejected"
    },
    types = {
        "ME": "Membership",
        "EM": "End Membership",
        "NS": "New Statement",
        "CS": "Cancel Statment",
        "RS": "Replace Statement",
        "CV": "Change Variable",
        "NA": "New Action",
        "CA": "Cancel Action",
        "CM": "Committee Member",
        "OC": "Out Of Committee"
    };
// sudo mongod --profile=1 --slowms=1 --fork --logpath /var/log/mongodb/mongodb.log --logappend
//db.setProfilingLevel(2,0,1)
/*-------DB Functions------*/

var db_find = function(collection, where, s) {
    console.log("In Find :", collection, where, s);
    if (collections.indexOf(collection) === -1) {
        throw "db_find not a valid collection";
    }
    var d = Q.defer(),
        select = {};
    if (s) {
        select = s;
    }
    col = db[collection];
    col.find(where, select, function(err, data) {
        console.log("Find output:", collection, data);
        if (err) {
            console.log("db_find e:", collection, err);
            d.reject(err);
        } else d.resolve(data);
    });
    return d.promise;
};

var db_findOne = function(collection, id, select) {
    console.log("In FindOne :", collection, id, collections.indexOf(collection) === -1);
    if (collections.indexOf(collection) === -1) {
        d.reject("db_findOne not a valid collection:" + collection);
    }
    var d = Q.defer(),
        col = db[collection];
    if (id) {
        col.findOne({
            '_id': id
        }, select || {}, function(err, data) {
            console.log("findone output:", collection, data._id);
            if (err) {
                console.log("db_findOne e:", collection, err);
                d.reject(err);
            } else d.resolve(data);
        });
    }
    return d.promise;
};

var db_findAndModify = function(collection, query, update) {
    console.log("In db_findAndModify", collection, query, update);
    if (collections.indexOf(collection) == -1) {
        throw new Error("db_findAndModify not a valid collection");
    }
    var d = Q.defer();
    col = db[collection];
    col.findAndModify({
        query: query,
        update: update,
        new: true
    }, function(err, data) {
        console.log("In db_findAndModify output:", collection, err, data._id);
        if (err) throw new Error("db_findAndModify:" + query + ":" + update);
        else d.resolve(data);
    });
    return d.promise;
};

var db_updateOne = function(collection, id, update) {
    var d = Q.defer();
    console.log("db_updateOne:", collection, id, update);
    if (collections.indexOf(collection) === -1 || !id || !update) console.log("db_updateOne: wrong parameters", collection, id, update);
    col = db[collection];
    col.update({
        '_id': id
    }, update, {
        multi: false
    }, function(err, data) {
        console.log("db_updateOne data:", collection, id, data, err);
        if (err) {
            console.log("db+updateOne e:", collection, err);
            d.reject(err);
        } else d.resolve(data);
    });
    return d.promise;
};

var db_update = function(collection, where, update) {
    console.log("db_update:", collection, where, update);
    if (collections.indexOf(collection) == -1) {
        throw new Error("db_update not a valid collection");
    }
    var d = Q.defer();
    col = db[collection];
    col.update(where, update, {
        multi: true
    }, function(err, data) {
        console.log("db_update:", collection, where, data, err);
        if (err) {
            console.log("db_update e:", collection, err);
            d.reject(err);
        } else d.resolve(data);
    });
    return d.promise;
};

var db_insert = function(collection, obj) {
    console.log("db_insert:", collection);
    if (collections.indexOf(collection) == -1) {
        throw new error("db_insert not a valid collection");
    }
    var d = Q.defer(),
        col = db[collection];
    col.insert(obj, function(err, data) {
        if (err) {
            console.log("db_insert e:", collection, err);
            d.reject(err);
        } else d.resolve(data);
    });
    return d.promise;
};

var db_save = function(collection, obj) {
    console.log("db_save", collection);
    if (collections.indexOf(collection) == -1) {
        throw new error("db_save not a valid collection");
    }
    var d = Q.defer();
    col = db[collection];
    col.save(obj, function(err, data) {
        if (err) {
            console.log("db_save e:", err);
            d.reject(err);
        } else d.resolve(data);
    });
    return d.promise;
};

/*---GET functions------*/

// Set the Mobj (Membership Obj) in users on LogIn;
exports.SetKbzs = function(user_id) {
    console.log("iN SetKbzs:", user_id);
    var d = Q.defer();
    if (!user_id) return d.promise;
    db_findOne('users', user_id, {
            memberships: 1
        })
        .then(function(user) {
            user.memberships = user.memberships || {};
            console.log("USER:", user);
            if (user.membership == {}) d.reject({});
            db_find('members', {
                    _id: {
                        $in: user.memberships
                    }
                }, {
                    kbz_id: 1
                })
                .then(function(memberships) {
                    console.log("memberships:", memberships);
                    kbzarr = [];
                    Mobj = [];
                    memberships.forEach(function(membership) {
                        console.log("xxx:", kbzarr, membership);
                        kbzarr.push(membership.kbz_id);
                        Mobj.push(membership);
                    });
                    console.log("kbzarr: ", kbzarr);
                    db_find('kbz', {
                            _id: {
                                $in: kbzarr
                            }
                        }, {
                            "variables.Name.value": 1
                        })
                        .then(function(kbz) {
                            if (!kbz[0]) {
                                d.reject({
                                    err: "kokoko"
                                });
                            } else {
                                for (i = 0; i < Mobj.length; i++) {
                                    Mobj[i].kbz_name = kbz[i].variables.Name.value;
                                }
                                console.log("HHHHH", Mobj);
                                db_updateOne('users', user_id, {
                                    $set: {
                                        'Mobj': Mobj
                                    }
                                }).then(d.resolve);
                            }
                        });
                });
        });
    return d.promise;
};

/*---LOGIC FUNCTIONS------*/

var CreateStatement = function(kbz_id, value, proposal_id) {
    if (!kbz_id || !value || !proposal_id) console.error("CreateStatement parameters are not soficient");
    var d = Q.defer(),
        statement = {};
    statement.kbz_id = kbz_id;
    statement.statement = value;
    statement.status = 1;
    statement.proposals = [proposal_id];
    db_insert('statements', statement)
        .then(function(data, err) {
            if (err) d.reject(err);
            else d.resolve(data);
        });
    return d.promise;
};

var CreatePulse = function(kbz_id) {
    var d = Q.defer(),
        pulse = {};
    pulse.kbz_id = kbz_id;
    pulse.status = 1;
    pulse.Assigned = [];
    pulse.OnTheAir = [];
    pulse.Approved = [];
    pulse.Rejected = [];
    db_insert('pulses', pulse)
        .then(function(data, err) {
            if (err) d.reject(new Error('CreatePulse' + err));
            db_updateOne('kbz', kbz_id, {
                    $set: {
                        "pulses.Assigned": data._id
                    }
                })
                .then(function(data, err) {
                    if (err) d.reject(new Error('CreatePulse' + err));
                    else d.resolve(data);
                });
        });
    return d.promise;
};

var CreateMember = function(kbz_id, user_id, proposal_id) {
    if (!kbz_id) throw "no kbz_id";
    var d = Q.defer(),
        Member = {};
    Member.kbz_id = kbz_id;
    Member.parent = user_id;
    Member.user_id = user_id;
    Member.proposals = (proposal_id ? [proposal_id] : []);
    Member.actions = {
        live: [],
        past: []
    };
    Member.status = 1;
    Member.type = 1;
    db_insert('members', Member)
        .then(function(member, err) {
            if (!member) d.reject(new Error("no member"));
            db_updateOne('users', member.user_id, {
                    $push: {
                        'memberships': member._id
                    }
                })
                .then(db_updateOne('kbz', kbz_id, {
                    $inc: {
                        size: 1
                    },
                    $push: {
                        'memberships': member._id
                    }
                }))
                .then(function(data, err) {
                    if (err) d.reject(new Error('CreateMember' + err));
                    else d.resolve(member);
                });
        });
    return d.promise;
};

var CreateCommitteeMember = function(action_id, member_id, proposal_id) {
    console.log("In CreateCommitteeMember: ", action_id, member_id, proposal_id, !action_id);
    if (!action_id) throw new Error("CreateCommitteeMember: no action");
    var d = Q.defer(),
        Member = {};
    Member.kbz_id = action_id;
    Member.parent = member_id;
    Member.actions = {
        live: [],
        past: []
    };
    Member.status = 1;
    Member.type = 2;
    Member.proposals = [proposal_id];
    db_insert('members', Member)
        .then(function(member) {
            if (!member) throw new Error("CreateCommitteeMember: no member");
            db_updateOne('members', member_id, {
                    $push: {
                        "actions.live": {
                            "member_id": member._id,
                            "action_id": action_id
                        }
                    }
                })
                .then(db_updateOne('kbz', action_id, {
                    $inc: {
                        size: 1
                    },
                    $push: {
                        "memberships": member._id
                    }
                }))
                .then(function(data, err) {
                    if (err) d.reject(err);
                    else d.resolve(member);
                });
        });
    return d.promise;
};


var CreateKbz = function(parent_id, user_id, proposal_id, action_name) {
    var d = Q.defer(),
        kbz = {};
    kbz.parent_id = parent_id;
    kbz.type = (parent_id ? 1 : 0);
    kbz.actions = {
        live: [],
        past: []
    };
    kbz.status = 1;
    kbz.size = 0;
    kbz.pulsesupport = {
        members: [],
        count: 0
    };
    kbz.pulses = {
        Assigned: null,
        OnTheAir: null,
        Past: []
    };
    kbz.proposals = (proposal_id ? [proposal_id] : []);
    kbz.memberships = [];
    db_find('variables', {}, {})
        .then(function(data, err) {
            data[0].Name.value = action_name || 'No Name';
            kbz.variables = data[0];
            db_insert('kbz', kbz)
                .then(function(newkbz, err) {
                    if (err) {}
                    CreatePulse(newkbz._id).then(function(a, b) {});
                    if (kbz.type === 0) {
                        CreateMember(newkbz._id, user_id, 0);
                    }
                    if (err) d.reject(err);
                    else d.resolve(newkbz);
                });
        });
    return d.promise;
};

var CreateAction = function(parent_id, proposal_id, action_name) {
    var d = Q.defer();
    CreateKbz(parent_id, 0, proposal_id, action_name)
        .then(function(newaction, err) {
            db_updateOne('kbz', parent_id, {
                    $push: {
                        "actions.live": newaction._id
                    }
                })
                .then(function(data, err) {
                    if (err) d.reject(err);
                    else d.resolve(data);
                });
        });
    return d.promise;
};


var CreateProposal = function(kbz_id, initiator, title, body, type, uniq) {
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
    Proposal.support = {
        "count": 0,
        "percent": 0,
        "members": []
    };
    Proposal.votes = {
        "pro": 0,
        "against": 0,
        "members": []
    };

    /* Set the specific Proposal fields*/
    if (type == "ME" || type == "EM") {
        Proposal.member_id = uniq.member_id;
    }
    if (type == "CS") {
        Proposal.statement_id = uniq.statement_id;
    }
    if (type == "NS") {
        Proposal.statement = uniq.statement;
    }
    if (type == "RS") {
        Proposal.statement_id = uniq.statement_id;
        Proposal.newstatement = uniq.newstatement;
        Proposal.oldstatement = uniq.oldstatement;
    }
    if (type == "CV") {
        Proposal.variable = uniq.variable;
        Proposal.newvalue = uniq.newvalue;
    }
    if (type == "NA") {
        Proposal.actionname = uniq.actionname;
    }
    if (type == "CA") {
        Proposal.action_id = uniq.action_id;
    }
    if (type == "CM" || type == "OC") {
        Proposal.member_id = uniq.member_id;
        Proposal.action_id = uniq.action_id;
    }
    db_insert('proposals', Proposal)
        .then(function(proposal, err) {
            //console.log("in CreateProposal2",proposal,err);
            if (!(type == "ME")) {
                db_updateOne('members', proposal.initiator, {
                    $push: {
                        "myproposals": proposal._id
                    }
                });
            }

            if (proposal.member_id) {
                db_updateOne('members', proposal.member_id, {
                    $push: {
                        "proposals": proposal._id
                    }
                });
            }

            if (proposal.statement_id) {
                db_updateOne('statements', proposal.statement_id, {
                    $push: {
                        "proposals": proposal._id
                    }
                });
            }

            if (proposal.variable) {
                key = "variables." + proposal.variable + ".proposals";
                variable = {};
                variable[key] = proposal._id;
                db_updateOne('kbz', proposal.kbz_id, {
                    $push: variable
                });
            }

            if (proposal.action_id) {
                db_updateOne('kbz', proposal.action_id, {
                    $push: {
                        "proposals": proposal._id
                    }
                });
            }

            if (err) d.reject(err);
            else d.resolve(proposal);
        });
    return d.promise;
};

var RemoveMember = function(member_id, level) {
    console.log("In RemoveMember:", member_id, level);
    var d = Q.defer();
    db_findAndModify('members', {
            '_id': member_id
        }, {
            $set: {
                "status": 0
            }
        })
        .then(function(member, err) {
            if (err) {}
            db_updateOne('kbz', member.kbz_id, {
                    $pull: {
                        "memberships": member_id
                    },
                    $inc: {
                        size: -1
                    }
                })
                .then(null, console.err);
            if (level === 1) {
                if (member.type === 1) {
                    db_updateOne('users', member.parent, {
                            $pull: {
                                "memberships": member_id
                            }
                        })
                        .then(null, console.err);
                }
                if (member.type === 2) {
                    db_updateOne('members', member.parent, {
                            $pull: {
                                "actions.live": {
                                    "member_id": member._id,
                                    "action_id": member.kbz_id
                                }
                            },
                            $push: {
                                "actions.past": {
                                    "member_id": member._id,
                                    "action_id": member.kbz_id
                                }
                            }
                        })
                        .then(null, console.err);
                }
            }
            member.actions.live.forEach(function(action) {
                i = member.actions.live.indexOf(action);
                member.actions.live.splice(i, 1);
                member.actions.past.push(action);
                db_save('members', member)
                    .then(d.resolve(member));
                RemoveMember(action.member_id, level++)
                    .then(null, console.error);
            });
            console.log("exit recursion", level);
            d.resolve(member);
        });
    return d.promise;
};


var AssignetoPulse = function(proposal, pulse_id) {
    console.log("In AssignetoPulse", proposal._id);
    var d = Q.defer();
    db_updateOne('proposals', proposal._id, {
            $set: {
                "status": 4
            }
        })
        .then(db_updateOne('pulses', pulse_id, {
                $push: {
                    "Assigned": proposal._id
                }
            })
            .then(function(data, err) {
                if (err) d.reject(err);
                else d.resolve(proposal);
            })
        );
    return d.promise;
};

var Support = function(kbz_id, proposal_id, member_id) {
    var d = Q.defer();
    db_update('proposals', {
            "_id": proposal_id,
            "support.members": {
                $nin: [member_id]
            }
        }, {
            $inc: {
                "support.count": 1
            },
            $push: {
                "support.members": member_id
            }
        })
        .then(function(ret, err) {
            if (ret) {
                db_findOne('kbz', kbz_id, {
                        "variables.ProposalSupport.value": 1,
                        "size": 1,
                        "pulses.Assigned": 1
                    })
                    .then(
                        function(kbz, err) {
                            var pulse_id = kbz.pulses.Assigned,
                                ProposalSupport = kbz.variables.ProposalSupport.value,
                                size = kbz.size;
                            db_findOne('proposals', proposal_id)
                                .then(
                                    function(proposal, err) {
                                        var current = proposal.support.count;
                                        var status = proposal.status;
                                        if (status == "3" && (current / size * 100 >= ProposalSupport)) {
                                            AssignetoPulse(proposal, pulse_id).then(null, console.error)
                                                .then(
                                                    function(data, err) {
                                                        if (err) d.reject(err);
                                                        else d.resolve(proposal);
                                                    }
                                                ).then(null, console.error);
                                        }
                                    });
                        });
            } else {
                db_update('proposals', {
                        "_id": proposal_id,
                        "support.members": {
                            $in: [member_id]
                        }
                    }, {
                        $inc: {
                            "support.count": -1
                        },
                        $pull: {
                            "support.members": member_id
                        }
                    })
                    .then(
                        function(data, err) {
                            if (err) d.reject(err);
                            else d.resolve(proposal);
                        });
            }
        });
    return d.promise;
};


var PulseSupport = function(kbz_id, member_id) {
    console.log("In PulseSupport", kbz_id, member_id);
    var d = Q.defer();
    db_findAndModify('kbz', {
            "_id": kbz_id,
            "pulsesupport.members": {
                $nin: [member_id]
            }
        }, {
            $inc: {
                "pulsesupport.count": 1
            },
            $push: {
                "pulsesupport.members": member_id
            }
        })
        .then(
            function(kbz, err) {
                if (kbz) {
                    var current = kbz.pulsesupport.count;
                    var PulseSupport = kbz.variables.PulseSupport.value;
                    var size = kbz.size;
                    if (current / size * 100 >= PulseSupport) {
                        Pulse(kbz_id)
                            .then(
                                function(data, err) {
                                    if (err) d.reject(err);
                                    else d.resolve(proposal);
                                }
                            );
                    }
                } else {
                    db_update('kbz', {
                            "_id": kbz_id,
                            "pulsesupport.members": {
                                $in: [member_id]
                            }
                        }, {
                            $inc: {
                                "pulsesupport.count": -1
                            },
                            $pull: {
                                "pulsesupport.members": member_id
                            }
                        })
                        .then(
                            function(data, err) {
                                if (err) d.reject(err);
                                else d.resolve(proposal);
                            }
                        );
                }
            }
        );
    return d.promise;
};



var Vote = function(proposal_id, member_id, vote) {
    console.log("Vote :", proposal_id, member_id, vote);
    var d = Q.defer(),
        pro = 0,
        against = 0;
    if (vote === 1) {
        pro = 1;
    } else {
        against = 1;
    }
    db_update('proposals', {
            "_id": proposal_id,
            "votes.members": {
                $nin: [member_id]
            }
        }, {
            $inc: {
                "votes.pro": pro,
                "votes.against": against
            },
            $push: {
                "votes.members": member_id
            }
        })
        .then(d.resolve);
    return d.promise;
};


var ExecuteOnTheAir = function(OnTheAir, variables) {
    console.log("IN ExecuteOnTheAir", OnTheAir);
    var d = Q.defer(),
        proposal_id = OnTheAir.OnTheAir.splice(0, 1);
    console.log("IN ExecuteOnTheAir proposal:", proposal_id, !proposal_id[0]);
    if (!proposal_id[0]) d.resolve(OnTheAir); //All OnTheAir Proposals were Proccessed.
    else {
        console.log("IN ExecuteOnTheAir proposal2:", proposal_id[0]);
        db_findOne('proposals', proposal_id[0])
            .then(function(proposal) {
                console.log("IN ExecuteOnTheAir proposal3:", proposal);
                type = proposal.type;
                var variable = variables[type];
                console.log("IN ExecuteOnTheAir proposal4:", proposal.votes, variable.value);
                if (proposal.votes.pro / (proposal.votes.against + proposal.votes.pro) * 100 >= variable.value) { /*proposal had passed*/
                    console.log("approved ", type);
                    ExecuteVertic(proposal)
                        .then(function(vertic) {
                            console.log("IN ExecuteOnTheAir proposal5: REturned from EV", vertic);
                            proposal.status = "7"; /* Approved */
                            OnTheAir.Approved.push(proposal._id);
                            db_save('proposals', proposal).then(null, console.error);
                            //console.log("111:",OnTheAir.OnTheAir.length,OnTheAir.Rejected.length, OnTheAir.Approved.length);
                            d.resolve(ExecuteOnTheAir(OnTheAir, variables));
                        });
                } else { /*proposal had been rejected*/
                    console.log("Rejected", proposal.type);
                    proposal.status = "8"; /* rejected */
                    OnTheAir.Rejected.push(proposal._id);
                    db_save('proposals', proposal).then(null, console.error);
                    //console.log("222:",OnTheAir.OnTheAir.length,OnTheAir.Rejected.length, OnTheAir.Approved.length);
                    d.resolve(ExecuteOnTheAir(OnTheAir, variables));
                }
            });
    }
    return d.promise;
};

var PulseOnTheAir = function(pulse_id, variables) {
    console.log("IN PulseOnTheAir", pulse_id);
    //if(!pulse_id) {console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");q.resolve(1);}
    var d = Q.defer();
    db_findOne('pulses', pulse_id).fail(d.resolve)
        .then(function(OnTheAir) {
            OnTheAir.status = 3;
            console.log("IN PulseOnTheAir !OnTheAir.OnTheAir[0]", !OnTheAir.OnTheAir[0]);
            if (!OnTheAir.OnTheAir[0]) {
                db_save('pulses', OnTheAir).then(d.resolve);
            }
            //db_find('proposals',{$in : OnTheAir.OnTheAir})
            //  .then(function(proposals){
            ExecuteOnTheAir(OnTheAir, variables)
                .then(function(OnTheAir) {
                    console.log("IN PulseOnTheAir return ontheair: ", OnTheAir);
                    OnTheAir.OnTheAir = [];
                    db_save('pulses', OnTheAir).then(d.resolve);
                });
        });
    return d.promise;
};


var Age = function(kbz_id, maxage) {
    console.log("IN Age", kbz_id, maxage);
    var d = Q.defer();
    db_update('proposals', {
            "kbz_id": kbz_id,
            "status": "3",
            "age": {
                $gt: maxage
            }
        }, {
            $set: {
                "status": "5"
            }
        })
        .then(db_update('proposals', {
                "kbz_id": kbz_id,
                status: "3"
            }, {
                $inc: {
                    "age": 1
                }
            })
            .then(d.resolve).fail(d.resolve)
        );
    return d.promise;
};


var Pulse = function(kbz_id) {
    console.log("IN Pulse", kbz_id);
    var d = Q.defer();
    db_findOne('kbz', kbz_id)
        .then(function(kbz) {
            Age(kbz_id, kbz.variables.MaxAge.value)
                .then(PulseOnTheAir(kbz.pulses.OnTheAir, kbz.variables)
                    .then(
                        db_findOne('pulses', kbz.pulses.Assigned)
                        .then(function(Assigned, err) {
                            db_update('proposals', {
                                    "_id": {
                                        $in: Assigned.Assigned
                                    }
                                }, {
                                    $set: {
                                        "status": "6"
                                    }
                                })
                                .then(function() {
                                    Assigned.status = 2;
                                    Assigned.OnTheAir = Assigned.Assigned;
                                    Assigned.Assigned = [];
                                    db_save('pulses', Assigned)
                                        .then(function() {
                                            CreatePulse(kbz_id);
                                            kbz.pulses.Past.push(kbz.pulses.OnTheAir);
                                            kbz.pulses.OnTheAir = kbz.pulses.Assigned;
                                            kbz.pulsesupport = {
                                                count: 0,
                                                members: []
                                            };
                                            db_save('kbz', kbz)
                                                .then(d.resolve());
                                        });
                                });
                        }))
                );
        });
    return d.promise;
};


var ExecuteVertic = function(proposal) {
    var d = Q.defer();
    console.log("executing proposal type: ", proposal.type);
    if (proposal.type == "ME") {
        CreateMember(proposal.kbz_id, proposal.initiator, proposal._id)
            .then(d.resolve);
    }
    if (proposal.type == "EM" || proposal.type == "OC") {
        RemoveMember(proposal.member_id, 1)
            .then(d.resolve);
    }
    if (proposal.type == "NS") {
        CreateStatement(proposal.kbz_id, proposal.statement, proposal._id)
            .then(d.resolve).fail(console.log);
    }
    if (proposal.type == "CS") {
        db_updateOne('statements', proposal.statement_id, {
                $set: {
                    "status": 0
                }
            })
            .then(d.resolve).fail(console.log);
    }
    if (proposal.type == "RS") {
        db_updateOne('statements', proposal.statement_id, {
                $set: {
                    "statement": proposal.newstatement
                }
            })
            .then(d.resolve);
    }
    if (proposal.type == "CV") {
        key = "variables." + proposal.variable + ".value";
        variable = {};
        variable[key] = proposal.newvalue;
        db_updateOne('kbz', proposal.kbz_id, {
                $set: variable
            })
            .then(d.resolve);
    }
    if (proposal.type == "NA") {
        CreateAction(proposal.kbz_id, proposal._id, proposal.action_name)
            .then(d.resolve);
    }
    if (proposal.type == "CA") {
        db_updateOne('kbz', proposal.action_id, {
                $set: {
                    "status": 0
                }
            })
            .then(db_updateOne('kbz', proposal.kbz_id, {
                $pull: {
                    "actions.live": proposal.action_id
                },
                $push: {
                    "actions.past": proposal.action_id
                }
            }).then(d.resolve));
    }
    if (proposal.type == "CM") {
        CreateCommitteeMember(proposal.action_id, proposal.member_id, proposal._id)
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
        "db_find('members',{}).then(function(members){vars.m = members;console.log('mmmmmmmmm',m);});",
        "db_findOne('kbz',vars.kbz._id).then(function(d){vars.kbz = d})",
        "db_find('statements',{}).then(function(d){vars.statement = d[0]});",
        "CreateProposal(vars.kbz._id,vars.m[1]._id,'i want in action','let me in actionn','CM',{member_id :vars.m[1]._id , action_id : vars.kbz.actions.live[0]}).then(function(d){vars.p5 = d});",
        "CreateProposal(vars.kbz._id,vars.m[2]._id,'i want in action too','let me in actionn too','CM',{member_id :vars.m[2]._id , action_id : vars.kbz.actions.live[0]}).then(function(d){vars.p12 = d});",
        "CreateProposal(vars.kbz._id,vars.m[1]._id,'Evil is good','dont tell us what we are not!','RS',{statement_id : vars.statement._id , newstatement : 'we are Evil!',oldstatement : vars.statement.statement}).then(function(d){vars.p6 = d});",
        "Support(vars.kbz._id,vars.p5._id,vars.m[0]._id).then(console.log, console.error);",
        "Support(vars.kbz._id,vars.p12._id,vars.m[2]._id).then(console.log, console.error);",
        "Support(vars.kbz._id,vars.p6._id,vars.m[1]._id).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[2]._id).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[1]._id).then(console.log, console.error);",
        "CreateProposal(vars.kbz._id,vars.m[2]._id,'i want out','let me out','EM',{member_id : vars.m[1]._id}).then(function(p7){vars.p7 = p7}).fail(console.log);",
        "CreateProposal(vars.kbz._id,vars.m[1]._id,'cancel it!','Cancel it now!!','CS',{statement_id : vars.statement._id}).then(function(p8){vars.p8 = p8}).fail(console.log);",
        "Vote(vars.p5._id,vars.m[1]._id,1).then(console.log, console.error);",
        "Vote(vars.p12._id,vars.m[0]._id,1).then(console.log, console.error);",
        "Vote(vars.p5._id,vars.m[0]._id,1).then(console.log, console.error);",
        "Vote(vars.p6._id,vars.m[1]._id,1).then(console.log, console.error);",
        "Support(vars.kbz._id,vars.p7._id,vars.m[1]._id).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[2]._id).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[1]._id).then(console.log, console.error);",
        "Support(vars.kbz._id,vars.p8._id,vars.m[1]._id).then(console.log, console.error);",
        "Vote(vars.p7._id,vars.m[0]._id,1).then(console.log, console.error);",
        "Vote(vars.p8._id,vars.m[1]._id,1).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[2]._id).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[1]._id).then(console.log, console.error);",
        "db_find('members',{'type' : 2 , 'status' : 1}).then(function(members){vars.m2 = members;});",
        "CreateProposal(vars.kbz._id,vars.m[0]._id,'throw out','let him out','OC',{member_id : vars.m2[0]._id}).then(function(p13){vars.p13 = p13}).fail(console.log);",
        "CreateProposal(vars.kbz._id,vars.m[0]._id,'End Action','let it end','CA',{action_id : vars.kbz.actions.live[0]}).then(function(p15){vars.p15 = p15}).fail(console.log);",
        "Support(vars.kbz._id,vars.p15._id,vars.m[0]._id).then(console.log, console.error);",
        "Support(vars.kbz._id,vars.p13._id,vars.m[0]._id).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[0]._id).then(console.log, console.error);",
        "Vote(vars.p15._id,vars.m[0]._id,1).then(console.log, console.error);",
        "Vote(vars.p13._id,vars.m[0]._id,1).then(console.log, console.error);",
        "PulseSupport(vars.kbz._id,vars.m[0]._id).then(console.log, console.error);",
    ];

function run(cmd) {
    console.log('executing: ' + cmd[0]);
    eval(cmd[0]);
}

function async(cmd, cb) {
    console.log('executing: ' + cmd);
    eval(cmd);
    setTimeout(function() {
        cb();
    }, 800);
}
// Final task (same in all the examples)
function final() {
    console.log('Done');
}

function runCommand(item) {
    if (item) {
        async(item, function() {
            return runCommand(cmds.shift());
        });
    } else {
        return final();
    }
}

exports.runit = function() {
    runCommand(cmds.shift());
};

exports.next = function() {
    run(cmds.splice(0, 1));
};

exports.vars = vars;

exports.init = function() {
    db.users.remove();
    db.variables.remove();
    db.users.insert({
        "_id": "cagKxnstgePZeZayC",
        "createdAt": "2014-04-06T12:07:27.393Z",
        "services": {
            "password": {
                "srp": {
                    "identity": "bmmmyiwRZhz349CZB",
                    "salt": "39gXBdi9d7sSmcaGa",
                    "verifier": "15dfdaa77bdd1684fa91be7f691ada1902c5e7063291bb691be61333364f85de4dfd66cb9fab4e6b9d27b485f31677ca7c10bdbca98e76e21585c5cfd87bbb44d8dbaf6a4ed715bc873c932061d2d9fde79fa02c2e64a43abcc8fc35f316bff7ffca0d7901c4a2665c6e77c28b872692d447b0a06ab37a88f9858462f3f570a8"
                }
            },
            "resume": {
                "loginTokens": [{
                    "when": "2014-04-06T12:07:27.438Z",
                    "hashedToken": "oZj84hHpJobJF/47bzasw4dolbj2/9lHAg+BrmSX6LE="
                }]
            }
        },
        "username": "user12"
    });
    db.users.insert({
        "_id": "wreXwy4x43w6jCoEB",
        "createdAt": "2014-04-13T05:27:18.105Z",
        "services": {
            "password": {
                "srp": {
                    "identity": "NymyC2ztffbEJrdwf",
                    "salt": "Hrkvm2H3Zzi6pJadb",
                    "verifier": "4f18b5fcffc277a01ac2b716b13bdbd629526b573bd9b0d728ade849aff1d653c248778b5489c7e2d272b248fb243cad81ad366d220464c2e34a98227631d73f4e8cd3509bbc3a9f9b2cc428e51edf77d9aa15ff37ece9983fab3e1eff69d681c74d15776e9233f7fc1ce43731a269fd82a017387a6baafbe1d85ab62c79d32a"
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "username": "user11"
    });
    db.users.insert({
        "_id": "KxuWNEXdLMQweuJcS",
        "createdAt": "2014-04-13T05:27:35.919Z",
        "services": {
            "password": {
                "srp": {
                    "identity": "8a9tiZs7ajNEryboK",
                    "salt": "9Z643Yj6WCGotm5za",
                    "verifier": "86c9b857870e4fe67b52c9c8507f42f264579123573454fad330425f8b267196482e0681effe54acf85f8affc7c143d16bbe34516a81ad950594c66e90577ea8836b00daee278bd258948c674bf5d263c17f6b59990c46f00de40a31a06df34e23fb0b2cc69bc6228dbfcf47568bf513e9770713a846e21eb589623d232fcf8d"
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "username": "user13"
    });
    db.users.insert({
        "_id": "i6JWSuDMLSd23hvPF",
        "createdAt": "2014-04-13T05:27:58.164Z",
        "services": {
            "password": {
                "srp": {
                    "identity": "ZrBxqpx9LrbpEwArx",
                    "salt": "Ck9uBEXQeGGzoFj8t",
                    "verifier": "e419f823e42d9a1c564a3ef8fd3ac67dd9a30298469ee0a1a7bcc1a9e8b2aca8b08df8c46e3c009e6cd5f15d1f74d3c163f9f8922ba715a749dede10fceac381852188675e0f0e09fff22c9404d85b9f1725dd329c72a207f29d4f068a4025b13456fd0d9e032f8c600751e95fd57f0df1327106c918b9658d1ec140ad4fc7b2"
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "username": "user14"
    });

    db_insert('variables', {
        "PulseSupport": {
            "type": "PUS",
            "name": "Pulse Support",
            "value": 50,
            "desc": "The precentage of members support nedded to execute a pulse.",
            "proposals": []
        },
        "ProposalSupport": {
            "type": "PS",
            "name": "Proposal Support",
            "value": 15,
            "desc": "The precentage of members support nedded to assiged a Proposal to a pulse.",
            "proposals": []
        },
        "CV": {
            "type": "CV",
            "name": "Change Variable",
            "value": 50,
            "desc": "The precentage of members vote nedded for changing a Variable value.",
            "proposals": []
        },
        "ME": {
            "type": "ME",
            "name": "Membership",
            "value": 50,
            "desc": "The precentage of members vote nedded to grant Membership to a User.",
            "proposals": []
        },
        "EM": {
            "type": "EM",
            "name": "End Membership",
            "value": 60,
            "desc": "The precentage of members vote nedded to Revoke Membership to a User.",
            "proposals": []
        },
        "NS": {
            "type": "NS",
            "name": "New Statement",
            "value": 50,
            "desc": "The precentage of members vote nedded to accept a new Statement.",
            "proposals": []
        },
        "CS": {
            "type": "CS",
            "name": "Cancel Statement",
            "value": 60,
            "desc": "The precentage of members vote nedded to Cancel Statement.",
            "proposals": []
        },
        "NA": {
            "type": "NA",
            "name": "New Action",
            "value": 50,
            "desc": "The precentage of members vote nedded to accept a new Action.",
            "proposals": []
        },
        "CA": {
            "type": "CA",
            "name": "Cancel Action",
            "value": 60,
            "desc": "The precentage of members vote nedded to Cancel Action.",
            "proposals": []
        },
        "RS": {
            "type": "RS",
            "name": "Replace Statement",
            "value": 60,
            "desc": "The precentage of members vote nedded to Replace Statement.",
            "proposals": []
        },
        "CM": {
            "type": "CM",
            "name": "Committee Member",
            "value": 50,
            "desc": "The precentage of members vote nedded for assigning a Member to an Action.",
            "proposals": []
        },
        "OC": {
            "type": "OC",
            "name": "Out Of Committee",
            "value": 50,
            "desc": "The precentage of members vote nedded for throw a Member from an Action.",
            "proposals": []
        },
        "MinCommittee": {
            "type": "MinC",
            "name": "MinCommittee",
            "value": 2,
            "desc": "The Minimun size of an Action Committee.",
            "proposals": []
        },
        "MaxAge": {
            "type": "MaxAge",
            "name": "MaxAge",
            "value": 2,
            "desc": "The Maximim 'OutThere' Proposal Age (in Pulses).",
            "proposals": []
        },
        "Name": {
            "type": "Name",
            "name": "Name",
            "value": "No Name",
            "desc": "The Communitty Name.",
            "proposals": []
        }
    });
};

var dbUrl = "test";
var collections=["test","actions","members","pulse","proposals","statements","variables"];
var db = require("mongojs").connect(dbUrl,collections);

export  ObjectId = db.ObjectId;
export  actions = db.actions;
export  proposals = db.proposals;
export  variables = db.variables;
export  statements = db.statements;
export  pulse = db.pulse;
export  members = db.members;



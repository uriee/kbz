var logic = require("../logic.js")
  , should = require('should');
var mongoUri = 'mongodb://localhost/kbztest';
var collections=["users","kbz","actions","members","pulses","proposals","statements","variables"];
var db = require("mongojs").connect(mongoUri,collections);
var ObjectId = db.ObjectId;
var assert = require("assert")

/*
kbz= {};
logic.CreateKbz(db,0,function(err,kbz){
  describe('Tests', function(){
    describe('kbz', function(){
      it('should have ', function(){
        kbz.should.have.property('pulses');
        kbz.should.have.property('actions');
        kbz.should.have.property('status',1);
        
      })
      
    })
  });
});
*/


describe("kbz", function(){

  before(function(done){
    //add some test data    
    db.kbz.remove();
    db.pulses.remove();
    db.proposals.remove

      done();
    });

  
  it("kbz build", function(done){
    logic.CreateKbz(db,0,function(err,ret){
      kbz = ret[0];
      kbz.should.have.property('actions');
      kbz.should.have.property('status',1);
      kbz.should.have.property('variables');
      pulse_id = kbz.pulses.Assigned;
      should.exist(pulse_id);
      Object.keys(kbz.variables).should.have.length(17);
      logic.CreateMember(db,kbz._id, ObjectId("51e7a279c2d01683e5d75e36"),function(err,ret){
        console.log(ret);
      });
      done();
    }, function(message){
      message.should.equal(null);
      done();
    });
  });

});



/* 
describe("tests", function(){
  var userid = ObjectId("51c6a87e8ba283f6704ee832");
  it("Create Kbz", function(done){
    logic.CreateKbz(db,0,function(err,kbz){
      it("kbz status",function(){
        kbz.should.have.property('status', 1);
      });
      it("kbz variables",function(){
        kbz.should.have.property('variables').with.lengthOf(12);
      });
      done();
  }); 
    }, function(message){
      message.should.equal(null);
      done();
    });
  });
*/

/*
  it("retrieves by email", function(done){
    customer.findByEmail(currentCustomer.email, function(doc){
      doc.email.should.equal("test@test.com");
      done();
    });
  });

  it("authenticates and returns fail with invalid login", function(done){
    customer.authenticate(currentCustomer.email, "liar", function(customer){
      throw("This shouldn't happen");
    }, function(){
      done();
    });
  });
});
*/
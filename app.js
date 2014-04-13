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
}

function findByUsername(username, cb) {
  db.users.find({"username":username},function(err,ret){
    if(!err){
      cb(null, ret[0]);
    }
    else {
      cb(null, null);
    }
  });
}


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
      });
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
  res.redirect('/login');
}

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
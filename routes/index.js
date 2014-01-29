
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

exports.angular = function(req, res){
  res.render('angular');
};

exports.login = function(req, res){
  res.render('login', { title: 'Express' });
};




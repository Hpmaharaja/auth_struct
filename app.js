var bodyParser = require('body-parser');
var express = require('express');
var mongoose = require('mongoose');
var sessions = require('client-sessions');
var port = process.env.VCAP_APP_PORT || 3000;

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User = mongoose.model('User', new Schema({
	id: ObjectId,
	email: {type: String, unique: true},
	password: String
	})); 

var app = express();
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.locals.pretty = true;

//connect to mongo
mongoose.connect('mongodb://localhost/newauth')

//middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));
app.use(sessions({
	cookieName: 'session',
	secret: 'dafndsafnfsdna',
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000
	//httpOnly: true // dont let browser access cookies ever
	//secure: true //only use cookies over https
	//ephemeral: true
}));

app.use(function(req,res, next) {
	if (req.session && req.session.user) {
		User.findOne({ email: req.session.user.email }, function(err, user) {
			if(user) {
				req.user = user;
				delete req.user.password;
				req.session.user = req.user;
				res.locals.user = req.user;
			}
			next();
		});
	} else {
		next();
	}
});

function requireLogin(req, res, next) {
	if (!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
}

app.get('/',function(req, res) {
	res.render('./index.html');
});

app.get('/register',function(req,res) {
	res.render('./register.html');
});

app.post('/register', function(req,res) {

	var user = new User({
		email: req.body.email,
		password: req.body.password
	});
	user.save(function(err) {
		if(err) {
			var err = 'Something bad happened! Try again!';
			if (err.code === 11000) {
				error = 'That email is already taken, try another.'
			}
			res.render('./register.html', { error: err});
		} else {
			res.redirect('/dashboard');
		}
	});
});

app.get('/login', function(req,res) {
	res.render('login.html');
});

app.post('/login', function(req,res) {
	User.findOne({email: req.body.email }, function (err, user) {
		if (!user) {
			res.render('login.html', { error: 'Invalid email or password.'});	
		} else {
			if (req.body.password == user.password) {
				req.session.user = user; //set-cookie: session={email: '....', password: '...'}
				res.redirect('/dashboard');
			} else {
				res.render('login.html', { error: 'Invalid email or password.' });
			}
		}
	});
});

app.get('/dashboard', requireLogin, function(req,res) {
	res.render('dashboard.html');
});

app.get('/logout', function(req,res) {
	req.session.reset();
	res.redirect('/');
});
app.listen(port);
console.log('Login App listening on port ' + port);
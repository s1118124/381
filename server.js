var express = require('express');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://developer:developer@ds033046.mlab.com:33046/s1118124';
var session = require('express-session');
var fileUpload = require('express-fileupload');
var url  = require('url');

app = express();

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';
var SECRETKEY3 = 'I want to pass COMPS381F';

var users = new Array(
	{userid: 'developer', password: 'developer'},
	{userid: 'guest', password: 'guest'}
);

app.set('view engine','ejs');

app.use(cookieSession({
  userid: 'session', //cookie id
  keys: [SECRETKEY1,SECRETKEY2]
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) { //if not login, no autheticated attribute
		res.redirect('/login');
	}
	//res.status(200).end('Hello, ' + req.session.userid + '!  This is a secret page!');
	res.redirect('/read');
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

var login_id = null;
app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].userid == req.body.userid &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.userid = users[i].userid;
			login_id = req.session.userid;
		}
	}
	res.redirect('/');
});

app.get('/logout',function(req,res) {
	req.session = null;  //make session has no info
	login_id = null;
	res.redirect('/');
});

//restaurants
app.use(fileUpload());
app.use(bodyParser.json());
app.use(session({
	secret: SECRETKEY3,
	resave: true,
	saveUninitialized: true
}));

//may need to fit the request as: GET /api/read
app.get("/read", function(req, res) {
	//var restaurants = [];
	MongoClient.connect(mongourl, function(err, db) {
	assert.equal(err,null);
	console.log('Connected to MongoDB\n');
	db.collection('restaurants').find().toArray(function(err, result){
			if (err) throw err
				console.log(result);
				res.render("list", {restaurants: result});
		})	
	db.close();
	console.log('Disconnected MongoDB\n');
	});
});

app.get('/details', function(req,res) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').find().toArray(function(err, result){
			if (req.query.id != null) {
				for (var i=0; i<result.length; i++) {
					if (result[i]._id == req.query.id) {
						var r = result[i];
						break;
					}
				}
				if (result != null) {
					res.render('details', {restaurants: r, username: login_id});
				} else {
					res.status(500).end(req.query.id + ' not found!');
				}
			} else {
				res.status(500).end('id missing!');
			}
		});
		db.close();
		console.log('Disconnected MongoDB\n');

	});
});
app.get('/new', function(req, res){
	res.sendFile(__dirname + '/public/new.html');
});

//add code for create new
//may need to fit the request as: POST /api/create
app.post('/create', function(req, res){
        //do sth to create
    var mimetype = null; //added at 2353
	var r = {};  // new restaurant to be inserted
	r['address'] = {};
	r.address.street = (req.body.street != null) ? req.body.street : null;
	r.address.zipcode = (req.body.zipcode != null) ? req.body.zipcode : null;
	r.address.building = (req.body.building != null) ? req.body.building : null;
	r.address['coord'] = [];
	r.address.coord.push(req.body.lon);
	r.address.coord.push(req.body.lat);
	r['borough'] = (req.body.borough != null) ? req.body.borough : null;
	r['cuisine'] = (req.body.cuisine != null) ? req.body.cuisine : null;
	r['name'] = (req.body.name != null) ? req.body.name : null;
	r['photo'] = {};
	r.photo.mimetype = (req.files.mimetype != null) ? req.files.mimetype : null;
	r.photo.data = (req.files.data != null) ? req.files.data : null;
	r['username'] = req.session.userid;

	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').insertOne(r,
			function(err,result) {
				assert.equal(err,null);
				console.log("insertOne() was successful _id = " +
					JSON.stringify(result.insertedId));
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('Insert was successful ' + JSON.stringify(r));
			});
	});
	res.render('details', {restaurants : r});
});

app.get('/change', function(req, res){
	MongoClient.connect(mongourl, function(err, db) {
		console.log('Connected to MongoDB\n');
		var a_r = null;
			db.collection('restaurants').find().toArray(function(err, result){
			if (req.query.id != null) {
				for (var i=0; i<result.length; i++) {
					if (result[i]._id == req.query.id) {
						a_r = result[i];
						break;
					}
				}
				if (result != null) {
					console.log('You are:' + login_id);
					console.log('right userid:' + a_r.username);
					if (a_r != null) {
						if (a_r.username == login_id) {
							res.sendFile(__dirname + '/public/change.html');
							db.close();
							console.log('Disconnected from MongoDB\n');
						} else {
							res.status(500).end('You are not authorized to edit!');
						}
					} else {
						res.status(500).end('userid missing!');
					}
				} else {
					res.status(500).end(req.query.id + ' not found!');
				}
			} else {
				res.status(500).end('id missing!');
			}
	});
	});
});

app.post('/change', function(req, res){
	login_id = req.session.userid;
	var mimetype = null; //added at 2353
	var r = {};  
	r['address'] = {};
	r.address.street = (req.body.street != null) ? req.body.street : null;
	r.address.zipcode = (req.body.zipcode != null) ? req.body.zipcode : null;
	r.address.building = (req.body.building != null) ? req.body.building : null;
	r.address['coord'] = [];
	r.address.coord.push(req.body.lon);
	r.address.coord.push(req.body.lat);
	r['borough'] = (req.body.borough != null) ? req.body.borough : null;
	r['cuisine'] = (req.body.cuisine != null) ? req.body.cuisine : null;
	r['name'] = (req.body.name != null) ? req.body.name : null;
	r['photo'] = {};
	r.photo.mimetype = (req.files.mimetype != null) ? req.files.mimetype : null;
	r.photo.data = (req.files.data != null) ? req.files.data : null;
	r['username'] = (login_id != null) ? login_id : null; 

	MongoClient.connect(mongourl, function(err, db) {
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').save(
			{_id : ObjectId, name : r.name, cuisine : r.cuisine, address : r.address, mimetype : r.mimetype, photo : r.photo, username : login_id});
		console.log('updated\n');
		db.close();
		console.log('Disconnected from MongoDB\n');
		console.log("update() was successful _id = ");
		res.render('details', {restaurants: r});
	});
});

app.get('/rate', function(req, res){
	res.sendFile(__dirname + '/public/rate.html');
});

app.post('/rate',function(req,res) {
	
	res.render('details', {restaurants: r, rate: []});
});

app.get('/remove', function(req, res){
		MongoClient.connect(mongourl, function(err, db) {
		console.log('Connected to MongoDB\n');
		db.collection('restaurants', {}, function(err, restaurants){
			restaurants.remove({_id : ObjectId}, function(err, result){
				if (err) {
					console.log(err);
				}
				console.log(result);
				db.close();
			})
		})
		});
		res.render('remove');
});

app.get('/findName', function(req, res){
	res.render('findName');
});


app.post('/findName', function(req, res){
	var keyword = req.body.search;
	console.log(keyword);
	MongoClient.connect(mongourl, function(err, db) {
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').find({"name" : keyword }).toArray(function(err, result){
			if (err) throw err
				console.log(result);
				res.render('searchResult', {restaurants: result});
		})
		db.close();

	})
});

app.get('/findCuisine', function(req, res){
	res.render('findCuisine');
});


app.post('/findCuisine', function(req, res){
	var keyword = req.body.search;
	console.log(keyword);
	MongoClient.connect(mongourl, function(err, db) {
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').find({"cuisine" : keyword }).toArray(function(err, result){
			if (err) throw err
				console.log(result);
				res.render('searchResult', {restaurants: result});
		})
		db.close();

	})
});

app.get('/findBorough', function(req, res){
	res.render('findBorough');
});


app.post('/findBorough', function(req, res){
	var keyword = req.body.search;
	console.log(keyword);
	MongoClient.connect(mongourl, function(err, db) {
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').find({"borough" : keyword }).toArray(function(err, result){
			if (err) throw err
				console.log(result);
				res.render('searchResult', {restaurants: result});
		})
		db.close();

	})
});

app.listen(process.env.PORT || 8099);

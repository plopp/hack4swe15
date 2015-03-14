var fs = require('fs');
var express = require('express');
var app = express();

// http://localhost:8080/1/layer1.json?lat0=0&lng0=4&lat1=3&lng1=2
app.get('/1/layer1.json', function (req, res) {
	var json = fs.readFileSync('mockdata/layer1.json', 'UTF-8');
	var data = JSON.parse(json);
	var lat0 = req.params.lat0 || 0;
	var lng0 = req.params.lng0 || 0;
	var lat1 = req.params.lat1 || 0;
	var lng1 = req.params.lng1 || 0;
	data.region = {
		topleft: {
			lat: lat0,
			lng: lng0
		},
		bottomright: {
			lat: lat1,
			lng: lng1
		}
	}
	data.image = '/1/layer1.jpg';
	res.send(data);
});

app.get('/1/layer1.jpg', function (req, res) {
	var bin = fs.readFileSync('mockdata/layer1.jpg', 'binary');
	res.header('Content-type', 'image/jpeg');
	res.end(bin, 'binary');
});

app.use(express.static(__dirname + '/../web'));

var server = app.listen(8080, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Geohaxxors listening at http://%s:%s', host, port);
});



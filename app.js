var fs = require('fs');
var express = require('express');
var app = express();

var layers = [
	'backar',
	'berg',
	'forn',
	'forndist',
	'hojd',
	'karta',
	'osamjord',
	'skog',
	'urberg',
	'vag',
	'vatten'
];

app.get('/1/layers', function (req, res) {
	var data = {
		layers: layers.map(function(layer) {
			return {
				id: layer,
				data: '/1/layers/' + layer,
				image: '/1/layers/' + layer + '/bitmap'
			}
		})
	}
	res.send(data);
});

// http://localhost:8080/1/layer1.json?lat0=0&lng0=4&lat1=3&lng1=2
app.get('/1/layers/:id', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('mockdata/' + id + '.json', 'UTF-8');
	var data = JSON.parse(json);
	var lat0 = req.params.lat0 || 0;
	var lng0 = req.params.lng0 || 0;
	var lat1 = req.params.lat1 || 0;
	var lng1 = req.params.lng1 || 0;
	data.region = {
		northwest: { lat: lat0, lng: lng0 },
		southeast: { lat: lat1, lng: lng1 }
	};
	data.image = '/1/layers/'+id+'/bitmap';
	delete(data.filename);
	delete(data.filetype);
	res.send(data);
});

app.get('/1/layers/:id/bitmap', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('mockdata/' + id + '.json', 'UTF-8');
	var data = JSON.parse(json);
	var bin = fs.readFileSync('mockdata/' + data.filename, 'binary');
	res.header('Content-type', data.filetype);
	res.end(bin, 'binary');
});

app.use(express.static(__dirname + '/web'));

var server = app.listen(process.env.PORT || 3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Geohaxxors listening at http://%s:%s', host, port);
});

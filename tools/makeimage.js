var fs = require('fs');
var png = require('png');

var width = 64;
var height = 64;
var pixels = [];

var sw = [ 60.619197236209565, 15.63852310180664 ];
var ne = [ 60.655159784262224, 15.746927261352539 ];

function lerp(x, xmin, xmax, outmin, outmax) {
  x = (x - xmin) / (xmax - xmin);
  // x = Math.max(0, Math.min(1,  x));
  x = (x * (outmax - outmin)) + outmin;
  return x;
}

var points = fs.readFileSync('hdb_66_4.latlon', 'UTF-8').split('\n').map(function(line) {
	var segs = line.split(' ');
	var x = parseFloat(segs[0]);
	var y = parseFloat(segs[1]);
	var h = parseFloat(segs[2]);
	var px = lerp(x, sw[0], ne[0], 0, width-1);
	var py = lerp(y, sw[1], ne[1], 0, height-1);
	return { x: x, px: px, y: y, py: py, h: h };
});

console.log(points.length);
console.log(points[0]);

for(var j=0; j<height * width; j++) {
	pixels.push(0);
}

var max_h = -9999;
var min_h = 9999;

points.forEach(function(p) {
	var xx = Math.round(p.px);
	var yy = Math.round(p.py);
	if (xx >= 0 && yy >= 0 && xx < width && yy < height) {
		if (p.h > max_h) max_h = p.h;
		if (p.h < min_h) min_h = p.h;
	}
});

console.log(min_h, max_h);

points.forEach(function(p) {
	var xx = Math.round(p.px);
	var yy = Math.round(p.py);
	if (xx >= 0 && yy >= 0 && xx < width && yy < height) {
		var hh = Math.round(lerp(p.h, min_h, max_h, 0, 255));
		pixels[yy * width + xx] = hh;
	}
});

var fixed_png = new png.Png(new Buffer(pixels), width, height, 'gray');

fixed_png.encode(function(data) {
	fs.writeFileSync('height.png', data, 'binary');
});

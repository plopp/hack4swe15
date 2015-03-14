var converteur = require('./gausskruger');
converteur.swedish_params('sweref_99_tm');

var min_x = 0;
var min_y = 0;
var max_x = 999;
var max_y = 999;

if (process.argv.length == 6) {
	min_x = parseFloat(process.argv[2]);
	min_y = parseFloat(process.argv[3]);
	max_x = parseFloat(process.argv[4]);
	max_y = parseFloat(process.argv[5]);
} else {
	console.log('Syntax: cat hdb_66_4.xyz | node sweref_height_to_latlng.js 60.619 15.637 60.656 15.747 > hdb_66_4.latlon');
	process.exit(1);
}

// cat hdb_66_4.xyz | node sweref_height_to_latlng.js 60.619197236209565 15.63852310180664 60.655159784262224 15.746927261352539 > hdb_66_4.latlon

// var sw = 60.619197236209565 15.63852310180664
// var ne = 60.655159784262224 15.746927261352539

/*
500000,5 6856672,0 452,61
500000,5 6800141,9 290,72
500000,5 6888860,8 268,62
500000,5 6808239,1 271,22
500000,5 6832480,5 410,51
500000,5 6804190,5 273,62
*/

function processLine(line) {
	var s = line.replace(/,/ig, '.').split(' ');
	if (s.length != 3)
		return;

	var y = parseFloat(s[0]);
	var x = parseFloat(s[1]);
	var h = parseFloat(s[2]);
	var out = converteur.grid_to_geodetic(x, y);
	if (out[0] < min_x || out[1] < min_y || out[0] > max_x || out[1] > max_x)
		return;

	console.log(out[0] + ' ' + out[1] + ' ' + h);
}

var last = "";

process.stdin.on('data', function(chunk) {
    var lines, i;
    lines = (last + chunk).split("\n");
    for(i = 0; i < lines.length - 1; i++) {
        processLine(lines[i]);
    }
    last = lines[i];
});

process.stdin.on('end', function() {
    processLine(last);
});

process.stdin.resume();


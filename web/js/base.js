(function(w,d) {


	function pathFinder() {}

	function jsonGet(url,cb) {
		var request = new XMLHttpRequest();
		request.open('GET', url, true);

		request.onload = function() {
		  if (request.status >= 200 && request.status < 400) {
		    // Success!
		    var data = JSON.parse(request.responseText);
		    cb(data);
		  } else {
		    // We reached our target server, but it returned an error

		  }
		};

		request.onerror = function() {
		  // There was a connection error of some sort
		};

		request.send();
	}

	pathFinder.prototype.init = function(map,cb) {
		var t = this;
		t.canvas = addElm('canvas');
		t.canvas.width = size.width;
		t.canvas.height = size.height;
		t.changeCallback = cb;
		t.ctx = t.canvas.getContext('2d');
		t.layerMultiplier = {};
		t.layerEnabled = {};
		t.layer = {};
		t.map = map;
		t.showDebug = true;
		t.outData = [];
		/*for(var y =0;y<size.height;y++) {
			var line = [];
			t.outData.push(line);
			for(var x =0;x<size.width;x++)
				line.push(0);
		}
		*/
		t.obj = {
			debug: d.getElementById('debug'),
			params: d.getElementById('params'),
			map: d.getElementById('map'),
			overlay:d.getElementById('overlay'),
		}
		t.settings = {
			clickState:0
		};
		t.params = {};
		t.initMap();
	}

	pathFinder.prototype.initMap = function() {
		var t = this;
		var cvs = addElm('canvas');
		cvs.style.width = '100%';
		cvs.style.height = '100%';
		t.size = size;
		var cnt = addElm('div');
		cnt.style.width = '100%';
		cnt.style.height = '100%';
		cnt.style.border = 'solid 1px blue';
		cnt.style.position = 'absolute';
		cnt.style.zIndex = '500';
		cnt.appendChild(cvs);
		// Bounds for pathfinder
		var sw = new google.maps.LatLng(60.627800,15.660929);
		var ne = new google.maps.LatLng(60.645859,15.724571);
		var bounds = new google.maps.LatLngBounds(sw,ne);
		
		this.overlay = new SimulatorOverlay(bounds, cnt, this.map, this, function(){
			console.log('added');
		});
		this.overlay.setMap(this.map);
	}

	function addElm(nn,opt) {
		var ret = d.createElement(nn);
		if (opt) {
			for(i in opt) {
				ret[i] = opt[i];
			}
		}
		return ret;
	}

	pathFinder.prototype.repaintParams = function(data) {
		var t = this;
		console.log('hoho paint paramas');
		t.obj.params.innerHTML = '';
		for(var j in t.layer) {
			(function(i) {
				console.log(i,t.layer);
				var prt = addElm('li');
				var lbl = addElm('label',{'for':'prc_'+i});
				var inp2 = addElm('input',{'id':'prc_'+i,'type':'checkbox',checked:1});
				var inp = addElm('input',{'id':'prm_'+i,'type':'range',min:-20,max:20,value:1});
				inp.addEventListener('change',function() {
					t.layerMultiplier[i] = this.value;
					t.mergeLayers();
					t.changeCallback && t.changeCallback();
				},false);
				inp2.addEventListener('change',function() {
					t.layerEnabled[i] = this.checked;
					t.mergeLayers();
					t.changeCallback && t.changeCallback();
				},false);
				t.layerMultiplier[i] = 1;
				t.layerEnabled[i] = true;
				prt.appendChild(inp2);
				prt.appendChild(lbl);
				lbl.innerHTML = t.layer[i].description;
				prt.text = t.layer[i].description;
				prt.appendChild(inp);
				t.obj.params.appendChild(prt);
			})(j);
		}
		(function() {
			var prt = addElm('li');
			var lbl = addElm('label',{'for':'prc_'+i});
			var inp2 = addElm('input',{'id':'prc_'+i,'type':'checkbox',checked:1});
			inp2.addEventListener('change',function() {
				t.showDebug = this.checked;
				t.changeCallback && t.changeCallback();
			},false);
			prt.appendChild(inp2);
			prt.appendChild(lbl);
			lbl.innerHTML = 'Show debug layer';
			t.obj.params.appendChild(prt);
		})();
	}

	pathFinder.prototype.getLayers = function(layers) {
		var t = this;

		var N = layers.length;

		layers.forEach(function(i,v) {
			console.log(i,v);
			t.loadMap(i.data, function() {
				N --;
				if (N == 0) {
					console.log('all loaded.');

					layers.sort(function(a,b) {
						if (a.id < b.id)
							return -1;
						if (a.id > b.id)
							return 1;
						return 0;
					});

					t.mergeLayers();
					t.changeCallback && t.changeCallback();
				}
			});
		});
	}

	function mapValuesInLayer(layerDefinition) {
		var imgdatapixels = layerDefinition.imageData;
		layerDefinition.absoluteValues = null;

		function clamp(v) {
			return Math.min(Math.max(v, 0), 1);
		};

		layerDefinition.channels.forEach(function(ch) {
			if (ch.map)
				return;

			var absoluteValues = [];

			layerDefinition.inmin = ch.inputrange[0];
			layerDefinition.inmax = ch.inputrange[1];
			layerDefinition.outmin = ch.outputrange[0];
			layerDefinition.outmax = ch.outputrange[1];

			var indiff = layerDefinition.inmax - layerDefinition.inmin;
			var outdiff = layerDefinition.outmax - layerDefinition.outmin;

			for(var i=0; i<imgdatapixels.length; i+=4) {
				var val = imgdatapixels[i + ch.channel];
				absoluteValues.push((clamp((val - layerDefinition.inmin) / indiff) * outdiff) + layerDefinition.outmin);
			}

			layerDefinition.absoluteValues = absoluteValues;
		});
	}

	pathFinder.prototype.drawDebug = function(ctx) {
		ctx.putImageData(this.createRGBA(ctx,this.outData),0,0);
	}

	pathFinder.prototype.gotLayer = function(data, cb) {
		var t = this;
		//console.log('gotLayer',data);
		if (data.channels) {
			t.layer[data.id||'1'] = data;
			var img = new Image();
			img.onload = function() {
				t.ctx.drawImage(this,0,0, size.width, size.height);
				var imageData = t.ctx.getImageData(0, 0, size.width, size.height);
				console.log('loaded');
				var d = data.imageData = imageData.data;
				mapValuesInLayer(data);
				cb();
			};
			img.src = data.image;
			t.repaintParams();
		} else {
			cb();
		}
	}

	pathFinder.prototype.mergeLayers = function() {
		var t = this;

		var arr = [];
		for(var y=0; y<size.height; y++) {
			var thisLine = [];
			for(var x=0; x<size.width; x++) {
				var tot = 0;
				for(var i in t.layer) {
					var lay = t.layer[i];
					if (lay.absoluteValues && t.layerEnabled[i]) {
						if (x == 10 && y == 10) console.log(lay ,t );
						tot += lay.absoluteValues[y * size.width + x] * (t.layerMultiplier[i] + 0.01);
					}
				}
				thisLine.push(tot);
				//t.grid.setWalkableAt(x, y, true);
				//t.grid.setWeightAt(x, y, tot);
			}
			arr.push(thisLine);
		}

		t.outData = arr;
		console.log('final output', arr);

		t.paintMergedLayer();
		return arr;
	}

	pathFinder.prototype.createRGBA = function(ctx,data) {
		// console.log(data[0]);
		var ret = ctx.getImageData(0,0,size.width,size.height);
		var o = 0;
		for(var y=0;y<size.height;y++) {
			for(var x=0;x<size.width;x++) {
				var vl = data[y][x];
				vl = 128 + vl * 1;
				if (vl < 0) vl = 0;
				if (vl > 255) vl = 255;
				ret.data[o] = vl;
				ret.data[o+1] = vl;
				// vl = Math.random() * 255;
				ret.data[o+2] = vl;
				ret.data[o+3] = 255;
				o += 4;
			}
		}
		return ret;
	}

	pathFinder.prototype.paintMergedLayer = function() {
		var canvas = addElm('canvas');
		canvas.width = size.width;
		canvas.height = size.height;
		var ctx = canvas.getContext('2d');
		var img = addElm('img');
		ctx.putImageData(this.createRGBA(ctx,this.outData),0,0);
		img.src = canvas.toDataURL();
		// this.obj.debug.innerHTML = '';
		// this.obj.debug.appendChild(canvas);
	}

	pathFinder.prototype.getMergedArray = function(cb) {
		if (!this.outData)
			this.mergeLayers();
		cb(this.outData);
		/*var arr = [];
		for(var y=0;y<size.height;y++) {
			var thisLine = [];
			arr.push(thisLine);
			for(var x=0;x<size.width;x++) {
				thisLine.push(Math.round(Math.random()*255)-128);
			}	
		}
		cb(arr);*/
	}

	pathFinder.prototype.loadMap = function(layer,cb) {
		var t = this;
		jsonGet(layer,function(d) {
			t.gotLayer(d, cb);
		});
	}

	pathFinder.prototype.setStart = function(pos) {
		this.startPos = pos;
		console.log('set start',pos);
	}

	pathFinder.prototype.plotPath = function(result) {
		// Plot on map
		console.log('got result',result);
		var t = this;
		var pathCoord = [];
		for (var i = 0; i < result.length; i++) {
			var x = result[i][0];
			var y = result[i][1];
			//console.log(x,y,t.overlay);
			var latLng = t.overlay.getPos(x,y);
			pathCoord.push(latLng);
		}
		if (t.currentPoly)
			t.currentPoly.setMap(null);
		var flightPath = t.currentPoly = new google.maps.Polyline({
			path: pathCoord,
			geodesic: true,
			strokeColor: '#FF0000',
			strokeOpacity: 1.0,
			strokeWeight: 2
		});

		flightPath.setMap(t.map);
	}

	pathFinder.prototype.findPath = function() {
		var t = this;
		

		var data = t.outData;

		var grid = new PF.Grid(t.size.width,t.size.height,data);
		var pathfinder = new PF.AStarFinder({
			heuristic: PF.Heuristic.euclidean
		});



		for(var j=0; j<t.size.height-1; j++) {
			for(var i=0; i<t.size.width-1; i++) {
				grid.setWalkableAt(i, j, true);
				//console.log('här',data[j][i]);
				grid.setWeightAt(i, j, data[j][i]);
			}
		}

		console.log('findpath',t.startPos.x, t.startPos.y, t.endPos.x, t.endPos.y,t.size);

		var result = pathfinder.findPath(t.startPos.x, t.startPos.y, t.endPos.x, t.endPos.y, grid);
		t.plotPath(result);
	}

	pathFinder.prototype.setEnd = function(pos) {
		console.log('set end',pos);
		var t = this;
		t.endPos = pos;
		t.findPath();

	}

	function mapOverlay(map) {

	}

	function mapClick(e) {
		console.log(e.latLng);
	}

	var size = { width: 1000, height: 500 };

	var finder = new pathFinder();

	var tmpLayers = ['layer1'];

	w.initSearch = function(map,changeCallbak) {
		


		finder.init(map,changeCallbak);
		jsonGet('/1/layers',function(d) {
			finder.getLayers(d['layers']);	
		});
		
		google.maps.event.addListener(map, 'click', mapClick);
		google.maps.event.addListener(map, 'bounds_changed', function() {
			console.log(map);
		});
		google.maps.event.addListenerOnce(map,"projection_changed", function() {
				projection = map.getProjection();
				console.log('change',projection);
		});
		return finder;
	}		

})(window,document);
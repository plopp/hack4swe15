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
		t.initCallback = cb;
		t.ctx = t.canvas.getContext('2d');
		t.layerMultiplier = {};
		t.layer = {};
		t.obj = {
			debug: d.getElementById('debug'),
			params: d.getElementById('params'),
			map: d.getElementById('map'),
			overlay:d.getElementById('overlay')
		}
		t.settings = {
			clickState:0
		};
		t.params = {};

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
				var lbl = addElm('label',{'for':'prm_'+i});
				lbl.innerHTML = t.layer[i].description;
				prt.appendChild(lbl);
				var inp = addElm('input',{'id':'prm_'+i,'type':'range',min:-4,max:4,value:1});
				inp.addEventListener('change',function() {
					console.log('change',this.value);
					t.layerMultiplier[i] = this.value;
					t.mergeLayers();
					t.changeCallbak();
				},false);
				t.layerMultiplier[i] = 1;
				prt.appendChild(inp);
				t.obj.params.appendChild(prt);
			})(j);
		}
	}

	pathFinder.prototype.getLayers = function(layers) {
		var t = this;
		layers.forEach(function(i,v) {
			console.log(i,v);
			t.loadMap(i.data);
		});
	}

	function mapValuesInLayer(layerDefinition) {
		// console.log('map values input', layerDefinition);

		var imgdatapixels = layerDefinition.imageData;

		// layerDefinition.normalizedValues = [];
		layerDefinition.absoluteValues = null;

		for(var j = 0;j<layerDefinition.channels.length;j++) {
			var ch = layerDefinition.channels[j];
			if (!ch.map) {
			}
			else {
			}
		}

		function clamp(v) {
			// return v;
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

		// console.log('map values output', layerDefinition.absoluteValues);
	}


	pathFinder.prototype.gotLayer = function(data) {
		var t = this;
		console.log('gotLayer',data);
		if (data.channels) {
			t.layer[data.id||'1'] = data;
			var img = new Image();
			img.onload = function() {
				t.ctx.drawImage(this,0,0, size.width, size.height);
				var imageData = t.ctx.getImageData(0, 0, size.width, size.height);
				console.log('loaded');
				var d = data.imageData = imageData.data;
				mapValuesInLayer(data);
			};
			img.src = data.image;
			t.repaintParams();
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
					if (lay.absoluteValues) {
						if (x == 10 && y == 10) console.log(lay ,t );
						tot += lay.absoluteValues[y * size.width + x] * t.layerMultiplier[i];
					}
				}
				thisLine.push(tot);
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
				vl = 128 + vl * 50;
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
		this.obj.debug.innerHTML = '';
		this.obj.debug.appendChild(canvas);
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
			t.gotLayer(d);
		});
	}

	pathFinder.prototype.setStart = function() {

	}

	pathFinder.prototype.endStart = function() {
		
	}

	function mapOverlay(map) {

	}

	function mapClick(e) {
		console.log(e.latLng);
	}

	var size = { width: 300, height: 150 };

	var finder = new pathFinder();

	var tmpLayers = ['layer1'];

	w.initSearch = function(map,changeCallbak) {
		console.log('init',map);
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
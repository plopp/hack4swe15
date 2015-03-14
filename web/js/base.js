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

	pathFinder.prototype.init = function(map) {
		var t = this;
		t.canvas = addElm('canvas');
		t.ctx = t.canvas.getContext('2d');
		t.mergeValues = {};
		t.layer = {};
		t.obj = {
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
				var inp = addElm('input',{'id':'prm_'+i,'type':'range',min:-16,max:16,value:1});
				inp.addEventListener('change',function() {
					console.log('change',this.value);
					t.mergeValues[i] = this.value;
					t.mergeLayers();
				},false);
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

	function mapValues(data) {
		console.log(data);
		

		
		var d= data.imageData;
		data.values = [];
		for(var j = 0;j<data.channels.length;j++) {
			
			var ch = data.channels[j];
			//console.log(ch);
			if (!ch.map) {
				var val = {
					inmin:ch.inputrange[0],
					inmax:ch.inputrange[1],
					outmin:ch.outputrange[0],
					outmax:ch.outputrange[1],
					data:[]
				};
				val.indiff = val.inmax-val.inmin;
				val.outdiff = val.outmax-val.outmin;
				data.values.push(val);
			}
			else {
				data.values.push({map:ch.map});
			}
			
		}

		function clamp(v) {
			return v;
		  //return Math.min(Math.max(v, 0), 1);
		};

		for(var i=0;i<d.length/4;i+=4) {
			//d[i] = d[i]*factor;
			for(var j = 0;j<data.channels.length;j++) {
				var val = d[i+j];
				//console.log(d,val);
				var ch = data.values[j];
				//console.log(ch);
				if (!ch.map)
					ch.data[i/4] = (clamp((val - ch.inmin) / ch.indiff) * ch.outdiff) + ch.outmin;
			}
			/*var r = d[i];
			var g = d[i+1];
			var b = d[i+2];
			var alpha = d[i+3];

			d[i] = (clamp((d[i] - inmin) / indiff) * outdiff) + outmin;
			*/
		}
		console.log(data.values);
		

		 
	}


	pathFinder.prototype.gotLayer = function(data) {
		var t = this;
		console.log(data);
		if (data.channels) {
			t.layer[data.id||'1'] = data;
			var img = new Image();
			img.onload = function() {
				t.ctx.drawImage(this,0,0, steps[0], steps[1]);
				var imageData = t.ctx.getImageData(0, 0, steps[0], steps[1]);
				console.log('loaded');
				var d = data.imageData = imageData.data;
				mapValues(data);
				
				console.log(d);
	        	//t.mergeLayers();
			};
			img.src = data.image;
			t.repaintParams();
		}
	}

	pathFinder.prototype.mergeLayers = function() {
		var t = this;
	
		var arr = t.outData = [];
		for(var y=0;y<steps[1];y++) {
			var thisLine = [];
			arr.push(thisLine);
			for(var x=0;x<steps[0];x++) {
				var tot = 0;
				for(var i in t.layer) {
					var lay = t.layer[i];
					var data = 0;
					if (lay.values[0].data) {
						data = lay.values[0].data[y*steps[0]+x];
						data = data*t.mergeValues[i];
					}
					tot+=data;
				}	
				thisLine.push(tot);
			}
		}	
		t.paintMergedLayer();
		return arr;
	}

	pathFinder.prototype.createRGBA = function(ctx,data) {
		var ret = ctx.getImageData(0,0,steps[0],steps[1]);
		for(var y=0;y<steps[1];y++) {	
			for(var x=0;x<steps[0];x++) {
				var vl = data[y][x];
				var baseIdx = (y*steps[0]*4)+(x*4);
				ret.data[baseIdx] = vl;
				ret.data[baseIdx+1] =vl;
				ret.data[baseIdx+2] = vl;
				ret.data[baseIdx+3] = 255;
			}
		}
		return ret;
	}

	pathFinder.prototype.paintMergedLayer = function() {
		var canvas = addElm('canvas');
		var ctx = canvas.getContext('2d');
		var img = addElm('img');
		ctx.putImageData(this.createRGBA(ctx,this.outData),0,0);
		img.src = canvas.toDataURL();
		this.obj.params.appendChild(img);
		this.obj.params.appendChild(canvas);

	}

	pathFinder.prototype.getMergedArray = function(cb) {
		if (!this.outData)
			this.mergeLayers();
		cb(this.outData);
		/*var arr = [];
		for(var y=0;y<steps[1];y++) {
			var thisLine = [];
			arr.push(thisLine);
			for(var x=0;x<steps[0];x++) {
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

	var steps = [300,150];

	var finder = new pathFinder();

	var tmpLayers = ['layer1'];

	w.initSearch = function(map) {
		console.log('init',map);
		finder.init(map);
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
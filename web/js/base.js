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
		for(var i in t.layers) {
			console.log(i,v);
			var prt = addElm('li',{'id':'prm_'+i}); 
			t.obj.appendChild(prt);
			var lbl = addElm('label',{'for':'prm_'+i});
			prt.appendChild(lbl);
			var inp = addElm('input',{'':''});
			
		}
		
	}

	pathFinder.prototype.getLayers = function(layers) {
		var t = this;
		layers.forEach(function(i,v) {
			console.log(i,v);
			t.loadMap(i);
		});
	}

	pathFinder.prototype.gotLayer = function(data) {
		var t = this;
		console.log(data);
		t.layer[data.id||'1'] = data;
		var img = new Image();
		img.onload = function() {
			console.log('loaded');
		};
		img.src = data.image;
		t.repaintParams();
	}

	pathFinder.prototype.mergeLayers = function() {

	}

	pathFinder.prototype.getMergedArray = function(cb) {
		var arr = [];
		for(var y=0;y<steps[1];y++) {
			var thisLine = [];
			arr.push(thisLine);
			for(var x=0;x<steps[0];x++) {
				thisLine.push(Math.round(Math.random()*255));
			}	
		}
		cb(arr);
	}

	pathFinder.prototype.loadMap = function(layer,cb) {
		var t = this;
		jsonGet('/1/'+layer+'.json',function(d) {
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

	var steps = [512,512];

	var finder = new pathFinder();

	var tmpLayers = ['layer1'];

	w.initSearch = function(map) {
		console.log('init',map);
		finder.init(map);
		finder.getLayers(tmpLayers);
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
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
		t.changeCallback = function() {
			t.findPath();
		};
		t.canvas.style.opacity = 0.5;
		t.ctx = t.canvas.getContext('2d');
		t.layerMultiplier = {};
		t.layerEnabled = {};
		t.layer = {};
		t.map = map;
		t.showDebug = false;
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
		cvs.width = 1000;
		cvs.height = 500;
		cvs.style.opacity = 0.5;
		cvs.style.width = '100%';
		cvs.style.height = '100%';
		t.size = size;
		var cnt = addElm('div');
		cnt.style.width = '100%';
		cnt.style.height = '100%';
		cnt.style.border = 'solid 1px rgba(255,255,255,0.3)';
		cnt.style.position = 'absolute';
		cnt.style.zIndex = '500';
		cnt.appendChild(cvs);
		t.debugCanvas = cvs;
		// Bounds for pathfinder
		var sw = new google.maps.LatLng( 60.619197236209565, 15.63852310180664 );
		var ne = new google.maps.LatLng( 60.655159784262224, 15.746927261352539 );
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
		//console.log('hoho paint paramas');
		t.obj.params.innerHTML = '';
		for(var j in t.layer) {
			(function(i) {
				//console.log(i,t.layer);
				var prt = addElm('li');
				var lbl = addElm('label',{'for':'prc_'+i});
				var inp2 = addElm('input',{'id':'prc_'+i,'type':'checkbox',checked:1});
				var inp = addElm('input',{'id':'prm_'+i,'type':'range',min:-40,max:40,value:1});
				inp.addEventListener('change',function() {
					t.layerMultiplier[i] = -this.value;
					console.log(JSON.stringify(t.layerMultiplier));
					t.mergeLayers();
					t.changeCallback && t.changeCallback();
				},false);
				inp2.addEventListener('change',function() {
					t.layerEnabled[i] = this.checked;
					t.mergeLayers();
					t.changeCallback && t.changeCallback();
				},false);
				t.layerMultiplier[i] = -1;
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
			var inp2 = addElm('input',{'id':'prc_'+i,'type':'checkbox'});
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
			//console.log(i,v);
			t.loadMap(i.data, function() {
				N --;
				if (N == 0) {
					//console.log('all loaded.');

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
		layerDefinition.realValues = null;

		function clamp(v) {
			return Math.min(Math.max(v, 0), 1);
		};

		layerDefinition.channels.forEach(function(ch) {
			if (ch.map)
				return;

			var absoluteValues = [];
			var realValues = [];

			layerDefinition.inmin = ch.inputrange[0];
			layerDefinition.inmax = ch.inputrange[1];
			layerDefinition.outmin = ch.outputrange[0];
			layerDefinition.outmax = ch.outputrange[1];
			layerDefinition.dispmin = ch.displayrange[0];
			layerDefinition.dispmax = ch.displayrange[1];

			var indiff = layerDefinition.inmax - layerDefinition.inmin;
			var outdiff = layerDefinition.outmax - layerDefinition.outmin;
			var dispdiff = layerDefinition.dispmax - layerDefinition.dispmin;

			for(var i=0; i<imgdatapixels.length; i+=4) {
				var val = imgdatapixels[i + ch.channel];
				absoluteValues.push((clamp((val - layerDefinition.inmin) / indiff) * outdiff) + layerDefinition.outmin);
				realValues.push((clamp((val - layerDefinition.inmin) / indiff) * dispdiff) + layerDefinition.dispmin);
			}
			layerDefinition.absoluteValues = absoluteValues;
			layerDefinition.realValues = realValues;
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
			//console.log('loading ' + data.image);
			var img = new Image();
			img.onload = function() {
				t.ctx.drawImage(this,0,0, t.size.width, t.size.height);
				var imageData = t.ctx.getImageData(0, 0, t.size.width, t.size.height);
				var d = data.imageData = imageData.data;
				mapValuesInLayer(data);
				//console.log('loaded ' + data.image);
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
						//if (x == 10 && y == 10) console.log(lay ,t );
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
		//console.log('final output', arr);

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
		//console.log('set start',pos);
	}

	pathFinder.prototype.getLayerData = function(x,y) {
		var t = this;
		var ret = {};
		for(var i in t.layer) {
			var l = t.layer[i];
			ret[i] = l.realValues[y*t.size.width+x];
		}
		return ret;
	}
/*
	function bspline(lats, lons) {
	    var i, t, ax, ay, bx, by, cx, cy, dx, dy, lat, lon, points;
	    points = [];
	    // For every point
	    for (i = 2; i < lats.length - 2; i++) {
	        for (t = 0; t < 1; t += 0.2) {
	            ax = (-lats[i - 2] + 3 * lats[i - 1] - 3 * lats[i] + lats[i + 1]) / 6;
	            ay = (-lons[i - 2] + 3 * lons[i - 1] - 3 * lons[i] + lons[i + 1]) / 6;
	            bx = (lats[i - 2] - 2 * lats[i - 1] + lats[i]) / 2;
	            by = (lons[i - 2] - 2 * lons[i - 1] + lons[i]) / 2;
	            cx = (-lats[i - 2] + lats[i]) / 2;
	            cy = (-lons[i - 2] + lons[i]) / 2;
	            dx = (lats[i - 2] + 4 * lats[i - 1] + lats[i]) / 6;
	            dy = (lons[i - 2] + 4 * lons[i - 1] + lons[i]) / 6;
	            lat = ax * Math.pow(t + 0.1, 3) + bx * Math.pow(t + 0.1, 2) + cx * (t + 0.1) + dx;
	            lon = ay * Math.pow(t + 0.1, 3) + by * Math.pow(t + 0.1, 2) + cy * (t + 0.1) + dy;
	            points.push(new google.maps.LatLng(lat, lon));
	        }
	    }
	    return points;
	}
*/
	pathFinder.prototype.plotPath = function(result) {
		var t = this;


		var ctx = t.debugCanvas.getContext("2d");
		ctx.clearRect(0,0,t.debugCanvas.width,t.debugCanvas.height);
		ctx.fillStyle = "#FF0000";
		ctx.strokeStyle = "#FF00FF";

		if (finder.showDebug) {
			finder.drawDebug(ctx);
		}
/*
		ctx.beginPath();
		ctx.rect(0,0,t.debugCanvas.width,t.debugCanvas.height);
		ctx.stroke();

		if (finder.showDebug) {
			ctx.beginPath();
			for (var i = 0; i < result.length; i++) {
				var x = result[i][0];
				var y = result[i][1];
				ctx.strokeStyle = 'blue';
				ctx.lineTo(x,y);
				ctx.moveTo(x,y);
			};
			ctx.stroke();
		}
*/


		// Plot on map
		//console.log('got result',result);

		var t = this;
		var pathCoord = [];
		var lats = [];
		var lngs = [];
		for (var i = 0; i < result.length; i++) {
			var x = result[i][0];
			var y = result[i][1];
			//console.log(x,y,t.overlay);
			var latLng = t.overlay.getPos(x,y);
			//if ((i%5)==1) {
				lats.push(latLng.lat());
				lngs.push(latLng.lng());
			//}
			pathCoord.push(latLng);
		}
		t.absolutePath = pathCoord;
		//t.splinePath = bspline(lats,lngs);
		//console.log(t.totalPath.length,t.splinePath.length);

		if (t.posMarker)
			t.posMarker.setMap(null);
		if (t.currentPaintPoly)
			t.currentPaintPoly.setMap(null);
		//if (t.currentPoly)
			//t.currentPoly.setMap(null);

		var p = t.posMarker = new google.maps.Marker({title:'Du',position:pathCoord[0],icon:'/nyancat.png',animation:google.maps.Animation.DROP});
		p.setMap(this.map);
		
		var cp = t.currentPaintPoly = new google.maps.Polyline({
			geodesic: false,
			strokeColor: '#ff00ff',
			strokeOpacity: 0.8,
			strokeWeight: 8
		});
		cp.setMap(t.map);

		t.currentPos = 0;
		t.splitPos = 0;
		var totLength = google.maps.geometry.spherical.computeLength(pathCoord);
		t.stats = {totalDistance:totLength};
		
/*
		var flightPath = t.currentPoly = new google.maps.Polyline({
			path: pathCoord,
			geodesic: false,
			strokeColor: '#ff00ff',
			strokeOpacity: 0.8,
			strokeWeight: 8
		});
*/
		
		console.log('Total längd',totLength);
		
		//t.setPersona();
		t.plotSingle();
		//flightPath.setMap(t.map);
	}

	pathFinder.prototype.calcData = function(currData,percent) {
		var t = this;
		for(var i in currData) {
			var cd = currData[i];
			if (!t.stats[i])
				t.stats[i] = {};
			var st = t.stats[i];
			if (st.noi===undefined){
				st.noi = 0;
			}
			else{ 
				st.noi++;
			}
			if (!st.diff)
				st.diff = 0;
			st.diff+=(st.lastVal-cd); 
			
			if (!st.totalInc)
				st.totalInc = 0;
			if (st.lastVal<cd) {
				st.totalInc+=st.lastVal-cd;
			}
			if (!st.totalDec)
				st.totalDec = 0;
			if (st.lastVal>cd) {
				st.totalDec-=st.lastVal-cd;
			}
			st.lastVal = cd;
			st.total = (t.stats[i].total||0)+cd;
			st.med = st.total/st.noi;

			if (st.overThreshold === undefined){
				st.overThreshold =0;
			}
			else{
				if (cd>t.layer[i].threshold)
					st.overThreshold++;	
			}

			if (st.underThreshold === undefined){
				st.underThreshold =0;
			}
			else{
				if (cd<=t.layer[i].threshold)
					st.underThreshold++;
			}
		}
		
		t.stats.distance = t.stats.totalDistance*percent;
		
		if (t.personData) {
			for(var i in t.personData.keys) {
				var k = t.personData.keys[i];
				k.update.apply(t.personData,[t.stats]);
			}
		}
	}

	pathFinder.prototype.plotSingle = function() {
		var t = this;
		var path = t.currentPaintPoly;
		var cp = t.splinePath;
		var pth = path.getPath();

		//if ((t.currentPos%5)==1) {
			var mapPos = t.result[t.currentPos];
			var data = t.getLayerData(mapPos[0],mapPos[1]);
			//console.log(data);
			var cdata = t.absolutePath[t.currentPos];
			pth.push(cdata);
			//t.result[t.currentPos];
			t.posMarker.setPosition(cdata);
		//}
		
		t.calcData(data,t.currentPos/t.absolutePath.length);

		t.currentPos++;
		if (t.plotTimer)
			clearTimeout(t.plotTimer);
		if (t.currentPos<t.absolutePath.length) {
			t.plotTimer = setTimeout(function() { t.plotSingle(); },1);
		}
		else {
			if (t.personData) {
				for(var i in t.personData.keys) {
					var k = t.personData.keys[i];
					if(k.after)
						k.after.apply(t.personData,[t.stats]);
				}
			}
			console.log(t.stats);
			t.posMarker.setAnimation(google.maps.Animation.BOUNCE);
		}
	}

	pathFinder.prototype.findPath = function() {
		var t = this;
		if(!t.startPos || !t.endPos)
			return;
		var data = t.outData;
		var grid = new PF.Grid(t.size.width,t.size.height,data);
		var pathfinder = new PF.AStarFinder({
			heuristic: PF.Heuristic.euclidean,
			allowDiagonal: true
		});
		for(var j=0; j<t.size.height-1; j++) {
			for(var i=0; i<t.size.width-1; i++) {
				grid.setWalkableAt(i, j, true);
				//console.log('här',data[j][i]);
				grid.setWeightAt(i, j, data[j][i]);
			}
		}
//		console.log('findpath',t.startPos.x, t.startPos.y, t.endPos.x, t.endPos.y,t.size);
		t.result = pathfinder.findPath(t.startPos.x, t.startPos.y, t.endPos.x, t.endPos.y, grid);
		console.log("before initpersona");
		t.initPersona();
		console.log("after initpersona");
		console.log(t.result);
		toggleStates(false);
		t.plotPath(t.result);
	}

	pathFinder.prototype.initPersona = function() {
		var t = this;
		var pers = t.personData;
		t.personData.result = t.result;
		console.log("Pers: ",pers);
		
		var elm = d.getElementById('tbldata');
		elm.innerHTML = '';

		var graph = new Dygraph(
            d.getElementById("div_g"),
            [[0,0]], {
				rollPeriod: 7,
				//legend: 'always',
				title: 'Topology',
				titleHeight: 16,
				drawAxis: false,
				drawXGrid: false,
				drawYGrid: false,
				drawLabels: false,
				labelsDivStyles: {
					'text-align': 'right',
					'background': 'none'
				},
				strokeWidth: 1.5
            }
        );

		for(var i in pers.keys) {
			var k = pers.keys[i];
			k.init.apply(pers,[elm, graph]);
		}
	}

	pathFinder.prototype.setPersona = function() {
		
		var t = this;
		var pers = t.personData = new persona[t.currentPersona]();
		if (t.currentPersona!='custom') {
			for(var i in pers.params)
			{
				var val = pers.params[i];
				//console.log('set',val,i);
				var elm = d.getElementById('prm_'+i);
				if (elm)
					elm.value = -val;
				t.layerMultiplier[i] = val;
			}
		}
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

	function createElms(prt,title) {
		var tr = addElm('tr');
		var td = addElm('td');
		td.innerHTML = title;
		var vl = addElm('td');
		tr.appendChild(td);
		tr.appendChild(vl);
		prt.appendChild(tr);
		return vl;
	}

	function round(val,dec,unit){
		var pow = Math.pow(10,dec);
		return (Math.round(val*pow)/pow)+' '+(unit || '');
	}


	var defaultKeys = [{
				init:function(prt,graph) {
					var t = this;
					t.graph = graph;
					t.dist = createElms(prt,'Distans:');
				},
				update:function(st) {
					var t = this;
					var dist = round(st.distance,0,'m');
					if (st.distance>4000) {
						dist = round(st.distance/1000.0,2,'km');
					}
					t.dist.innerHTML = dist;
				}
			},
			{
				init:function(prt,graph) {
					var t = this;
					t.topologyArr = [];
					// for (var i = 0; i < t.result.length; i++) {
					// 	t.topologyArr.push([i,null]);
					// };
					t.graph = graph;
					t.akthojd = createElms(prt,'Aktuell höjd:');
				},
				update:function(st) {
					var t = this;
					t.akthojd.innerHTML = round(st['hojd'].lastVal,1,'m');
					t.topologyArr.push([Math.round(st.distance),st['hojd'].lastVal]);
					var totDist = 0;
					console.log(st);
					t.graph.updateOptions({'file': t.topologyArr,'labels':["m","Höjd"]});
				}
			},
			{
				init:function(prt,graph) {
					var t = this;
					t.topologyArr = [];
					// for (var i = 0; i < t.result.length; i++) {
					// 	t.topologyArr.push([i,null]);
					// };
					t.graph = graph;
					t.akthojd = createElms(prt,'Väg:');
					
				},
				update:function(st) {
					var t = this;
					t.akthojd.innerHTML = round(100.0*(st['vag'].overThreshold/st['vag'].noi),1,'%');
					var totDist = 0;
				},
				after:function(st){
					var t = this;
					var vag = Math.round(100.0*(st['vag'].overThreshold/st['vag'].noi));
					var skog = Math.round(100.0*(st['skog'].overThreshold/st['vag'].noi));
					var data = [
					    {
					        value: vag,
					        color:"#d3d3d3",
					        highlight: "#e3e3e3",
					        label: "Väg"
					    },
					    {
					        value: skog,
					        color:"#00FFAD",
					        highlight: "#00FFBB",
					        label: "Skog"
					    }
					];
					var ctx = document.getElementById("myChart").getContext("2d");
					if(t.donut === undefined){
						t.donut = new Chart(ctx).Doughnut(data,{});
					}
					else{
						t.donut.removeData();
						t.donut.removeData();
						t.donut.addData(data[0],undefined,true);
						t.donut.addData(data[1],undefined,true);
						t.donut.reflow();
						t.donut.update();
					}
				}
			}];

	
	var persona = {
		custom:function() {
			this.title = 'Egen';
			this.params = {"backar":"-1","berg":"-1","forn":-1,"hojd":-1,"osamjord":-1,"skog":-1,"urberg":-1,"vag":"-1","vatten":-1},
			this.keys = defaultKeys;
		},
		falnn:function() {
			this.title = 'Flanören';
			this.params = {"backar":40,"berg":-1,"forn":-40,"hojd":19,"osamjord":-1,"skog":-1,"urberg":-1,"vag":-6,"vatten":39},
			this.keys = defaultKeys.concat([{
				init:function(prt) {
					var t = this;
					t.cal = createElms(prt,'Kalorier:');
				},
				update:function(st) {
					var t = this;
					t.cal.innerHTML = round(st.distance*0.03,1,'kcal');
				}
			}]);
		},
		maskin:function() {
			this.title = 'Avverkaren';
			this.params = {"backar":40,"berg":5,"forn":40,"hojd":15,"osamjord":-10,"skog":-30,"urberg":20,"vag":-32,"vatten":40},
			this.keys = defaultKeys.concat([{
				init:function(prt) {
					var t = this;
					t.height = createElms(prt,'Höjdskillnad:');
				},
				update:function(st) {
					var t = this;
					t.height.innerHTML = round(st['hojd'].diff,1,'m');
				}
			},{
				init:function(prt) {
					var t = this;
					t.liter = createElms(prt,'Diesel:');
				},
				update:function(st) {
					var t = this;
					t.liter.innerHTML = round(st.distance*0.03,1,'L');
				}
			}]);
		},
		runner:function() {
			this.title = 'Löparen';
			this.params = {"backar":40,"berg":-1,"forn":-1,"hojd":33,"osamjord":-1,"skog":28,"urberg":-1,"vag":-40,"vatten":40},
			this.keys = defaultKeys.concat([{
				init:function(prt) {
					var t = this;
					t.cal = createElms(prt,'Kalorier:');
				},
				update:function(st) {
					var t = this;
					t.cal.innerHTML = round(st.distance*0.03,1,'kcal');
				}
			}]);
		},
		badarn:function() {
			this.title = 'Badarn';
			this.params = {"backar":-39,"berg":-1,"forn":-1,"hojd":-1,"osamjord":-1,"skog":-1,"urberg":-1,"vag":40,"vatten":-40},
			this.keys = defaultKeys.concat([{
				init:function(prt) {
					var t = this;
					t.cal = createElms(prt,'Kalorier:');
				},
				update:function(st) {
					var t = this;
					t.cal.innerHTML = round(st.distance*0.03,1,'kcal');
				}
			}]);
		}
	}

	function toggleStates(state) {
		console.log(state);
		var p = d.getElementById('params').classList;
		p.remove(state?'closed':'open');
		p.add(state?'open':'closed');

		var m = d.getElementById('metrics').classList;
		m.remove(state?'open':'closed');
		m.add(state?'closed':'open');
		
		var tl = d.getElementById('toggleParam').classList;
		tl.remove(state?'fa-toggle-off':'fa-toggle-on');
		tl.add(state?'fa-toggle-on':'fa-toggle-off');
	}

	
	w.initSearch = function(map,changeCallbak) {
		var personaSelect = d.getElementById('persona');
		personaSelect.addEventListener('change',function() {
			finder.currentPersona = this.value;
			finder.setPersona();
			finder.findPath();
		});
		for(var i in persona) {
			var p = new persona[i]();
			var elm = addElm('option',{value:i});
			elm.innerHTML = p.title;
			personaSelect.appendChild(elm);
		}

		var tgl = d.getElementById('toggleParam');
		tgl.addEventListener('click',function() {
			var tl = d.getElementById('toggleParam').classList;
			var state = tl.contains('fa-toggle-off');
			toggleStates(state);
		});

		finder.currentPersona = 'custom';

		finder.init(map,changeCallbak);
		finder.setPersona();
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
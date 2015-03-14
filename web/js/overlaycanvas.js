SimulatorOverlay.prototype = new google.maps.OverlayView();

// Initialize the map and the custom overlay.

/** @constructor */
function SimulatorOverlay(bn, elm, map, finder,cb) {
  this.bounds_ = bn;
  this.myb = bn;
  this._elm = elm;
  this.map_ = map;
  this._cb = cb;
  this._finder = finder;
  this.div_ = null;
  this.startPosition = true;
  this.setMap(map);
}

function lerp(x, xmin, xmax, outmin, outmax) {
  x = (x - xmin) / (xmax - xmin);
  x = Math.max(0, Math.min(1,  x));
  x = (x * (outmax - outmin)) + outmin;
  return x;
}

/**
 * onAdd is called when the map's panes are ready and the overlay has been
 * added to the map.
 */
SimulatorOverlay.prototype.onAdd = function() {
  if (this._cb)
    this._cb();
console.log('onAdd',this._elm);
  // Add the element to the "overlayLayer" pane.
  var panes = this.getPanes();

  var t = this;
  google.maps.event.addListener(this.map_, 'click', function(e) {
    var ll = e.latLng;

    var sw = t.bounds_.getSouthWest();
    var ne = t.bounds_.getNorthEast();

    var pos = {
      x: Math.floor(lerp( ll.lng(), sw.lng(), ne.lng(), 0, t._finder.size.width )),
      y: Math.floor(lerp( ll.lat(), ne.lat(), sw.lat(), 0, t._finder.size.height )),
    };

   // console.log('pos', pos);

    t._finder[t.startPosition?'setStart':'setEnd'](pos,ll);
    t.startPosition = !t.startPosition;
  });

  panes.overlayLayer.appendChild(this._elm);
};

SimulatorOverlay.prototype.getPos = function(x,y) {
  var t = this;
    var proj = this.getProjection();
    var oelm = this._elm;

    var sw = t.bounds_.getSouthWest();
    var ne = t.bounds_.getNorthEast();

    var pos = {
      x: lerp( x, 0, t._finder.size.width, sw.lng(), ne.lng() ),
      y: lerp( y, 0, t._finder.size.height, ne.lat(), sw.lat() )
    };

//    console.log(x,y,pos);

    return new google.maps.LatLng(pos.y, pos.x);

    // return proj.fromDivPixelToLatLng(new google.maps.Point(x+oelm.offsetLeft,y+oelm.offsetTop));
}

SimulatorOverlay.prototype.draw = function() {
  // We use the south-west and north-east
  // coordinates of the overlay to peg it to the correct position and size.
  // To do this, we need to retrieve the projection from the overlay.
  var overlayProjection = this.getProjection();

  var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
  var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());
  // Resize the image's div to fit the indicated dimensions.
  var div = this._elm;
  div.style.left = sw.x + 'px';
  div.style.top = ne.y + 'px';
  div.style.width = (ne.x - sw.x) + 'px';
  div.style.height = (sw.y - ne.y) + 'px';
};

// The onRemove() method will be called automatically from the API if
// we ever set the overlay's map property to 'null'.
SimulatorOverlay.prototype.onRemove = function() {
  this._elm.parentNode.removeChild(this._elm);
  this._elm = null;
};
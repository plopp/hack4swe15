SimulatorOverlay.prototype = new google.maps.OverlayView();

// Initialize the map and the custom overlay.

/** @constructor */
function SimulatorOverlay(bn, elm, map,cb/*,sim*/) {
  this.bounds_ = bn;
  this.myb = bn;
  this._elm = elm;
  this.map_ = map;
  this._cb = cb;
  //this._sim = sim;
  this.div_ = null;
  this.setMap(map);
}

/**
 * onAdd is called when the map's panes are ready and the overlay has been
 * added to the map.
 */
SimulatorOverlay.prototype.onAdd = function() {
  if (this._cb)
    this._cb();

  // Add the element to the "overlayLayer" pane.
  var panes = this.getPanes();

  var overlayProjection = this.getProjection();
  var t = this;

  google.maps.event.addListener(this.map_, 'click', function(e) {
    var ll = e.latLng;
    var pos = overlayProjection.fromLatLngToDivPixel(ll);
    //console.log(ll,pos);
    var oelm = t._elm;
    var fx = (oelm.offsetWidth/1024);
    var fy = (oelm.offsetHeight/768);
    //t._sim.emitAtPoint((pos.x-t._elm.offsetLeft)/fx,(pos.y-t._elm.offsetTop)/fy);
  });

  google.maps.event.addListener(this.map_, 'mousemove', function(e) {
    var ll = e.latLng;
    var pos = overlayProjection.fromLatLngToDivPixel(ll);
    // console.log('mousemove',ll,pos);
    var oelm = t._elm;
    var fx = (oelm.offsetWidth/1024);
    var fy = (oelm.offsetHeight/768);
    //t._sim.updateMousePosition((pos.x-t._elm.offsetLeft)/fx,(pos.y-t._elm.offsetTop)/fy);
  });

  panes.overlayLayer.appendChild(this._elm);
};

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
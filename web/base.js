(function(w,d) {

	function mapOverlay(map) {

	}

	function mapClick(e) {
		console.log(e.latLng);
	}

	w.initSearch = function(map) {
		google.maps.event.addListener(map, 'click', mapClick);
		google.maps.event.addListenerOnce(map,"projection_changed", function() {
				projection = map.getProjection();
				console.log('change',projection);
		});
	}		

})(window,document);
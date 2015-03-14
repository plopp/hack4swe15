(function(w,d) {

	function mapOverlay(map) {

	}

	w.initSearch = function(map) {
		google.maps.event.addListenerOnce(map,"projection_changed", function() {
				projection = map.getProjection();
				console.log('change',projection);
		});
	}		

})(window,document);
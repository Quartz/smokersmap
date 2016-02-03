// Dependencies
var d3 = require('d3');
var request = require('d3-request');
require("d3-geo-projection")(d3);
var topojson = require('topojson');
var _ = require('lodash');

var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();

// Globals
var DEFAULT_WIDTH = 640;
var MOBILE_THRESHOLD = 600;

var LABEL_DEFAULTS = {
    'text-anchor': 'middle',
		'font-size': 1,
		'rotate': 0
};

var statesData = null;
var storesData = null;

var isMobile = false;

function init() {
  request.requestJson('data/states.json', function(error, data) {
    statesData = topojson.feature(data, data['objects']['tl_2015_us_state']);

		request.requestCsv('data/states.csv', function(error, data) {
			storesData = data;

			render();
			$(window).resize(throttle(onResize, 250));
		});
  });
}

function onResize() {
  render()
}

function render() {
  var width = $('#map').width();

  if (width <= MOBILE_THRESHOLD) {
      isMobile = true;
  } else {
      isMobile = false;
  }

  renderMap({
    container: '#map',
    width: width,
    states: statesData,
		stores: storesData
  });

  // Resize
  fm.resize()
}

/*
 * Render a map.
 */
function renderMap(config) {
    /*
     * Setup
     */
    var aspectRatio = 2.5 / 1;
    var defaultScale = 550;

    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
    var width = config['width'];
    var height = width / aspectRatio;

    var chartWidth = width - (margins['left'] + margins['right']);
    var chartHeight = height - (margins['top'] + margins['bottom']);

    var scaleFactor = chartWidth / DEFAULT_WIDTH;
    var mapScale = scaleFactor * defaultScale;

    var projection = d3.geo.albersUsa()
      .translate([width / 2, height / 2])
      .scale(mapScale);

    var geoPath = d3.geo.path()
      .projection(projection)

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
      .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
      .attr('width', chartWidth + margins['left'] + margins['right'])
      .attr('height', chartHeight + margins['top'] + margins['bottom'])
      .append('g')
      .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create geographic elements.
     */
    var states = chartElement.append('g')
      .attr('class', 'states');

    states.selectAll('path')
      .data(config['states']['features'])
      .enter().append('path')
        .attr('id', function(d) {
          return d['id'];
        })
				.attr('class', function(d) {
					var data = _.find(config['stores'], function(s) {
						return s['usps'] == d['id'];
					});

					if (_.isUndefined(data)) {
						return '';
					}

					if (data['smokers_pct'] < 10) {
						return 'first';
					} else if (data['smokers_pct'] < 15) {
						return 'second';
					} else if (data['smokers_pct'] < 20) {
						return 'third';
					} else if (data['smokers_pct'] < 25) {
						return 'fourth';
					} else {
						return 'fifth';
					}

					return '';
				})
        .attr('d', geoPath);
}

$(document).ready(function () {
  init();
});

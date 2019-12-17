//* Tory Elmore, Fall 2019 */
// GEOG 575 Lab 1; WW2 Bombing Mission Targets by Country 

// Data provided by www.datamil.org, compiled by Tory Elmore 
/// Map tileset was found at http://leaflet-extras.github.io/leaflet-               providers/preview/

//function used to create map
function createMap() {
    //create the map
    var map = L.map('map', {
        center: [30, 40],
        zoom: 2,
        zoomControl: false,
    });
    //add home button to map
    var zoomHome = L.Control.zoomHome({
        position: 'topright'
    });
    zoomHome.addTo(map);

    //add base tilelayer
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 18,
        ext: 'png'
    }).addTo(map);

    //call getData function
    getData(map);
    getPolyData(map);

};


//Step 2: Import GeoJSON data
function getData(map) {
    //load the data
    $.ajax("data/map.geojson", {
        dataType: "json",
        success: function (response) {
            //create an attributes array
            var attributes = processData(response);

            //call functions to create proportional symbols, sequence controls and legend
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map, attributes);
        }
    });
};

//build an attributes array from the data, called in getData. returned value throughout code for input into functions.
function processData(data) {

    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties) {
        //only take attributes with mission number values
        if (attribute.indexOf("BOMBS") > -1) {
            attributes.push(attribute);
        };
    };

    return attributes;
};


//Called in getData, creates layer for proportional symbols
function createPropSymbols(data, map, attributes) {
    //create a Leaflet GeoJSON layer and add it to the map
    var bombings = L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};


//called in createPropSymbols, creates proportional circle symbols
function pointToLayer(feature, latlng, attributes) {
    //determine which attribute to show proportionally
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#CD3530",
        color: "#650906",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9
    };

    //for each feature, determine its value for the selected attribute 
    var attValue = Number(feature.properties[attribute]);

    // give each feature's circle marker a radius based on attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //create popup per feature/circle
    var popup = new Popup(feature.properties, attribute, layer, options.radius);

    // add popup to circle marker
    popup.bindToLayer();


    //event listeners to open popup on hover and stay open on click
    layer.on({
        mouseover: function () {
            this.openPopup();
        },
        moueout: function () {
            this.closePopup();
        },
        click: function () {
            this.openPopup();
        },
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//calculate the radius of each proportional symbol; called in pointToLayer
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = .2;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area / Math.PI);

    return radius;
};

//Popup Constructor function, information in popup on circle marker
function Popup(properties, attribute, layer, radius) {
    this.properties = properties;
    this.attribute = attribute;
    this.layer = layer;
    this.country = properties.Country
    this.year = attribute.split("_")[0];
    this.missions = this.properties[attribute];
    this.content = "<p>There were <b> " + numberWithCommas(this.missions) + " </b>bombing missions targeting <b>" + this.country + " </b>in<b> " + this.year + "</b></p>";

    this.bindToLayer = function () {
        this.layer.bindPopup(this.content, {
            offset: new L.Point(0, -radius)
        });
    };
};


//Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute) {
    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            var popup = new Popup(props, attribute, layer, radius);

            //add popup to circle marker
            popup.bindToLayer();

            updateLegend(map, attribute);
        };
    });
};

//Creates the legend containing header information, sequence bar and boundary filter 
function createSequenceControls(map, attributes) {

    var SequenceControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name

            var container = L.DomUtil.create('div', 'sequence-control-container')

            // Header information 
            $(container).append('<h3 align=center id= "header">World War II Bombing Mission Targets <br> 1939-45</br></h3>')
            $(container).append('<p align=center id= "info"> This map displays the number of bombing missions targeting each country by year for the duration of World War II. The fifteen most-targeted countries are shown.<br><br> Below you can click through each year and also turn on country data. Scroll over or click on the circles to see the number of missions flown. </p>')


            /// seq legend ///

            var buttonR = '<button class="skip mr-2 mt-1" id="reverse" title="Reverse"></button>';
            var slider = '<input class="range-slider border-0" type="range"/>'
            var buttonF = '<button class="skip ml-2 mt-1" id="forward" title="Forward"></button>';

            var finalslider = (buttonR + slider + buttonF);

            $(container).append('<div id="slider-legend"', [finalslider]);

            //year under slider
            $(container).append('<p id="sequence-legend"> Year</p>');

            //Add country boundary toggle switch
            var toggle = '<p id="toggle-text"> Country Data <label class="switch" id="toggle-switch"><input type="checkbox"><span class="slider round"></span></label></p>';

            $(container).append('<div id="toggle-legend"', [toggle]);


            //kill any mouse event listeners on the map so map doesnt move when the container is clicked on 
            $(container).on('mousedown dblclick', function (e) {
                L.DomEvent.stopPropagation(e);
            });

            return container;
        }

    });

    map.addControl(new SequenceControl());


    //set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1,
    })

    //add skip buttons
    $('#reverse').html('<i class="fa fa-step-backward" aria-hidden="true"></i>');
    $('#forward').html('<i class="fa fa-step-forward" aria-hidden="true"></i>');

    $('.skip').click(function () {
        //get the old index value
        var index = $('.range-slider').val();

        //input listener for slider
        $('.range-slider').on('input', function () {
            //get new index value
            var index = $(this).val();
        });

        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward') {
            index++;
            //if past the last attribute wrap around to first attribute
            index = index > 6 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse') {
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index;
        };
        //update slider
        $('.range-slider').val(index);

        //pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]);
    });
};


//Called in getData, creates legend for the circle sizes
function createLegend(map, attributes) {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');


            /// symbol legend ////

            //add temporal legend div to container, the title of legend here
            $(container).append('<div id="temporal-legend">')

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="200px" height="90px">';

            //object to base loop on, gives position for text in legend
            var circles = {
                max: 40,
                mean: 60,
                min: 80,
            };

            //loop to add each circle and text to svg string
            for (var circle in circles) {
                //circle string, cx is the position of the cirlces
                svg += '<circle class="legend-circle" id="' + circle + '" fill="#CD3530" fill-opacity="0.9" stroke="#650906" cx="50"/>';

                //text string; x is the position of circle
                svg += '<text id="' + circle + '-text" x="90" y="' + circles[circle] + '"></text>';
            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);

            // end legend ///

            return container;
        }
    });

    map.addControl(new LegendControl());

    updateLegend(map, attributes[0]);
};

//Update the legend and sequence container with new attribute, called in createLegend and updatePropSymbols
function updateLegend(map, attribute) {
    //create content for legend
    var year = attribute.split("_")[0]
    var content = "<b>Bombing missions in " + year + "</b>";

    //replace sequence content text
    $('#sequence-legend').html(year);

    //replace legend content
    $('#temporal-legend').html(content);

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

    for (var key in circleValues) {
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //assign the cy and r attributes, cy gives position for circles in legend and makes sure they are all anchored together
        $('#' + key).attr({
            cy: 85 - radius,
            r: radius
        });

        //Legend text
        $('#' + key + '-text').text(numberWithCommas(circleValues[key]) + " missions");
    };

};

//Calculate the max, mean, and min values for a given attribute; called in updateLegend
function getCircleValues(map, attribute) {
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function (layer) {
        //get the attribute value
        if (layer.feature) {
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min) {
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max) {
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};


//function to create commas in number display
function numberWithCommas(x) {
    x = Math.round(x)
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// toggle country boundaries //

//load poly data
function getPolyData(map) {
    $.ajax("data/countries.geojson", {
        dataType: "json",
        success: function (response) {
            //create an attribute array
            var polyattributes = processPolyData(response);

            //call function to create symbol
            createSymbol(response, map, polyattributes);
        }

    });
};

//build an attributes array from the poly data
function processPolyData(data) {
    //empty array to hold attributes
    var polyattributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties) {
        //only take attributes with population values
        if (attribute.indexOf("TOTAL_BOMBS") > -1) {
            polyattributes.push(attribute);
        };
    };

    return polyattributes;
};

function stylePoly(feature, layer) {
    layer.bindPopup("<p><b>Target Country:</b> " + feature.properties.Country + "<br><b>Theater:</b> " + feature.properties.theater + "<br><b>Primary country flying missions:</b> " + feature.properties.p_attack + "<br><b> Total number of missions:</b> " + numberWithCommas(feature.properties.TOTAL_BOMBS) + "</p>");

    //event listeners to open popup on hover and fill panel on click
    layer.on({
        mouseover: function () {
            this.openPopup();
        },
        moueout: function () {
            this.closePopup();
        },
        'add': function () {
            layer.bringToBack()
        }

    });
}

//Called in getData
function createSymbol(data, map) {
    //create a Leaflet GeoJSON layer and add it to boundaries layer variable
    var boundaries = L.geoJson(data, {
        onEachFeature: stylePoly,
        fillColor: "#CD3530",
        color: "#650906",
        weight: 0.5,
        fillOpacity: .40,
    });


    //calls the toggle switch to add or remove country boundaries
    $(document).ready(function () {
        $('input[type="checkbox"]').click(function () {
            if ($(this).is(":checked")) {
                boundaries.addTo(map);
            } else if ($(this).is(":not(:checked)")) {
                map.removeLayer(boundaries);
            }
        });
    });

};

//calls function to create map
$(document).ready(createMap);

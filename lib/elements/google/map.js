/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Form = require("../../index");
var Element = require("../../element");
var entities = require("entities");
var util = require("util");
var _ = require("lodash");

function Map(name, options) {
    this._attribs = options.attribs;
    delete options.attribs;

    Element.call(this, name, options);

    this._htmlType = "hidden";

    var defaultOptions = {
        apiKey: "",
        zoom: 1,
        markerAtValue: false,
        markerDraggable: false,
        POIClickAsValue: false
    };

    this._options = _.extend(this._options, defaultOptions, options);
}

util.inherits(Map, Element);

Map.prototype.render = function(callback) {
    if (_.isFunction(callback))
    {
        var cbName = this.getName() + "_initGoogleMap";
        var value = this.getValue() && _.isArray(this.getValue()) ? this.getValue() : [0, 0];
        var htmlAttribs = [];

        _.forEach(this._attribs, function(value, name) {
            if (!_.isString(value))
                value = value.toString();

            htmlAttribs.push(name + "!=\"" + entities.encodeHTML(value) + "\"");
        });

        var viewScriptString =
            "script(async, defer, src='https://maps.googleapis.com/maps/api/js?key=" + this.getApiKey() + "&libraries=places&callback=" + cbName + "')" + "\r" +
            "div#" + this.getName() + "-map(" + htmlAttribs.join(", ") + ")" + "\r" +
            "script(type='text/javascript')." + "\r" +
                "\t" + "function " + cbName + "() {" + "\r" +
                    "\t\t" + "var center = {lat: " + value[1] + ", lng: " + value[0] + "};" + "\r" +
                    "\t\t" + "var map = new google.maps.Map(document.getElementById('" + this.getName() + "-map'), {" + "\r" +
                        "\t\t" + "zoom: " + this.getZoom() + "," + "\r" +
                        "\t\t" + "center: center" + "\r" +
                    "\t\t" + "});" + "\r" +
                    "\t\t" + "var marker;" + "\r" +
                    (this.getMarkerAtValue() ?
                        "\t\t" + "marker = new google.maps.Marker({" + "\r" +
                            "\t\t" + "draggable: " + this.getMarkerDraggable() + "," + "\r" +
                            "\t\t" + "map: map," + "\r" +
                            "\t\t" + "position: center" + "\r" +
                        "\t\t" + "});" + "\r" +
                        (this.getMarkerDraggable() ?
                            "\t\t" + "var markerListener = function() {" + "\r" +
                                "\t\t" + "var latitude = marker.getPosition().lat().toFixed(8);" + "\r" +
                                "\t\t" + "var longitude = marker.getPosition().lng().toFixed(8);" + "\r" +
                                "\t\t" + "var value = [longitude, latitude];" + "\r" +
                                "\t\t" + "$('input[name=\"" + this.getFullyQualifiedName(true) + "\"]').val(value);" + "\r" +
                                "\t\t" + "$('#" + this.getName() + "-map').trigger('markerdropped', value);" + "\r" +
                            "\t\t" + "};" + "\r" +
                            "\t\t" + "marker.addListener('dragend', markerListener);" + "\r" +
                            "\t\t" + "marker.addListener('position_changed', markerListener);" + "\r" +
                            "\t\t" + "if (" + this.getPOIClickAsValue() + ") {" + "\r" +
                                "\t\t" + "map.addListener('click', function(event) {" + "\r" +
                                    "\t\t" + "if (event.placeId) {" + "\r" +
                                        "\t\t" + "var service = new google.maps.places.PlacesService(map);" + "\r" +
                                        "\t\t" + "service.getDetails({ placeId: event.placeId }, function(place) {" + "\r" +
                                            "\t\t" + "if (confirm('Set marker to the following POI:\\r\\n\\r\\n' + place.name + '\\r\\n' + place.formatted_address)) {" + "\r" +
                                                "\t\t" + "var latitude = parseFloat(place.geometry.location.lat().toFixed(8));" + "\r" +
                                                "\t\t" + "var longitude = parseFloat(place.geometry.location.lng().toFixed(8));" + "\r" +
                                                "\t\t" + "marker.setPosition({lat: latitude, lng: longitude});" + "\r" +
                                            "\t\t" + "}" + "\r" +
                                        "\t\t" + "});" + "\r" +
                                    "\t\t" + "}" + "\r" +
                                "\t\t" + "})" + "\r" +
                            "\t\t" + "}" + "\r"
                            :
                            ""
                        )
                        :
                        ""
                    ) +
                    "\t\t" + "$('input[name=\"" + this.getFullyQualifiedName(true) + "\"]').on('change', function() {" + "\r" +
                        "\t\t" + "var geo = $(this).val().split(',');" + "\r" +
                        "\t\t" + "if (geo.length == 2) {" + "\r" +
                            "\t\t" + "geo = {lat: parseFloat(geo[1]), lng: parseFloat(geo[0])}" + "\r" +
                            "\t\t" + "map.setCenter(geo);" + "\r" +
                            "\t\t" + "if (marker) { marker.setPosition(geo); }" + "\r" +
                        "\t\t" + "}" + "\r" +
                    "\t\t" + "});" + "\r" +
                "\t}"
        ;

        this.setViewScriptString(viewScriptString);

        Form.Element.prototype.render.call(this, callback);
    }
    else
        return Form.Element.prototype.render.call(this);
};

Map.prototype.getApiKey             = function() { return this._options.apiKey; };
Map.prototype.getMarkerAtValue      = function() { return this._options.markerAtValue; };
Map.prototype.getMarkerDraggable    = function() { return this._options.markerDraggable; };
Map.prototype.getPOIClickAsValue    = function() { return this._options.POIClickAsValue; };
Map.prototype.getZoom               = function() { return this._options.zoom; };

Map.prototype.setApiKey             = function(apiKey)          { this._options.apiKey = apiKey; };
Map.prototype.setMarkerAtValue      = function(markerAtValue)   { this._options.markerAtValue = markerAtValue; };
Map.prototype.setMarkerDraggable    = function(markerDraggable) { this._options.markerDraggable = markerDraggable; };
Map.prototype.setPOIClickAsValue    = function(POIClickAsValue) { this._options.POIClickAsValue = POIClickAsValue; };
Map.prototype.setZoom               = function(zoom)            { this._options.zoom = zoom; };

module.exports = exports = Map;

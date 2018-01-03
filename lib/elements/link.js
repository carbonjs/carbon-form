/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Element = require("../element");
var util = require("util");

function Link(name, options) {
    Element.call(this, name, options);

    this._render.htmlTag = "a";
}

util.inherits(Link, Element);

module.exports = exports = Link;

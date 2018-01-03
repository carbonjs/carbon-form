/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Element = require("../element");
var util = require("util");

function Button(name, options) {
    Element.call(this, name, options);

    this._render.htmlTag = "button";
}

util.inherits(Button, Element);

module.exports = exports = Button;

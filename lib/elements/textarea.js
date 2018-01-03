/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Element = require("../element");
var util = require("util");

function Textarea(name, options) {
    Element.call(this, name, options);

    this._render.htmlTag = "textarea";
}

util.inherits(Textarea, Element);

module.exports = exports = Textarea;

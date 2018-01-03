/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Element = require("../element");
var util = require("util");

function Text(name, options) {
    Element.call(this, name, options);

    this._htmlType = "text";
}

util.inherits(Text, Element);

module.exports = exports = Text;

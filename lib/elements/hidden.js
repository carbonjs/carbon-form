/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Element = require("../element");
var util = require("util");

function Hidden(name, options) {
    Element.call(this, name, options);

    this._htmlType = "hidden";
}

util.inherits(Hidden, Element);

module.exports = exports = Hidden;

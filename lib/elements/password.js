/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Element = require("../element");
var util = require("util");

function Password(name, options) {
    Element.call(this, name, options);

    this._htmlType = "password";
};

util.inherits(Password, Element);

module.exports = exports = Password;

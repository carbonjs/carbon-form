var Element = require("../element");
var util = require("util");
var _ = require("lodash");

function FileUpload(name, options) {
    Element.call(this, name, options);

    this._htmlType = "file";
}

util.inherits(FileUpload, Element);

module.exports = exports = FileUpload;

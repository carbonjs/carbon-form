var Text = require("./text");
var util = require("util");

var Validate = require("carbon-validate");

function EmailAddress(name, options) {
    Text.call(this, name, options);

    this.addValidator(new Validate.EmailAddress(options));
}

util.inherits(EmailAddress, Text);

module.exports = exports = EmailAddress;

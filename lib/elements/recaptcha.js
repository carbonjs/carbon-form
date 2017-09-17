var Form = require("../index");
var Element = require("../element");
var util = require("util");
var _ = require("lodash");

function Recaptcha(name, options) {
    Element.call(this, name, options);

    this._render.htmlTag = "div";

    var defaultOptions = {
        secretKey: "",
        siteKey: ""
    };

    this._options = _.extend(this._options, defaultOptions, options);
}

util.inherits(Recaptcha, Element);

Recaptcha.prototype.isValid = function(value, context, callback) {
    var $this = this;
    var $value = value;

    Form.Element.prototype.isValid.call(this, value, context, function(err, value) {
        if (err)
            callback(err, value);
        else
        {
            var request = require("request");

            request.post("https://www.google.com/recaptcha/api/siteverify", {
                form: {
                    secret: $this.getSecretKey(),
                    response: $value
                }
            }, function(err, httpResponse, body) {
                if (err)
                {
                    $this.setError(err);
                    callback(err, value);
                }
                else
                {
                    body = JSON.parse(body);

                    if (body.success)
                        callback(null, value);
                    else
                    {
                        var error = "An error occurred. Please try again.";

                        $this.setError(error);
                        callback(error, value);
                    }
                }
            });
        }
    });
};

Recaptcha.prototype.render = function(callback) {
    if (_.isFunction(callback))
    {
        var viewScriptString =  "\tscript(src='https://www.google.com/recaptcha/api.js?hl=en')\r" +
                                "\tdiv.g-recaptcha(data-sitekey='" + this.getSiteKey() + "')\r"
        ;

        this.setViewScriptString(viewScriptString);

        Form.Element.prototype.render.call(this, callback);
    }
    else
        return Form.Element.prototype.render.call(this);
};

Recaptcha.prototype.getSecretKey    = function() { return this._options.secretKey; };
Recaptcha.prototype.getSiteKey      = function() { return this._options.siteKey; };

Recaptcha.prototype.setSecretKey    = function(secretKey)   { this._options.secretKey = secretKey; };
Recaptcha.prototype.setSiteKey      = function(siteKey)     { this._options.siteKey = siteKey; };

module.exports = exports = Recaptcha;

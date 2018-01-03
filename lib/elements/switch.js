/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Form = require("../index");
var Element = require("../element");
var util = require("util");
var _ = require("lodash");

function Switch(name, options) {
    var defaultOptions = {
        attribs: {
            class: "switch"
        },
        forceBoolean: false,
        checkedClass: "",
        checkedContent: "",
        checkedValue: 1,
        uncheckedClass: "",
        uncheckedContent: "",
        uncheckedValue: 0
    };

    options = _.extend({}, defaultOptions, options);

    Element.call(this, name, options);

    this._render.htmlTag = "";
}

util.inherits(Switch, Element);

Switch.prototype.getValue = function() {
    if (this.isChecked())
        return this.getOptions().forceBoolean ? true : this.getCheckedValue();
    else
        return this.getOptions().forceBoolean ? false : this.getUncheckedValue();
};

Switch.prototype.isChecked = function() {
    var value = Element.prototype.getValue.call(this);

    if (this.getOptions().forceBoolean)
        return (value == true);
    else
        return String(value).toLowerCase() == String(this.getCheckedValue()).toLowerCase();
};

Switch.prototype.render = function(callback) {
    if (_.isFunction(callback))
    {
        var checkedString = this.isChecked() ? ", checked='checked'" : "";

        var viewScriptString =  "label.switch\r" +
                                "\tinput(type='hidden', value='" + this.getUncheckedValue() + "', name='" + this.getFullyQualifiedName(true) + "')\r" +
                                "\tinput(type='checkbox', id='" + this.getName() + "', value='" + this.getCheckedValue() + "', name='" + this.getFullyQualifiedName(true) + "'" + checkedString + ")\r" +
                                "\tspan.switch-tick\r" +
                                "\t\tspan.switch-unchecked(class='" + this.getUncheckedClass() + "').\r" +
                                "\t\t\t" + this.getUncheckedContent() + "\r" +
                                "\t\tspan.switch-checked(class='" + this.getCheckedClass() + "').\r" +
                                "\t\t\t" + this.getCheckedContent() + "\r"
        ;

        if (this.getLabel())
        {
            viewScriptString += "\tspan.switch-label.\r" +
                                "\t\t" + this.getLabel() + "\r"
            ;
        }

        this.setViewScriptString(viewScriptString);

        Form.Element.prototype.render.call(this, callback);
    }
    else
        return Form.Element.prototype.render.call(this);
};

Switch.prototype.setValue = function(value) {
    if (_.isArray(value))
        value = value.slice(-1).pop();

    Form.Element.prototype.setValue.call(this, value);
};

Switch.prototype.getCheckedClass        = function() { return this._options.checkedClass; };
Switch.prototype.getCheckedContent      = function() { return this._options.checkedContent; };
Switch.prototype.getCheckedValue        = function() { return this._options.checkedValue; };
Switch.prototype.getUncheckedClass      = function() { return this._options.uncheckedClass; };
Switch.prototype.getUncheckedContent    = function() { return this._options.uncheckedContent; };
Switch.prototype.getUncheckedValue      = function() { return this._options.uncheckedValue; };

Switch.prototype.setCheckedClass        = function(checkedClass)        { this._options.checkedClass = checkedClass; };
Switch.prototype.setCheckedContent      = function(checkedContent)      { this._options.checkedContent = checkedContent; };
Switch.prototype.setCheckedValue        = function(checkedValue)        { this._options.checkedValue = checkedValue; };
Switch.prototype.setUncheckedClass      = function(uncheckedClass)      { this._options.uncheckedClass = uncheckedClass; };
Switch.prototype.setUncheckedContent    = function(uncheckedContent)    { this._options.uncheckedContent = uncheckedContent; };
Switch.prototype.setUncheckedValue      = function(uncheckedValue)      { this._options.uncheckedValue = uncheckedValue; };

module.exports = exports = Switch;

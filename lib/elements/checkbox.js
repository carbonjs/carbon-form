/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Form = require("../index");
var Element = require("../element");
var util = require("util");
var _ = require("lodash");
var jade = require("jade");

function Checkbox(name, options) {
    Element.call(this, name, options);

    this._htmlType = "checkbox";

    var defaultOptions = {
        labelPosition: 0,
        checkedValue: 1,
        uncheckedValue: 0
    };

    this._options = _.extend(this._options, defaultOptions, options);
}

util.inherits(Checkbox, Element);

Checkbox.prototype.render = function(callback) {
    var $this = this;

    if (_.isFunction(callback))
    {
        Form.Element.prototype.render.call(this, function(err, htmlCheckbox) {
            var viewScriptString = "input(type='hidden', value='" + $this.getUncheckedValue() + "', name='" + $this.getFullyQualifiedName() + "')";
            var html = jade.render(viewScriptString) + htmlCheckbox;

            if ($this.getLabel())
            {
                viewScriptString =  "label(for='" + $this.getFullyQualifiedName() + "').\r" +
                                    "\t" + $this.getLabel() + "\r"
                ;

                var htmlLabel = jade.render(viewScriptString);

                if ($this.getLabelPosition())
                    html += htmlLabel;
                else
                    html = htmlLabel + html;
            }

            $this._renderHtml = html;

            callback(null, html);
        });
    }
    else
        return Form.Element.prototype.render.call(this);
};

Checkbox.prototype.getCheckedValue      = function() { return this._options.checkedValue; };
Checkbox.prototype.getLabelPosition     = function() { return this._options.labelPosition; };
Checkbox.prototype.getUncheckedValue    = function() { return this._options.uncheckedValue; };

Checkbox.prototype.setCheckedValue      = function(checkedValue)    { this._options.checkedValue = checkedValue; };
Checkbox.prototype.setLabelPosition     = function(labelPosition)   { this._options.labelPosition = labelPosition; };
Checkbox.prototype.setUncheckedValue    = function(uncheckedValue)  { this._options.uncheckedValue = uncheckedValue; };

module.exports = exports = Checkbox;

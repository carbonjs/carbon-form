/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var Form = require("../index");
var Element = require("../element");
var util = require("util");
var _ = require("lodash");
var jade = require("jade");

function Select(name, options) {
    Element.call(this, name, options);

    this._render.htmlTag = "select";
    this._render.hasCustomRenderChildren = true;

    var defaultOptions = {
        choices: [],
        groups: []
    };

    this._options = _.extend(this._options, defaultOptions, options);
}

util.inherits(Select, Element);

Select.prototype.addChoice = function(value, text, group)
{
    var item = _.find(this.getChoices(), { value: value });

    if (!item)
    {
        this._options.choices.push({
            value: value,
            text: text,
            group: group ? group : null
        });
    }
};

Select.prototype.addGroup = function(id, text)
{
    var group = _.find(this.getGroups(), { id: id });

    if (!group)
    {
        this._options.groups.push({
            id: id,
            text: text
        });
    }
};

Select.prototype.render = function(callback, options)
{
    var $this = this;

    if (!_.isObject(options))
        options = {};

    if (_.isFunction(callback))
    {
        Form.Element.prototype.render.call(this, function(err, htmlSelect) {
            var html = "";
            var structure = [];

            _.each($this.getChoices(), function(choice) {
                choice.selected = (choice.value == $this.getValue());

                if (choice.group)
                {
                    var group = _.find(structure, { type: "group", id: choice.group });
                    var index;

                    if (group)
                    {
                        index = structure.indexOf(group);

                        if (index > - 1)
                        {
                            group = structure[index];
                            group.items.push(choice);
                        }
                    }
                    else
                    {
                        group = _.find($this.getGroups(), { id: choice.group });

                        group = {
                            type: "group",
                            id: group.id,
                            text: group.text,
                            items: []
                        };

                        group.items.push(choice);
                        structure.push(group);
                    }
                }
                else
                {
                    structure.push({
                        type: "item",
                        value: choice.value,
                        selected: choice.selected,
                        text: choice.text
                    });
                }
            });

            var renderOption = function(item, spacing)
            {
                spacing = spacing || 1;

                return "\t".repeat(spacing) + "option(value='" + item.value + "'" + (item.selected ? " selected" : "") +") " + item.text + "\r";
            };

            _.each(structure, function(item) {
                if (item.type == "group")
                {
                    html += "\toptgroup(label='" + item.text + "')\r";

                    _.each(item.items, function(item) {
                        html += renderOption(item, 2);
                    });
                }
                else
                    html += renderOption(item, 1);
            });

            if ($this._render.hasCustomRenderChildren)
                html = htmlSelect.replace("%%custom_render_children%%", html);
            else
                html = htmlSelect + "\r" + html;

            html = options.noRender ? html : jade.render(html);

            $this._renderHtml = html;

            callback(null, html);
        }, { noRender: true });
    }
    else
    {
        return Form.Element.prototype.render.call(this);
    }
};

/*Checkbox.prototype.render = function(callback) {
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
};*/

Select.prototype.getChoices = function() { return this._options.choices; };
Select.prototype.getGroups  = function() { return this._options.groups; };

module.exports = exports = Select;

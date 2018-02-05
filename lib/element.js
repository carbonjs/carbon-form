/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var fs = require("fs");

var async = require("async");
var entities = require("entities");
var jade = require("jade");
var _ = require("lodash");

var Validate = require("carbon-validate");

function Element(name, options) {
    var defaultOptions = {
        name: null,
        value: null,
        label: null,
        belongsTo: null,
        isArray: false,
        placeholder: null,
        attribs: {},
        filters: [],
        validators: [],
        viewScriptData: {},
        viewScriptFile: "",
        viewScriptPaths: []
    };

    this._options = _.extend(defaultOptions, this._options, options);

    this._options.name = name;

    this._error = null;

    this._render = {
        htmlTag: "input"
    };
}

Element.prototype.addClass = function(className) {
    var classes = this._options.attribs.class ? this._options.attribs.class : "";
    var classArray = classes.split(" ");

    if (classArray.indexOf(className) < 0)
        classArray.push(className);

    this._options.attribs.class = classArray.join(" ");
};

Element.prototype.addValidator = function(validator) {
    if (validator instanceof Validate)
        this._options.validators.push(validator);
};

Element.prototype.getFilter = function(instance) {
    var result = null;

    _.each(this.getFilters(), function(filter) {
        if (_.isString(instance))
        {
            if (filter instanceof eval(instance))
            {
                result = validator;
                return false;
            }
        }
        else
        {
            if (filter instanceof instance)
            {
                result = filter;
                return false;
            }
        }
    });

    return result;
};

Element.prototype.getFullyQualifiedName = function(HTMLnotation) {
    var name;

    if (this.getName().match(/^\d/))
        name = (this.getBelongsTo() ? this.getBelongsTo() + "[" + (HTMLnotation ? "" : "\"") : "") + this.getName() + (this.getBelongsTo() ? (HTMLnotation ? "" : "\"") + "]" : "");
    else
        name = (this.getBelongsTo() ? this.getBelongsTo() + "." : "") + this.getName();

    if (HTMLnotation)
    {
        name = name.replace(/\./, "[");
        name = name.replace(/\./g, "][");

        if (this.getBelongsTo())
            name += "]";

        if (this.getIsArray())
            name += "[]";
    }

    return name;
};

Element.prototype.getValidator = function(instance) {
    var result = null;

    _.each(this.getValidators(), function(validator) {
        if (_.isString(instance))
        {
            if (validator instanceof eval(instance))
            {
                result = validator;
                return false;
            }
        }
        else
        {
            if (validator instanceof instance)
            {
                result = validator;
                return false;
            }
        }
    });

    return result;
};

Element.prototype.getValue = function() {
    var value = this._options.value;
    var filters = [];

    _.forEach(this._options.filters, function(filter) {
        if (filter.filter.length == 1)
        {
            if (_.isArray(value))
            {
                for (var index = 0; index < value.length; index++)
                    value[index] = filter.filter(value[index]);
            }
            else
                value = filter.filter(value);
        }
    });

    return value;
};

Element.prototype.hasClass = function(className) {
    var classes = this._options.attribs.class ? this._options.attribs.class : "";
    var classArray = classes.split(" ");

    return (classArray.indexOf(className) > -1);
};

Element.prototype.isRequired = function() {
    var isRequired = false;

    _.each(this.getValidators(), function(validator) {
        if (validator instanceof Validate.NotEmpty)
        {
            isRequired = true;
            return false;
        }
    });

    return isRequired;
};

Element.prototype.isValid = function(value, context, callback) {
    var element = this;

    this.setError(null);
    this.setValue(value);
    value = this.getValue();

    if (this._options.validators.length)
    {
        var values = value;
        var errors;
        var validators = [];

        if (_.isArray(values))
            errors = {};
        else
            values = [values];

        _.forEach(values, function(value, index) {
            _.forEach(element.getValidators(), function(validator) {
                if ((element.getIsArray() && errors[index]) ||
                    (!element.getIsArray() && errors))
                {
                    return;
                }

                validators.push(function(callback) {
                    validator.isValid(value, context, function(err, value) {
                        if (err)
                        {
                            if (element.getIsArray())
                                errors[index] = validator.getError();
                            else
                                errors = validator.getError();
                        }

                        callback(err, value);
                    });
                });
            });
        });

        async.series(validators, function(err, results) {
            if (_.isObject(errors) && !Object.keys(errors).length)
                errors = undefined;

            element.setError(errors);

            callback(element.getError(), value);
        });

    }
    else
        callback(null, value);
};

Element.prototype.removeClass = function(className) {
    var classes = this._options.attribs.class ? this._options.attribs.class : "";
    var classArray = classes.split(" ");
    var index = classArray.indexOf(className);

    if (index)
        delete classArray[index];

    this._options.attribs.class = classArray.join(" ");
};

Element.prototype.removeValidator = function(validator) {
    if (validator.prototype instanceof Validate)
    {
        this._options.validators = _.reject(this._options.validators, function(validate) {
            return (validate instanceof validator);
        });
    }
};

Element.prototype.render = function(callback, options) {
    if (!_.isObject(options))
        options = {};

    if (_.isFunction(callback))
    {
        var $this = this;
        var jadeString = this._render.htmlTag ? this._render.htmlTag + "(" : "";
        var htmlAttribs = [];

        _.forEach(this.getValidators(), function(validator) {
            if (validator instanceof Validate.NotEmpty)
                $this._options.attribs["data-required"] = true;
        });

        var attribs = _.extend({
            name: this.getFullyQualifiedName(true),
            id: this._options.attribs.id ? this._options.attribs.id : this.getName()
        }, this._options.attribs);

        if (this._render.htmlTag)
        {
            if (this._htmlType)
                attribs.type = this._htmlType;

            if (this._options.placeholder)
                attribs.placeholder = this._options.placeholder;

            if (!_.isUndefined(this._options.value) && !_.isNull(this._options.value))
            {
                if (this._render.htmlTag == "textarea")
                    this._options.content = this._options.value;
                else if (this._render.htmlTag == "input")
                    attribs.value = this._options.value;
            }

            if (this.getError())
            {
                var classes = (!_.isUndefined(attribs["class"]) ? attribs["class"].split(" ") : []);
                classes.push("has-error");

                attribs["class"] = classes.join(" ");
            }

            _.forEach(attribs, function(value, name) {
                if (!_.isString(value))
                    value = value.toString();

                htmlAttribs.push(name + "!=\"" + entities.encodeHTML(value) + "\"");
            });

            jadeString += htmlAttribs.join(", ");
            jadeString += ")";
        }

        if (this.getViewScriptString())
            jadeString += "\r" + this.getViewScriptString();
        else
        {
            if (this._options.content)
            {
                // We need to split content to lines (\r\n or \n) so that we can prepend spacing required by Jade to each line

                var content = this._options.content;
                content = content.replace(/\n(?!>)/g, "\n  ");

                jadeString += ".\r  " + content;
            }
        }

        var elementString = jadeString;
        var html = "";

        if (this.getViewScriptFile())
        {
            var viewScriptPaths = [];
            var path = require("path");
            var i = 0;
            var viewScriptPath = "";

            var addSlash = function(path)
            {
                return path + (path.slice(-1) != "/" ? "/" : "");
            };

            if (!path.isAbsolute(this.getViewScriptFile()) && this.getViewScriptPaths().length)
            {
                var viewPaths = this.getViewScriptPaths();

                for (i = 0; i < this.getViewScriptPaths().length; i++)
                {
                    viewScriptPaths.push(addSlash(viewPaths[i]) + this.getViewScriptFile());
                }
            }
            else
                viewScriptPaths.push(this.getViewScriptPaths());

            for (i = 0; i < viewScriptPaths.length; i++)
            {
                viewScriptPath = viewScriptPaths[i];

                try
                {
                    if (fs.lstatSync(viewScriptPath).isFile())
                        break;
                }
                catch (err) { }
            }

            var elementHtml = jade.render(jadeString);

            html = jade.renderFile(viewScriptPath, {
                element: this,
                elementHtml: elementHtml,
                data: this._options.viewScriptData
            });
        }
        else
        {
            html = options.noRender ? elementString : jade.render(elementString);
        }

        if (this.getError())
            html += jade.render("\r.form-error " + this.getError());

        this._renderHtml = html;

        callback(null, html);
    }
    else
    {
        return this._renderHtml;
    }
};

Element.prototype.setValue = function(value)
{
    if (_.isString(value) && value.trim().toLowerCase() == "null")
        value = "";

    this._options.value = value;
};

Element.prototype.setViewScriptPaths = function(viewScriptPaths)
{
    this._options.viewScriptPaths = [];

    if (_.isArray(viewScriptPaths))
        this._options.viewScriptPaths = this._options.viewScriptPaths.concat(viewScriptPaths);
    else
        this._options.viewScriptPaths.push(viewScriptPaths);
};

Element.prototype.getAttrib             = function(name) { return this._options.attribs[name]; };

Element.prototype.getAttribs            = function() { return this._options.attribs; };
Element.prototype.getBelongsTo          = function() { return this._options.belongsTo; };
Element.prototype.getError              = function() { return this._error; };
Element.prototype.getFilters            = function() { return this._options.filters; };
Element.prototype.getGroup              = function() { return this._options.group; };
Element.prototype.getId                 = function() { return this._options.attribs.id; };
Element.prototype.getIsArray            = function() { return this._options.isArray; };
Element.prototype.getLabel              = function() { return this._options.label; };
Element.prototype.getName               = function() { return this._options.name; };
Element.prototype.getOptions            = function() { return this._options; };
Element.prototype.getPlaceholder        = function() { return this._options.placeholder; };
Element.prototype.getValidators         = function() { return this._options.validators; };
Element.prototype.getViewScriptData     = function() { return this._options.viewScriptData; };
Element.prototype.getViewScriptFile     = function() { return this._options.viewScriptFile; };
Element.prototype.getViewScriptPaths    = function() { return this._options.viewScriptPaths; };
Element.prototype.getViewScriptString   = function() { return this._options.viewScriptString; };

Element.prototype.hasAttrib             = function(name) { return !_.isUndefined(this._options.attribs[name]); };
Element.prototype.hasError              = function() { return (this._error !== null); };

Element.prototype.removeValidators      = function() { this._options.validators = []; };

Element.prototype.setBelongsTo          = function(belongsTo)           { this._options.belongsTo = belongsTo; };
Element.prototype.setError              = function(error)               { this._error = _.isString(error) || _.isObject(error) ? error : null; };
Element.prototype.setGroup              = function(group)               { this._options.group = group; };
Element.prototype.setId                 = function(id)                  { this._options.attribs.id = id; };
Element.prototype.setIsArray            = function(isArray)             { this._options.isArray = isArray; };
Element.prototype.setLabel              = function(label)               { this._options.label = label; };
Element.prototype.setName               = function(name)                { this._options.name = name; };
Element.prototype.setPlaceholder        = function(placeholder)         { this._options.placeholder = placeholder; };
Element.prototype.setViewScriptData     = function(viewScriptData)      { this._options.viewScriptData = viewScriptData; };
Element.prototype.setViewScriptFile     = function(viewScriptFile)      { this._options.viewScriptFile = viewScriptFile; };
Element.prototype.setViewScriptPaths    = function(viewScriptPaths)     { this._options.viewScriptPaths = viewScriptPaths; };
Element.prototype.setViewScriptString   = function(viewScriptString)    { this._options.viewScriptString = viewScriptString; };

module.exports = exports = Element;

exports.Button = require("./elements/button");
exports.Checkbox = require("./elements/checkbox");
exports.EmailAddress = require("./elements/email-address");
exports.FileUpload = require("./elements/fileupload");
exports.FileUploadX = require("./elements/fileupload-x/");
exports.Hidden = require("./elements/hidden");
exports.Link = require("./elements/link");
exports.Password = require("./elements/password");
exports.Recaptcha = require("./elements/recaptcha");
exports.Select = require("./elements/select");
exports.Switch = require("./elements/switch");
exports.Text = require("./elements/text");
exports.Textarea = require("./elements/textarea");

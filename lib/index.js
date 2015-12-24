var fs = require("fs");

var async = require("async");
var jade = require("jade");
var _ = require("lodash");

require("async-rollback");

function Form(options) {
    var defaultOptions = {
        action: null,
        id: null,
        method: "post",
        attribs: {},
        viewScriptData: {},
        viewScriptFile: "",
        viewScriptPaths: []
    };

    this._options = _.extend(defaultOptions, options);

    this._elements = {};
    this._subforms = {};

    this._elementsBelongTo = null;
    this._isSubForm = false;
}

Form.prototype.addElement = function(element) {
    this._elements[element.getName()] = element;
};

Form.prototype.addElements = function(elements) {
    var $this = this;

    _.forEach(elements, function(element) {
        $this.addElement(element);
    });
};

Form.prototype.addSubForm = function(name, form) {
    form.setElementsBelongTo(name);
    form._isSubForm = true;

    _.forEach(form.getElements(), function(element) {
        element.setBelongsTo(name);
    });

    if (!form.getId())
        form.setId(this.getId() + "-" + name);

    this._subforms[name] = form;
};

Form.prototype.getElement = function(name) {
    return (this._elements[name] ? this._elements[name] : null);
};

Form.prototype.getErrors = function() {
    var errors = {};

    _.forEach(this.getElements(), function(element, name) {
        if (element.getError())
            errors[name] = element.getError();
    });

    _.forEach(this.getSubForms(), function(subform, subformName) {
        _.forEach(subform.getElements(), function(element) {
            if (element.getError())
            {
                if (!errors[subformName])
                    errors[subformName] = {};

                errors[subformName][element.getName()] = element.getError();
            }
        })
    });

    return errors;
};

Form.prototype.getValues = function() {
    var values = {};

    _.forEach(this._elements, function(element) {
        values[element.getName()] = element.getValue();
    });

    _.forEach(this.getSubForms(), function(subform, name) {
        if (!values[name])
            values[name] = {};

        _.forEach(subform.getElements(), function(element) {
            values[name][element.getName()] = element.getValue();
        });
    });

    return values;
};

Form.prototype.isValid = function(values, callback) {
    var functions = [];
    var $this = this;

    values = _.extend({}, this.getValues(), values);

    _.forEach(this._subforms, function(subform, name) {
        functions.push(function(callback) {
            subform.isValid(values[name], function(err, values) {
                callback(err, values);
            });
        });
    });

    _.forEach(this._elements, function(element) {
        var val;

        if (_.isUndefined(values[element.getName()]))
            val = null;
        else
            val = values[element.getName()];

        functions.push(function(callback) {
            element.isValid(val, $this.getValues(), function(err, value) {
                if (err)
                {
                    var error = {};

                    if (element.getBelongsTo())
                    {
                        if (!error[element.getBelongsTo()])
                            error[element.getBelongsTo()] = {};

                        error[element.getBelongsTo()][element.getName()] = element.getError();
                    }
                    else
                        error[element.getName()] = element.getError();

                    err = error;
                }

                callback(err, value);
            });
        });
    });

    var processErrors = function(errors) {
        if (errors)
        {
            if (_.isArray(errors[0]))
                processErrors(errors[0]);

            var extend = require("extend");
            var result = {};

            for (var i = 0; i < errors.length; i++)
            {
                if (errors[i])
                    result = extend(true, result, errors[i]);
            }

            return result;
        }
        else
            return null;
    };

    async.parallelAll(functions, function(err, values) {
        err = processErrors(err);

        callback(err, $this.getValues());
    });
};

Form.prototype.populate = function(values) {
    _.forEach(this._subforms, function(subform, name) {
        subform.populate(values[name]);
    });

    _.forEach(this._elements, function(element) {
        var val;

        if (_.isUndefined(values[element.getName()]))
            val = null;
        else
            val = values[element.getName()];

        element.setValue(val);
    });
};

Form.prototype.removeElement = function(name) {
    this.setElements(_.omit(this.getElements(), function(element, key) {
        return (name == key);
    }))
};

Form.prototype.render = function(callback) {
    if (_.isFunction(callback))
    {
        var $this = this;
        var renderFunctions = [];

        _.forEach($this._subforms, function(subform, name) {
            renderFunctions.push(subform.render.bind(subform));
        });

        _.forEach($this._elements, function(element, name) {
            element.setViewScriptPaths($this.getViewScriptPaths());
            renderFunctions.push(element.render.bind(element));
        });

        async.parallelAll(renderFunctions, function(err, results) {
            var jadeString;
            var elements = {};
            var htmlAttribs = [];
            var attribs = _.extend({}, $this._options.attribs, {
                action: $this.getAction() ? $this.getAction() : undefined,
                method: $this.getMethod()
            });

            if ($this._options.id)
                attribs.id = $this._options.id;

            _.each(attribs, function(value, name) {
                if (!_.isUndefined(value))
                    htmlAttribs.push(name + "=\"" + value + "\"");
            });

            if (!$this._isSubForm)
            {
                jadeString = "form(";
                jadeString += htmlAttribs.join(", ");
                jadeString += ") %%content%%";
            }
            else
                jadeString = " %%content%%";

            var formHtml = jade.render(jadeString);

            if ($this.getViewScriptFile())
            {
                var viewScriptPaths = [];
                var path = require("path");

                var addSlash = function(path)
                {
                    return path + (path.slice(-1) != "/" ? "/" : "");
                }

                if (!path.isAbsolute($this.getViewScriptFile()) && $this.getViewScriptPaths().length)
                {
                    var viewPaths = $this.getViewScriptPaths();

                    for (var i = 0; i < $this.getViewScriptPaths().length; i++)
                    {
                        viewScriptPaths.push(addSlash(viewPaths[i]) + $this.getViewScriptFile());
                    }
                }
                else
                    viewScriptPaths.push($this.getViewScriptFile());

                for (var i = 0; i < viewScriptPaths.length; i++)
                {
                    var viewScriptPath = viewScriptPaths[i];

                    try
                    {
                        if (fs.lstatSync(viewScriptPath).isFile())
                            break;
                    }
                    catch (err) { }
                }

                var compiledContent = jade.renderFile(viewScriptPath, {
                    elements: $this._elements,
                    subforms: $this._subforms,
                    data: $this._options.viewScriptData
                });

                var html = formHtml.replace("%%content%%", compiledContent);
            }
            else
                var html = "";

            $this._renderHtml = html

            callback(null, html);
        });
    }
    else
        return this._renderHtml;
};

Form.prototype.reset = function() {
    _.forEach(this._subforms, function(subform, name) {
        subform.reset();
    });

    _.forEach(this._elements, function(element, name) {
        element.setValue("");
    });
};

Form.prototype.setViewScriptPaths = function(viewScriptPaths)
{
    this._options.viewScriptPaths = [];

    if (_.isArray(viewScriptPaths))
        this._options.viewScriptPaths = this._options.viewScriptPaths.concat(viewScriptPaths);
    else
        this._options.viewScriptPaths.push(viewScriptPaths);
}

Form.prototype.getAction            = function() { return this._options.action; };
Form.prototype.getElements          = function() { return this._elements; };
Form.prototype.getElementsBelongTo  = function() { return this._elementsBelongTo; };
Form.prototype.getId                = function() { return this._options.id; };
Form.prototype.getMethod            = function() { return this._options.method; };
Form.prototype.getSubForms          = function() { return this._subforms; };
Form.prototype.getViewScriptData    = function() { return this._options.viewScriptData; };
Form.prototype.getViewScriptFile    = function() { return this._options.viewScriptFile; };
Form.prototype.getViewScriptPaths   = function() { return this._options.viewScriptPaths; };

Form.prototype.setAction            = function(action) { this._options.action = action; };
Form.prototype.setElements          = function(elements) { this._elements = elements; };
Form.prototype.setElementsBelongTo  = function(elementsBelongTo) { this._elementsBelongTo = elementsBelongTo; };
Form.prototype.setId                = function(id) { this._options.id = id; };
Form.prototype.setMethod            = function(method) { this._options.method = method; };
Form.prototype.setSubForms          = function(subforms) { this._subforms = subforms; };
Form.prototype.setViewScriptData    = function(viewScriptData) { this._options.viewScriptData = viewScriptData; };
Form.prototype.setViewScriptFile    = function(viewScriptFile) { this._options.viewScriptFile = viewScriptFile; };

module.exports = exports = Form;

exports.Element = require("./element.js");

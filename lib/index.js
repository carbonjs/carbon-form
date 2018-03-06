/**
 * @Author: Amir Ahmetovic <choxnox>
 * @License: MIT
 */

var events = require("events");
var fs = require("fs");
var util = require("util");

var async = require("async");
var jade = require("jade");
var _ = require("lodash");

//require("async-rollback");

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

util.inherits(Form, events.EventEmitter);

Form.prototype.addElement = function(element) {
    _.set(this._elements, element.getFullyQualifiedName(), element);

    if (element instanceof Form.Element.FileUpload)
        this._options.attribs.enctype = "multipart/form-data";
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
    return _.get(this._elements, name, null);
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
        });
    });

    return errors;
};

Form.prototype.getValues = function() {
    var values = {};

    var populateValues = function(elements) {
        _.each(elements, function(element, name) {
            if (element instanceof Form.Element)
                _.set(values, element.getFullyQualifiedName(), element.getValue());
            else
                populateValues(element);
        });
    };

    populateValues(this._elements);

    //console.log("TO-DO", "[getValues()]", "Dot notation not implemented for subforms");

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

    var validateElements = function(elements) {
        _.each(elements, function(element, name) {
            if (element instanceof  Form.Element)
            {
                var val = _.get(values, element.getFullyQualifiedName());

                if (_.isUndefined(val))
                    val = "";

                functions.push(function(callback) {
                    element.isValid(val, $this.getValues(), function(err, value) {
                        if (err)
                        {
                            err = {};

                            _.set(err, element.getFullyQualifiedName(), element.getError());
                        }

                        callback(err, value);
                    });
                });
            }
            else
                validateElements(element);
        });
    };

    validateElements(this._elements);

    async.parallel(async.reflectAll(functions), function(err, values) {
        err = {};

        _.each(values, function(value) {
            if (value.error)
                err = _.merge(err, value.error);
        });

        if (_.isEmpty(err))
            err = null;

        callback(err, $this.getValues());
    });
};

Form.prototype.isValidPartial = function(values, callback) {
    var functions = [];
    var $this = this;

    values = _.extend({}, values);

    _.forEach(this._subforms, function(subform, name) {
        functions.push(function(callback) {
            subform.isValid(values[name], function(err, values) {
                callback(err, values);
            });
        });
    });

    var validateElements = function(elements) {
        _.each(elements, function(element) {
            if (element instanceof Form.Element)
            {
                var val = _.get(values, element.getFullyQualifiedName());
                var skipElement = false;

                if (_.isUndefined(val))
                {
                    val = "";
                    skipElement = true;
                }

                if (!skipElement)
                {
                    functions.push(function(callback) {
                        element.isValid(val, $this.getValues(), function(err, value) {
                            if (err)
                            {
                                var error = {};

                                _.set(error, element.getFullyQualifiedName(), element.getError());

                                err = error;
                            }

                            callback(err, value);
                        });
                    });
                }
            }
            else
                validateElements(element);
        });
    };

    validateElements(this._elements);

    async.parallel(async.reflectAll(functions), function(err, values) {
        err = {};

        _.each(values, function(value) {
            if (value.error)
                err = _.merge(err, value.error);
        });

        if (_.isEmpty(err))
            err = null;

        callback(err, $this.getValues());
    });
};

Form.prototype.populate = function(values) {
    if (values)
    {
        _.forEach(this._subforms, function(subform, name) {
            subform.populate(values);
        });

        var populateElements = function(elements) {
            _.each(elements, function(element, name) {
                if (element instanceof  Form.Element)
                {
                    var val = _.get(values, element.getFullyQualifiedName());

                    if (_.isUndefined(val))
                        vall = null;

                    element.setValue(val);
                }
                else
                    populateElements(element);
            });
        };

        populateElements(this._elements);
    }
};

Form.prototype.removeElement = function(name) {
    delete this.getElements()[name];
};

Form.prototype.render = function(callback) {
    if (_.isFunction(callback))
    {
        this.emit("beforeRender");

        var $this = this;
        var renderFunctions = [];
        var html;

        _.forEach($this._subforms, function(subform, name) {
            renderFunctions.push(subform.render.bind(subform));
        });

        var pushElementToRenderStackRecursively = function(elements) {
            _.each(elements, function(element) {
                if (element instanceof Form.Element)
                {
                    if (!_.isArray(element.getViewScriptPaths()) || (_.isArray(element.getViewScriptPaths()) && !element.getViewScriptPaths().length))
                        element.setViewScriptPaths($this.getViewScriptPaths());

                    renderFunctions.push(element.render.bind(element));
                }
                else
                    pushElementToRenderStackRecursively(element);
            });
        };

        pushElementToRenderStackRecursively(this._elements);

        async.parallel(async.reflectAll(renderFunctions), function(err, results) {
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
            var compiledContent = "";

            if ($this.getViewScriptFile())
            {
                var viewScriptPaths = [];
                var path = require("path");
                var i = 0;
                var viewScriptPath = "";

                var addSlash = function(path)
                {
                    return path + (path.slice(-1) != "/" ? "/" : "");
                };

                if (!path.isAbsolute($this.getViewScriptFile()) && $this.getViewScriptPaths().length)
                {
                    var viewPaths = $this.getViewScriptPaths();

                    for (i = 0; i < $this.getViewScriptPaths().length; i++)
                    {
                        viewScriptPaths.push(addSlash(viewPaths[i]) + $this.getViewScriptFile());
                    }
                }
                else
                    viewScriptPaths.push($this.getViewScriptFile());

                for (i = 0; i < viewScriptPaths.length; i++)
                {
                    viewScriptPath = viewScriptPaths[i];

                    try
                    {
                        if (fs.lstatSync(viewScriptPath).isFile())
                            break;
                    }
                    catch (error) { }
                }

                compiledContent = jade.renderFile(viewScriptPath, {
                    elements: $this._elements,
                    subforms: $this._subforms,
                    data: $this._options.viewScriptData
                });
            }
            else
            {
                if ($this.getViewScriptString())
                {
                    compiledContent = jade.render($this.getViewScriptString(), {
                        elements: $this._elements,
                        subforms: $this._subforms,
                        data: $this._options.viewScriptData
                    });
                }
            }

            html = formHtml.replace("%%content%%", compiledContent);

            $this._renderHtml = html;

            $this.emit("afterRender");

            callback(null, html);
        });
    }
    else
    {
        this.emit("render");

        return this._renderHtml;
    }
};

Form.prototype.reset = function() {
    _.forEach(this._subforms, function(subform, name) {
        subform.reset();
    });

    var resetValues = function(elements) {
        _.forEach(elements, function(element) {
            if (element instanceof Form.Element)
                element.setValue("");
            else
                resetValues(element);
        });
    };

    resetValues(this._elements);
};

Form.prototype.setViewScriptPaths = function(viewScriptPaths)
{
    this._options.viewScriptPaths = [];

    if (_.isArray(viewScriptPaths))
        this._options.viewScriptPaths = this._options.viewScriptPaths.concat(viewScriptPaths);
    else
        this._options.viewScriptPaths.push(viewScriptPaths);
};

Form.prototype.getAction            = function() { return this._options.action; };
Form.prototype.getElements          = function() { return this._elements; };
Form.prototype.getElementsBelongTo  = function() { return this._elementsBelongTo; };
Form.prototype.getId                = function() { return this._options.id; };
Form.prototype.getMethod            = function() { return this._options.method; };
Form.prototype.getSubForms          = function() { return this._subforms; };
Form.prototype.getViewScriptData    = function() { return this._options.viewScriptData; };
Form.prototype.getViewScriptFile    = function() { return this._options.viewScriptFile; };
Form.prototype.getViewScriptPaths   = function() { return this._options.viewScriptPaths; };
Form.prototype.getViewScriptString  = function() { return this._options.viewScriptString; };

Form.prototype.setAction            = function(action) { this._options.action = action; };
Form.prototype.setElements          = function(elements) { this._elements = elements; };
Form.prototype.setElementsBelongTo  = function(elementsBelongTo) { this._elementsBelongTo = elementsBelongTo; };
Form.prototype.setId                = function(id) { this._options.id = id; };
Form.prototype.setMethod            = function(method) { this._options.method = method; };
Form.prototype.setSubForms          = function(subforms) { this._subforms = subforms; };
Form.prototype.setViewScriptData    = function(viewScriptData) { this._options.viewScriptData = viewScriptData; };
Form.prototype.setViewScriptFile    = function(viewScriptFile) { this._options.viewScriptFile = viewScriptFile; };
Form.prototype.setViewScriptString  = function(viewScriptString) { this._options.viewScriptString = viewScriptString; };

module.exports = exports = Form;

exports.Element = require("./element.js");

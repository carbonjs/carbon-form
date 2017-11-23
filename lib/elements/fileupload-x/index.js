var async = require("async");
var request = require("request");
var util = require("util");
var _ = require("lodash");

var Filter = require("carbon-filter");
var Validate = require("carbon-validate");

var Element = require("../../element");

var filesystem = require("./lib//utils/filesystem");
var Helper = require("./lib/helper");

function FileUploadX(name, options) {
    Element.call(this, name, options);

    var defaultOptions = {
        button: {
            icon: "",
            text: "Select a file"
        },
        maxFiles: 1,
        mediaType: null,
        mediaSubtype: null,
        noFile: {
            icon: "",
            text: "You haven't uploaded a file yet"
        },
        strategies: null,
        uploadEndpoint: null
    };

    this._options = _.extend({}, this._options, defaultOptions, options);

    this.setId(this.getName() + "_" + Math.floor(Math.random() * (1000000 + 1)));

    this.setViewScriptFile("./views/element.jade");
    this.setViewScriptPaths([__dirname]);

    if (!this.getUploadEndpoint() && this.getStrategies())
    {
        var typeStrategy = this.getStrategies()[this.getMediaType()];
        var subtypeStrategy = typeStrategy.types[this.getMediaSubtype()];

        if (subtypeStrategy.uploadEndpoint)
            this.setUploadEndpoint(subtypeStrategy.uploadEndpoint);
        else if (typeStrategy.uploadEndpoint)
            this.setUploadEndpoint(typeStrategy.uploadEndpoint);
    }
}

util.inherits(FileUploadX, Element);

FileUploadX.prototype.deleteFilesFromLivePath = function(value, callback) {
    request
        .post({
            url: this.getUploadEndpoint(),
            json: true,
            body: {
                action: "deleteFilesFromLivePath",
                value: value,
                fileUpload: {
                    mediaType: this.getMediaType(),
                    mediaSubtype: this.getMediaSubtype()
                }
            }
        }, function(err, response, body) {
            callback(err, null);
        })
    ;
};

FileUploadX.prototype.isValid = function(value, context, callback) {
    var $this = this;

    if (!this.isRequired() && (value === null || (_.isArray(value) && (value.length === 0 || value[0].trim().length === 0))))
    {
        return Element.prototype.isValid.call(this, value, context, function(err, value) {
            callback(err, value);
        });
    }

    if (!_.isArray(value))
        value = [value];

    var valueEmpty = false;

    if (this.isRequired() && value.length === 0)
        valueEmpty = true;
    /*else
    {
        _.each(value, function(value) {
            if (_.isEmpty(value))
            {
                valueEmpty = true;
                return false;
            }
        });
    }*/

    if (valueEmpty)
        return callback(this.getValidator("Validate.NotEmpty").getOptions().message.is_empty, value);

    var typeConfig = this.getStrategies()[this.getMediaType()];
    var subtypeConfig = typeConfig.types[this.getMediaSubtype()];

    if (!typeConfig || !subtypeConfig)
        return callback("Media is not defined", value);

    var func = [];

    _.each(value, function(val) {
        var path, filename, extension;
        var uploadType = val.substr(0, 1);

        if (subtypeConfig.fileExtension)
            extension = subtypeConfig.fileExtension;
        else if (typeConfig.fileExtension)
            extension = typeConfig.fileExtension;
        else if ($this.getFilter("Filter.File.Move"))
        {
            var filter = $this.getFilter("Filter.File.Move");

            if (filter.getOptions().extension)
                extension = filter.getOptions().extension;
        }
        else
        {
            var filters = _.concat(
                [],
                (subtypeConfig.filters && _.isArray(subtypeConfig.filters)? subtypeConfig.filters : []),
                (typeConfig.filters && _.isArray(typeConfig.filters)? typeConfig.filters : [])
            );

            _.each(filters, function(filter) {
                if (filter instanceof Filter.File.Move)
                {
                    if (filter.getOptions().extension)
                        extension = filter.getOptions().extension;
                }
            });
        }

        if (uploadType == "_")
        {
            filename = val.substr(1);
            path = subtypeConfig.paths.public.temp;
        }
        else
        {
            filename = val;
            path = subtypeConfig.paths.public.live;
        }

        path = filesystem.appendSlash(path) + (extension ? filesystem.appendExtension(filename, extension) : filename);

        func.push(function(callback) {
            var validator = new Validate.File.Exist();

            validator.isValid(path, {}, callback);
        });
    });

    async.series(async.reflectAll(func), function(err, result) {
        var removeAt = [];

        for (i = 0; i < value.length; i++)
        {
            if (result[i].error)
                removeAt.push(i);
        }

        _.pull(value, removeAt);

        Element.prototype.isValid.call($this, value, context, function(err, value) {
            callback(err, value);
        });
    });
};

FileUploadX.prototype.moveFilesToLivePath = function(value, callback) {
    request
        .post({
            url: this.getUploadEndpoint(),
            json: true,
            body: {
                action: "moveFilesToLivePath",
                value: value,
                fileUpload: {
                    mediaType: this.getMediaType(),
                    mediaSubtype: this.getMediaSubtype()
                }
            }
        }, function(err, response, body) {
            callback(err, (body ? (body.value ? body.value : []) : []));
        })
    ;
};

FileUploadX.prototype.render = function(callback, options) {
    if (!_.isObject(this.getStrategies()))
        throw new Error("Upload strategies parameter is missing");

    var typeConfig = this.getStrategies()[this.getMediaType()];
    var subtypeConfig = typeConfig.types[this.getMediaSubtype()];

    if (!typeConfig || !subtypeConfig)
        return console.log("Media is not defined");

    var $this = this;
    var value = this.getValue();
    var files = [];

    _.each(value, function(val) {
        var path, filename, extension;
        var uploadType = val.substr(0, 1);

        if (subtypeConfig.fileExtension)
            extension = subtypeConfig.fileExtension;
        else if (typeConfig.fileExtension)
            extension = typeConfig.fileExtension;
        else if ($this.getFilter("Filter.File.Move"))
        {
            var filter = $this.getFilter("Filter.File.Move");

            if (filter.getOptions().extension)
                extension = filter.getOptions().extension;
        }
        else
        {
            var filters = _.concat(
                [],
                (subtypeConfig.filters && _.isArray(subtypeConfig.filters)? subtypeConfig.filters : []),
                (typeConfig.filters && _.isArray(typeConfig.filters)? typeConfig.filters : [])
            );

            _.each(filters, function(filter) {
                if (filter instanceof Filter.File.Move)
                {
                    if (filter.getOptions().extension)
                        extension = filter.getOptions().extension;
                }
            });
        }

        if (uploadType == "_")
        {
            filename = val.substr(1);
            path = subtypeConfig.paths.public.temp;
        }
        else
        {
            filename = val;
            path = subtypeConfig.paths.public.live;
        }

        path = filesystem.appendSlash(path) + (extension ? filesystem.appendExtension(filename, extension) : filename);

        files.push({
            id: val,
            previewUrl: ((!_.isUndefined(subtypeConfig.hasPreview) && subtypeConfig.hasPreview) || (typeConfig.hasPreview && _.isUndefined(subtypeConfig.hasPreview))) ? path : undefined
        });
    });

    this.setViewScriptData({
        files: files,
    });

    return Element.prototype.render.call(this, callback, options);
};

FileUploadX.prototype.getMaxFiles        = function()    { return this._options.maxFiles; };
FileUploadX.prototype.getMediaSubtype    = function()    { return this._options.mediaSubtype; };
FileUploadX.prototype.getMediaType       = function()    { return this._options.mediaType; };
FileUploadX.prototype.getStrategies      = function()    { return this._options.strategies; };
FileUploadX.prototype.getUploadEndpoint  = function()    { return this._options.uploadEndpoint; };

FileUploadX.prototype.setMaxFiles        = function(maxFiles)        { this._options.maxFiles = maxFiles; };
FileUploadX.prototype.setUploadEndpoint  = function(uploadEndpoint)  { this._options.uploadEndpoint = uploadEndpoint; };

module.exports = exports = FileUploadX;

exports.Helper = Helper;

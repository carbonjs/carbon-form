var async = require("async");
var bytes = require("bytes");
var crypto = require("crypto");
var fs = require("fs-extra");
var gm = require("gm");
var path = require("path");
var Magic = require("mmmagic");
var _ = require("lodash");

var filesystem = require("./utils/filesystem");

var Filter = require("carbon-filter");

function FileUploadHelper(config)
{
    this._config = config;
}

FileUploadHelper.prototype.deleteFileFromLivePath = function(filename, mediaType, mediaSubtype, callback) {
    if (!mediaType ||
        !mediaSubtype ||
        !this.getConfig()[mediaType] ||
        this.getConfig()[mediaType] && !this.getConfig()[mediaType].types[mediaSubtype])
    {
        return callback("Media type and/or subtype not defined");
    }
    else
    {
        if (!filename)
            return callback("Invalid filename");

        var typeConfig = this.getConfig()[mediaType];
        var subtypeConfig = typeConfig.types[mediaSubtype];

        if (_.isArray(filename))
            filename = filename[0];

        if (filename.length == 65)
            filename = filename.substr(1);
        else if (filename.length != 64)
            return callback("Invalid filename");

        var path = filesystem.appendSlash(subtypeConfig.paths.private.live) + (subtypeConfig.fileExtension ? filesystem.appendExtension(filename, subtypeConfig.fileExtension) : filename);

        fs.remove(path, function(err) {
            if (err)
                callback(err, false);
            else
                callback(null);
        });
    }
};

FileUploadHelper.prototype.handleUpload = function(options, callback) {
    var defaults = {
        files: [],
        mediaType: null,
        mediaSubtype: null,
        nonce: null
    };

    options = _.extend(defaults, options);

    if (!options.mediaType ||
        !options.mediaSubtype ||
        !this.getConfig()[options.mediaType] ||
        this.getConfig()[options.mediaType] && !this.getConfig()[options.mediaType].types[options.mediaSubtype])
    {
        return callback("Media type and/or subtype not defined");
    }
    else
    {
        var typeConfig = this.getConfig()[options.mediaType];
        var subtypeConfig = typeConfig.types[options.mediaSubtype];

        _.each(options.files, function(file) {
            var validators = [];

            _.each(subtypeConfig.validators, function(validator) {
                validators.push(function(callback) {
                    validator.isValid(file.path, {}, callback);
                });
            });

            if (!validators.length)
            {
                validators.push(function(callback) {
                    callback(null, [file.path]);
                });
            }

            async.series(validators, function(err, filePaths) {
                if (err)
                {
                    fs.remove(file.path, function() {
                        callback(err, null);
                    });
                }
                else
                {
                    var filters = [];

                    _.each(subtypeConfig.filters, function(filter) {
                        filters.push(function(callback) {
                            filter.filter(file.path, {}, callback);
                        });
                    });

                    if (!filters.length)
                    {
                        filters.push(function(callback) {
                            callback(null, [file.path]);
                        });
                    }

                    async.series(filters, function(err, filePaths) {
                        if (err)
                        {
                            fs.remove(file.path, function() {
                                callback(err, null);
                            });
                        }
                        else
                        {
                            var filePath = filePaths[filePaths.length - 1];

                            var index = options.files.length - 1;
                            var newFileName = crypto.createHash("sha256").update(file.filename).digest("hex");

                            var response = {
                                success: true,
                                files: [{
                                    id: "_" + newFileName,
                                    nonce: options.nonce
                                }]
                            };

                            var Move = new Filter.File.Move({
                                path: subtypeConfig.paths.private.temp,
                                filename: newFileName
                            });

                            Move.filter(filePath, {}, function(err, filePath) {
                                if (err)
                                    callback(err, null);
                                else
                                {
                                    if (subtypeConfig.hasPreview)
                                    {
                                        var parsedPath = path.parse(filePath);

                                        response.files[index] = _.extend(response.files[index], {
                                            previewUrl: subtypeConfig.paths.public.temp + "/" + parsedPath.base
                                        });
                                    }

                                    callback(null, response);
                                }
                            });
                        }
                    });
                }
            });
        });
    }
};

FileUploadHelper.prototype.moveFileToLivePath = function(filename, mediaType, mediaSubtype, callback) {
    if (!mediaType ||
        !mediaSubtype ||
        !this.getConfig()[mediaType] ||
        this.getConfig()[mediaType] && !this.getConfig()[mediaType].types[mediaSubtype])
    {
        return callback("Media type and/or subtype not defined");
    }
    else
    {
        if (!filename)
            return callback("Invalid filename");

        var files = filename;
        var typeConfig = this.getConfig()[mediaType];
        var subtypeConfig = typeConfig.types[mediaSubtype];

        if (_.isArray(filename))
            filename = filename[0];

        if (filename.length == 65)
            filename = filename.substr(1);
        else if (filename.length != 64)
            return callback("Invalid filename");

        var newFilename = crypto.createHash("sha256").update(filename + Date.now()).digest("hex");

        var sourcePath = filesystem.appendSlash(subtypeConfig.paths.private.temp) + (subtypeConfig.fileExtension ? filesystem.appendExtension(filename, subtypeConfig.fileExtension) : filename);
        var destinationPath = filesystem.appendSlash(subtypeConfig.paths.private.live) + (subtypeConfig.fileExtension ? filesystem.appendExtension(newFilename, subtypeConfig.fileExtension) : newFilename);

        fs.move(sourcePath, destinationPath, function(err) {
            if (err)
                callback(err, false);
            else
                callback(null, _.isArray(files) ? [newFilename] : newFileName);
        });
    }
};

FileUploadHelper.prototype.getConfig = function() { return this._config; };

module.exports = exports = FileUploadHelper;

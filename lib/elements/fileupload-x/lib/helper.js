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

FileUploadHelper.prototype.deleteFilesFromLivePath = function(filenames, mediaType, mediaSubtype, callback) {
    if (!mediaType ||
        !mediaSubtype ||
        !this.getConfig()[mediaType] ||
        this.getConfig()[mediaType] && !this.getConfig()[mediaType].types[mediaSubtype])
    {
        return callback("Media type and/or subtype not defined");
    }
    else
    {
        if (!filenames)
            return callback("Invalid filenames");

        var typeConfig = this.getConfig()[mediaType];
        var subtypeConfig = typeConfig.types[mediaSubtype];

        if (!_.isArray(filenames))
            filenames = filenames[0];

        var func = [];

        _.each(filenames, function(filename) {
            var extension;

            if (filename.length == 65)
                filename = filename.substr(1);
            else if (filename.length != 64)
                return callback("Invalid filename");

            if (subtypeConfig.fileExtension)
                extension = subtypeConfig.fileExtension;
            else if (typeConfig.fileExtension)
                extension = typeConfig.fileExtension;
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

            var path = filesystem.appendSlash(subtypeConfig.paths.private.live) + (extension ? filesystem.appendExtension(filename, extension) : filename);

            func.push(function(callback) {
                fs.remove(path, function(err) {
                    if (err)
                        callback(err, false);
                    else
                        callback(null);
                });
            });
        });

        async.series(func, function(err) {
            callback(err);
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

            _.each(typeConfig.validators, function(validator) {
                validators.push(function(callback) {
                    validator.isValid(file.path, {}, callback);
                });
            });

            _.each(subtypeConfig.validators, function(validator) {
                validators.push(function(callback) {
                    validator.isValid(file.path, {}, callback);
                });
            });

            if (!validators.length)
            {
                validators.push(function(callback) {
                    callback(null, file.path);
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

                    _.each(typeConfig.filters, function(filter) {
                        filters.push(function(callback) {
                            filter.filter(file.path, {}, callback);
                        });
                    });

                    _.each(subtypeConfig.filters, function(filter) {
                        filters.push(function(callback) {
                            filter.filter(file.path, {}, callback);
                        });
                    });

                    if (!filters.length)
                    {
                        filters.push(function(callback) {
                            callback(null, file.path);
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

FileUploadHelper.prototype.moveFilesToLivePath = function(filenames, mediaType, mediaSubtype, callback) {
    if (!mediaType ||
        !mediaSubtype ||
        !this.getConfig()[mediaType] ||
        this.getConfig()[mediaType] && !this.getConfig()[mediaType].types[mediaSubtype])
    {
        return callback("Media type and/or subtype not defined");
    }
    else
    {
        if (!filenames)
            return callback("Invalid filenames");

        var typeConfig = this.getConfig()[mediaType];
        var subtypeConfig = typeConfig.types[mediaSubtype];

        if (!_.isArray(filenames))
            filenames = [filenames];

        var func = [];

        _.each(filenames, function(filename) {
            var extension;

            if (filename.length == 65)
                filename = filename.substr(1);
            else if (filename.length != 64)
                return callback("Invalid filename");

            var newFilename = crypto.createHash("sha256").update(filename + Date.now()).digest("hex");

            if (subtypeConfig.fileExtension)
                extension = subtypeConfig.fileExtension;
            else if (typeConfig.fileExtension)
                extension = typeConfig.fileExtension;
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

            var sourcePath = filesystem.appendSlash(subtypeConfig.paths.private.temp) + (extension ? filesystem.appendExtension(filename, extension) : filename);
            var destinationPath = filesystem.appendSlash(subtypeConfig.paths.private.live) + (extension ? filesystem.appendExtension(newFilename, extension) : newFilename);

            func.push(function(callback) {
                fs.move(sourcePath, destinationPath, function(err) {
                    if (err)
                        callback(err, false);
                    else
                        callback(null, newFilename);
                });
            });
        });

        async.series(func, function(err, files) {
            callback(err, files);
        });
    }
};

FileUploadHelper.prototype.getConfig = function() { return this._config; };

module.exports = exports = FileUploadHelper;

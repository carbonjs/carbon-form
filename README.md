# carbon-form
The `carbon-form` module provides Zend-like forms in your projects. It is a complete solution which not only provides rendering but filtering and validation too. It packs all the logic behind HTML forms and it abstracts a lot of work so that you can focus on building awesome web applications.

If you have ever used `Zend_Form` before you're going to be familiar with the syntax and if not just keep reading.

## Installation
```
npm install carbon-form [--save]
```

## Usage
The usage is pretty simple. You create a form and then add elements to it. For each element you define a set of options such as name, label, filters, validators, HTML attributes etc. The following example should present most of `carbon-form` features.

#### Defining the form (for example in the separate file: `signup-form.js`)
```js
var Form = require("carbon-form");
var Filter = require("carbon-filter");
var Validate = require("carbon-validate");

module.exports = exports = function() {
    var form = new Form({
        action: "/signup"
    });
    
    form.addElements([
        new Form.Element.Text("name", {
            label: "Name",
            attribs: {
                class: "text-field"
            },
            filters: [
                new Filter.StringTrim()
            ],
            validators: [
                new Validate.NotEmpty({
                    messages: {
                        "is_empty": "Name is required"
                });
            ]
        }),
        new Form.Element.Text("email_address", {
            label: "Email address",
            attribs: {
                class: "text-field"
            },
            filters: [
                new Filter.StringTrim()
            ],
            validators: [
                new Validate.NotEmpty({
                    messages: {
                        "is_empty": "Email address is required"
                    }
                }),
                new Validate.StringLength({
                    max: 255,
                    messages: {
                        "too_long": "Email address can't be longer than %max% characters"
                    }
                }),
                new Validate.EmailAddress(),
                new Validate.DbNoRecordExists({
                    adapter: "mongoose",
                    collection: "users",
                    field: "email_address",
                    messages: {
                        "record_found": "Email address is already in the database"
                    }
                })
            ]
        }),
        new Form.Element.Password("password1", {
            label: "Password",
            attribs: {
                class: "text-field"
            },
            validators: [
                new Validate.NotEmpty({
                    messages: {
                        "is_empty": "Password is required"
                    }
                }),
                new Validate.StringLength({
                    min: 6,
                    messages: {
                        too_short: "Password must be at least %min% characters long"
                    }
                })
            ]
        }),
        new Form.Element.Password("password2", {
            label: "Repeat password",
            attribs: {
                class: "form-control"
            },
            validators: [
                new Validate.NotEmpty({
                    messages: {
                        "is_empty": "Repeated password is required"
                    }
                }),
                new Validate.Identical({
                    token: "password1",
                    messages: {
                        "not_same": "Passwords do not match"
                    }
                })
            ]
        })
    ]);

    return form;
}

```

#### Validation and rendering (using `carbon-framework`)
```js
var form = require("./forms/signup-form");

module.exports = function() {
	return {
		signupAction: {
            post: function(req, res) {
                var postData = req.body;
                
                form.isValid(postData, function(err, values) {
                    if (err)
                    {
                        form.render(function(err) {
                            // Now in the view all you have to do is call `!= form.render()`
                            // (if you're using Jade engine) and it will return rendered form 
                            // as HTML all together with all errored fields
                            
                            res.render("scripts/signup", {
                                formSignup: form
                            });
                        });
                    }
                    else
                    {
                        // Form validation is successful and argument `values` now contains all 
                        // field values which are filtered and validated and therefor safe 
                        // to be inserted into the database
                        
                        res.redirect("/signup-success");
                    }
                });
                
            }
		}
	}
}
```

## Elements
#### Between
Checks if the input value is between two integer values.

**Options**
* `inclusive` [`Boolean`] - Defines whether `min` and `max` values represent minimal and maximal values allowed, respectively.
* `min` [`Integer`] - Minimum value.
* `max` [`Integer`] - Maximum value.
* `messages`
  * `not_between` - Message which is returned if the input value isn't between `min` and `max` values.

#### Callback
If you don't want to make your own validator but you still need to do some custom validation check then this validator is for you.

**Options**
* `callback` [`Function`] - A function that receives two arguments: the value and validator options and which returns either `true` or `false` depending whether you've successfully validated input data.

#### DbNoRecordExists
Checks if the value already exists in the database. This means that the validation check will fail if there is already a matching record in the database. Typical example is when you want to check if username is already taken or if email address is already registered in the database.

**Options**
* `adapter` [`String`] - Name of the database adapter to be used (currently only `mongoose` is supported).
* `collection` [`String`] - Name of the collection/table in the database which possibly contains the value.
* `field` [`String`] - Name of the field/column in the collection/table which possibly contains the value.
* `messages`
  * `record_found` - Messages which is returned if the input value already exists in the database.

#### DbRecordExists
Verifies that the value is in the database. This means that the validation check will fail if there is no matching record in the database. Typical example is when you want to check if product's category exists at all before you insert product in the database.

**Options**
* `adapter` [`String`] - Name of the database adapter to be used (currently only `mongoose` is supported).
* `collection` [`String`] - Name of the collection/table in the database which possibly contains the value.
* `field` [`String`] - Name of the field/column in the collection/table which possibly contains the value.
* `messages`
  * `record_not_found` - Messages which is returned if the input value is not found in the database.

#### EmailAddress
Checks if the value is valid email address.

**Options**
* `messages`
  * `invalid_value` - Messages which is returned if the input value is not valid email address.

#### Identical
Checks if the value equals some other form element in the same form. Typical example is when you need to verify fields such as "new password" and "repeat new password" contain the same value.

**Options**
* `token` [`String`] - Name of the other element in the form.
* `messages`
  * `not_same` - Messages which is returned if the input value is not the same as the input value from the token element.

#### NotEmpty
Checks if the value is not empty. This validator can be used in cases where you have required elements in the form.

**Options**
* `messages`
  * `is_empty` - Messages which is returned if the input value is empty.

#### StringLength
Checks if the length of the string value fits `min` and/or `max` criteria defined in the validator options.

**Options**
* `min` [`Integer`] - Minimum string length.
* `max` [`Integer`] - Maximum string length.
* `messages`
  * `too_short` - Messages which is returned if the input value is shorter than the `min` value.
  * `too_long` - Messages which is returned if the input value is longer than the `max` value.

#### Url
Checks if the value is valid URL.

**Options**
* `messages`
  * `invalid_url` - Messages which is returned if the input value is not valid URL.

## Who is using it
The `carbon-validate` module is one of many that is running behind our web application: [Timelinity](https://www.timelinity.com)

## Contributing
If you're willing to contribute to this project feel free to report issues, send pull request, write tests or simply contact me - [Amir Ahmetovic](https://github.com/choxnox)

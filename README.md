# CarbonJS Forms / `carbon-form` <a id="intro"></a>
The `carbon-form` module provides easy-to-use forms in your projects. It is a complete solution which not only provides rendering but filtering and validation too. It packs all the logic behind HTML forms and it abstracts a lot of work so that you can focus on building awesome web applications and best of all it allows you to define the layout and style your forms any way you want them.

If you have ever used `Zend_Form` before you're going to be familiar with the syntax and if not just keep reading.

## Installation <a id="installation"></a>
```
npm install carbon-form [--save]
```

## Usage <a id="usage"></a>
The usage is pretty simple. You create a form and then add elements to it. For each element you define a set of options such as name, label, filters, validators, HTML attributes etc. The following example should present most of `carbon-form` features.

#### Defining the form (file: `signup-form.js`) <a id="define-the-form"></a>
First you need to define your form and elements that it will contain.

```js
var Form = require("carbon-form");
var Filter = require("carbon-filter");
var Validate = require("carbon-validate");

module.exports = exports = function(options) {
    var form = new Form(options);

    form.setAction("/signup");
    form.setViewScriptFile("forms/signup.jade");

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
        }),
        new Form.Element.Button("submit", {
            content: "Sign up",
            attribs: {
                class: "btn btn-red",
                type: "submit"
            }
        })
    ]);

    return form;
}
```

#### Defining form layout (file: `signup-form.jade`) <a id="define-form-layout"></a>
Since `carbon-form` gives you freedom to style your own forms any way you wish, you can define form layout in the separate file and then tell to `carbon-form` where to look for this file. When the form renders it will use this layout as a template.

```Jade
.form-group
	div
		label(for="#{elements.name.getName()}")
			!= elements.name.getLabel()
	div
		!= elements.name.render()  
.form-group
	div
		label(for="#{elements.email_address.getName()}")
			!= elements.email_address.getLabel()
	div
		!= elements.email_address.render()  
.form-group
	div
		label(for="#{elements.password1.getName()}")
			!= elements.password1.getLabel()
	div
		!= elements.password1.render()  
.form-group
	div
		label(for="#{elements.password2.getName()}")
			!= elements.password2.getLabel()
	div
		!= elements.password2.render()  
.form-group
	div
		!= elements.submit.render()    
```

#### Validation and rendering (using `carbon-framework`) <a id="validation-and-rendering"></a>
This example features `carbon-framework` just to make it easier for you to understand how `carbon-form` works in reality. Of course you can use `carbon-form` with any other Node.js framework or no framework at all.

```js
module.exports = function() {
	return {
		signupAction: {
            post: function(req, res) {
                var postData = req.body;

                var form = require("./forms/signup-form")({
                    viewiewScriptPaths: res.viewPaths
                });

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

## Elements <a id="elements"></a>
The `carbon-form` currently supports 6 HTML form elements (`Button`, `Checkbox`, `Hidden`, `Password`, `Text`, `Textarea`) and 4 extended elements (`EmailAddress`, `Link`, `Recaptcha`, `Switch`).

## Subforms <a id="subforms"></a>
Depending on how you organize your forms you can nest one or more forms within a single form.

```js
var Form = require("carbon-form");

var form = new Form();
var buttons = new Form();

parentForm.addSubForm("buttons", buttons);
```

## Contributing <a id="contributing"></a>
If you're willing to contribute to this project feel free to report issues, send pull request, write tests or simply contact me - [Amir Ahmetovic](https://github.com/choxnox)

## Licence
This software is available under the following licenses:

  * MIT

var chai = require("chai");

var expect = chai.expect;

var Form = require("../index");

describe("Forms", function() {
    describe("Element manipulation", function() {
        var form;

        beforeEach(function() {
            form = new Form();
        });

        it("should be without elements when first initialized", function() {
            expect(Object.keys(form.getElements()).length).to.equal(0);
        });

        it("should be able to add new element", function() {
            form.addElement(new Form.Element.Text("myelement"));

            expect(Object.keys(form.getElements()).length).to.equal(1);
        });

        it("should be able to remove an element", function() {
            form.addElement(new Form.Element.Text("myelement"));
            form.removeElement("myelement");

            expect(Object.keys(form.getElements()).length).to.equal(0);
        });

        it("should be able to populate values into the elements", function() {
            form.addElement(new Form.Element.Text("myelement"));

            form.populate({
                myelement: "abc"
            });

            expect(form.getElement("myelement").getValue()).to.equal("abc");
        });
    });

    describe("Rendering", function() {
        var form;

        beforeEach(function() {
            form = new Form();
        });

        it("should render an empty form", function(done) {
            form.render(function(err, html) {
                expect(err).to.equal(null);
                expect(html).to.equal("<form method=\"post\"></form>");
                done();
            });
        });

        it("should render form with one element", function(done) {
            form.addElement(new Form.Element.Text("myelement"));

            form.setViewScriptString("!= elements.myelement.render()");

            form.render(function(err, html) {
                expect(err).to.equal(null);
                expect(html).to.equal("<form method=\"post\"><input name=\"myelement\" id=\"myelement\" type=\"text\"/></form>");
                done();
            });
        });

        it("should render form with multiple elements", function(done) {
            form.addElement(new Form.Element.Text("myelement1"));
            form.addElement(new Form.Element.Text("myelement2"));

            form.setViewScriptString("!= elements.myelement1.render()\r!= elements.myelement2.render()");

            form.render(function(err, html) {
                expect(err).to.equal(null);
                expect(html).to.equal("<form method=\"post\"><input name=\"myelement1\" id=\"myelement1\" type=\"text\"/><input name=\"myelement2\" id=\"myelement2\" type=\"text\"/></form>");
                done();
            });
        });
    });

    describe("Validating", function() {
        var form;

        beforeEach(function() {
            form = new Form();
        });

        it("should validate an empty form", function(done) {
            form.isValid({}, function(err, values) {
                expect(err).to.equal(null);
                expect(values).to.deep.equal({});
                done();
            });
        });

        it("should validate form with one element", function(done) {
            form.addElement(new Form.Element.Text("myelement"));

            var val = {
                myelement: "val"
            };

            form.isValid(val, function(err, values) {
                expect(err).to.equal(null);
                expect(values).to.deep.equal(val);
                done();
            });
        });

        it("should validate form with multiple elements", function(done) {
            form.addElement(new Form.Element.Text("myelement1"));
            form.addElement(new Form.Element.Text("myelement2"));

            var val = {
                myelement1: "val1",
                myelement2: "val2"
            };

            form.isValid(val, function(err, values) {
                expect(err).to.equal(null);
                expect(values).to.deep.equal(val);
                done();
            });
        });
    });
});

var chai = require("chai");

var expect = chai.expect;

var Form = require("../index");

describe("Elements", function() {
    describe("FileUploadX", function() {
        var form;

        beforeEach(function() {
            form = new Form();
        });

        it("should work by default", function() {
            form.addElement(new Form.Element.FileUploadX("myelement"));

            expect(Object.keys(form.getElements()).length).to.equal(1);
        });
    });
});

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Karl STEIN
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

Kandybars.registerHelper('hello', function (a, b, c) {
//        console.log('hello helper args', arguments);
    return [a, b, c].join(', ');
});

Kandybars.load("templates.html", function () {

    Template.main.rendered = function (node) {
        console.log('Event rendered');
    };

    Template.main.helpers({
        x: Math.random(),
        y: 20
    });

    Template.source_arrays.helpers({
        items: function () {
            return [
                "Red",
                "Green",
                "Blue"
            ];
        }
    });

    Template.benchmark_section.events({
        'click [name=start-bench]': function (ev) {
            ev.preventDefault();
            console.log("Start benchmark");

            var items = [];
            var times = {};
            var results = $('#bench-result');
            var iterations = parseInt($('[name=bench-iteration]').val());

            // Clear previous benchmark
            results.empty();

            // template render
            var a = Date.now();
            for (var i = 0; i < iterations; i += 1) {
//                    console.log("- iteration " + (i + 1));
                items.push(Kandybars.render('benchmark_item', {x: i, y: 10}));
            }
            times.render = Date.now() - a;

            // template insertion
            var b = Date.now();
            for (var j = 0; j < items.length; j += 1) {
                results.append(items[j]);
            }
            times.insertion = Date.now() - b;

            // Total
            times.total = times.render + times.insertion;

            console.log("Stop benchmark");
            console.log("");
            console.log("Render: " + times.render + 'ms');
            console.log("Insertion: " + times.insertion + 'ms');
            console.log("Total: " + times.total + 'ms');
        }
    });

    Template.source_conditions.helpers({
        test: function () {
            return Math.random() > 0.5;
        },
        deepTest: function () {
            return Math.random() > 0.5;
        }
    });

    Template.source_objects.helpers({
        obj: function () {
            return {
                color: "Red",
                hex: "ff0000",
                rgb: "255,0,0"
            };
        }
    });

    var count = 3;

    Template.source_partials.helpers({
        partials: function () {
            return [
                {
                    value: "AA",
                    children: [
                        {
                            value: "a",
                            children: [
                                {value: 1},
                                {
                                    value: 2,
                                    children: [
                                        {value: "x"},
                                        {value: "y"},
                                        {value: "z"}
                                    ]
                                }
                            ]
                        }, {
                            value: "b",
                            children: [
                                {value: 3},
                                {value: 4}
                            ]
                        }
                    ]
                },
                {
                    value: "BB",
                    children: [{value: "c"}, {value: "d"}]
                },
                {
                    value: "CC",
                    children: [{value: "e"}, {value: "f"}]
                }
            ];
        }
    });
    Template.source_partials.events({
        "click button": function (ev, tpl) {
            count += 1;
            tpl.find("> ul").append(Kandybars.render("source_partial_item", {
                value: String(count),
                children: [{value: "1"}]
            }));
        }
    });

    Template.source_partial_item.events({
        "click li": function (ev, tpl) {
            console.log("Click on partial " + this.value)
        }
    });

    Template.source_partial_item.rendered = function (node) {
        console.log('source_partial_item rendered');
    };

    Template.source_partial_item_child.events({
        "click li": function (ev, tpl, instance) {
            var parent = instance.getParent();
            var parentData = parent.getContext();
            console.log("Click on child-partial " + (parentData.value) + '.' + this.value)
        }
    });

    $("#main").html(Kandybars.render('main'));
});

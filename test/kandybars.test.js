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

import Kandybars from "../src/kandybars";

describe(`Kandybars`, () => {

    it(`should be importable from package`, () => {
        expect(Kandybars.render).not.toBe(null);
        expect(Kandybars.render).not.toBe(undefined);
    });

    it(`replaceComments() should remove comment blocks`, () => {
        const html = "<div>{{! This is a comment }}</div>";
        expect(Kandybars.replaceComments(html)).toEqual(`<div></div>`);
    });

    it(`replaceBlocks() should replace "each" blocks with primitive values`, () => {
        const data = {colors: ["red", "white", "blue"]};
        const html = "<div>{{#each colors}}<b>{{this}}</b>{{/each}}</div>";
        expect(Kandybars.replaceBlocks(html, data)).toEqual(`<div><b>${data.colors[0]}</b><b>${data.colors[1]}</b><b>${data.colors[2]}</b></div>`);
    });

    it(`replaceBlocks() should replace "each" blocks with objects`, () => {
        const data = {colors: [{name: "red"}, {name: "white"}, {name: "blue"}]};
        const html = "<div>{{#each colors}}<b>{{name}}</b>{{/each}}</div>";
        expect(Kandybars.replaceBlocks(html, data)).toEqual(`<div><b>${data.colors[0].name}</b><b>${data.colors[1].name}</b><b>${data.colors[2].name}</b></div>`);
    });

    it(`replaceConditions() should replace true conditions with true blocks`, () => {
        const data = {a: 100, b: 250};
        const html = "<div>{{#if a < b}}true{{else}}false{{/if}}</div>";
        expect(Kandybars.replaceConditions(html, data)).toEqual(`<div>true</div>`);
    });

    it(`replaceConditions() should replace false conditions with else blocks`, () => {
        const data = {a: 100, b: 250};
        const html = "<div>{{#if a > b}}true{{else}}false{{/if}}</div>";
        expect(Kandybars.replaceConditions(html, data)).toEqual(`<div>false</div>`);
    });

    it(`replaceEvals() should replace evaluations`, () => {
        const data = {a: 100, b: 250};
        const html = "<div>{{eval (a + b)}}</div>";
        const result = (data.a + data.b);
        expect(Kandybars.replaceEvals(html, data)).toEqual(`<div>${result}</div>`);
    });

    it(`replaceHelpers() should replace helpers`, () => {
        Kandybars.registerHelper("lowercase", (text) => {
            return typeof text === "string" ? text.toLowerCase() : text;
        });
        const data = {text: "HELLO"};
        const html = "<div>{{lowercase text}}</div>";
        expect(Kandybars.replaceHelpers(html, data)).toEqual(`<div>${data.text.toLowerCase()}</div>`);
    });

    it(`replacePartials() should replace partials`, () => {
        Kandybars.create("partialTemplate", "<b>Child</b>");
        const html = "<div>{{> partialTemplate}}</div>";
        expect(Kandybars.replacePartials(html).replace(/ data-partial-id="[^"]+"/g, "")).toEqual(`<div><b>Child</b></div>`);
    });

    it(`replaceVars() should replace variables`, () => {
        const data = {text: "hello"};
        const html = "<div>{{text}}</div>";
        expect(Kandybars.replaceVars(html, data)).toEqual(`<div>${data.text}</div>`);
    });

    it(`replaceWith() should replace "with" blocks`, () => {
        const data = {user: {name: "karl"}};
        const html = "<div>{{#with user}}<b>{{name}}</b>{{/with}}</div>";
        expect(Kandybars.replaceWith(html, data)).toEqual(`<div><b>${data.user.name}</b></div>`);
    });
});

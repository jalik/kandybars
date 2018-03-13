/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Karl STEIN
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

import Kandybars from "./kandybars";
import Observer from "@jalik/observer";
import Template from "./template";

let instanceCount = 0;
const partials = {};

class TemplateInstance {

    constructor(template, data, options) {
        instanceCount += 1;

        options = Kandybars.extend({
            events: {},
            helpers: {},
            parent: null,
            partial: false,
            rendered: null
        }, options);

        // Check template
        if (!(template instanceof Template)) {
            throw new TypeError("template is not an instance of Template");
        }

        this.children = [];
        this.data = data;
        this.options = options;
        this.observer = new Observer(this);
        this.template = template;

        this.id = `kbti_${instanceCount}`;
        this.parent = options.parent;

        if (options.partial) {
            partials[this.id] = this;
        }

        // Link instance to it's parent
        if (this.parent && this.parent.instance instanceof TemplateInstance) {
            this.parent.instance.getChildren().push(this);
        }
    }

    /**
     * Executes rendered callbacks
     * @private
     */
    _rendered() {
        if (typeof this.options.rendered === "function") {
            this.options.rendered.call(this, this.compiled, this.getContext());
        }
        else if (typeof this.getTemplate().rendered === "function") {
            this.getTemplate().rendered.call(this, this.compiled, this.getContext());
        }
        // Notify listeners
        this.observer.notify("rendered", this.compiled, this.getContext());
    }

    /**
     * Attaches the event to the elements in the template
     * @param event
     * @param callback
     * @param node
     */
    attachEvent(event, callback, node) {
        if (typeof callback === "function") {
            let events = event.split(",");

            for (let i = 0; i < events.length; i += 1) {
                event = events[i];
                let parts = event.split(" ", 2);
                let action = parts[0];
                let selector = parts[1];
                let target = selector && node.filter(selector);

                // Check if root node is the target
                if (target && target.length === 1) {
                    node = target;
                    selector = null;
                }

                ((action, selector) => {
                    // Attach event now and in the future
                    node.on(action, selector, (ev) => {
                        callback.call(this.getContext(), ev, node, this);
                    });
                })(action, selector);
            }
        }
    }

    /**
     * Parses all events in the template
     * @param events
     * @param node
     */
    attachEvents(events, node) {
        for (let action in events) {
            if (events.hasOwnProperty(action)) {
                this.attachEvent(action, events[action], node);
            }
        }
    }

    /**
     * Returns template children
     * @return {Array}
     */
    getChildren() {
        return this.children;
    }

    /**
     * Returns instance context
     * @return {*}
     */
    getContext() {
        return Kandybars.extend({}, this.data, this.template._helpers);
    }

    /**
     * Returns instance events
     * @return {*}
     */
    getEvents() {
        return Kandybars.extend({}, this.getTemplate().getEvents(), this.options.events);
    }

    /**
     * Returns instance helpers
     * @return {*}
     */
    getHelpers() {
        return Kandybars.extend({}, this.getTemplate().getHelpers(), this.options.helpers);
    }

    /**
     * Returns the template Id
     * @return {string}
     */
    getId() {
        return this.id;
    }

    /**
     * Returns the template parent
     * @return {null|TemplateInstance}
     */
    getParent() {
        return this.parent && this.parent.instance;
    }

    /**
     * Returns the template
     * @return {Template}
     */
    getTemplate() {
        return this.template;
    }

    /**
     * Checks if instance has children
     * @return {boolean}
     */
    hasChildren() {
        return this.children.length > 0;
    }

    /**
     * Checks if instance is a partial template
     * @return {boolean}
     */
    isPartial() {
        return this.options.partial === true;
    }

    /**
     * Returns a compiled version of the template
     * @param options
     * @return {*|HTMLElement}
     */
    render(options) {
        options = Kandybars.extend({
            events: {},
            helpers: {},
            html: false,
            parent: null,
            rendered: null
        }, options);

        let context = this.getContext();
        let template = this.getTemplate();
        let source = template.getSource();

        // Generate template
        let tpl = Kandybars.replaceAll(source, context, options);

        if (this.isPartial()) {
            let partialId = this.getId();

            // Search first node
            let startIndex = tpl.indexOf("<");
            let closeIndex = tpl.indexOf(">", startIndex);

            if (startIndex === -1 || closeIndex === -1) {
                tpl = `<div data-partial-id="${partialId}">${tpl}</div>`;
            } else {
                tpl = tpl.substr(0, closeIndex) + " data-partial-id=\"" + partialId + "\"" + tpl.substr(closeIndex);
            }
        }
        // Create a DOM version of the version
        else if (!options.html) {
            // Wrap template with jQuery
            if (typeof jQuery !== "undefined") {
                tpl = jQuery(tpl);

                // Insert the template in the target
                if (options.target) {
                    jQuery(options.target).html(tpl);
                }

                const processPartial = function () {
                    let node = jQuery(this);
                    let partialId = node.attr("data-partial-id");
                    let partial = partials[partialId];

                    // Overwrite compiled result
                    partial.compiled = jQuery(this);

                    // Attach events
                    partial.attachEvents(partial.getEvents(), node);

                    // Execute rendered callback
                    partial._rendered();
                };

                // Search partial in root node
                tpl.filter("[data-partial-id]").each(processPartial);

                // Search partials in child nodes
                tpl.find("[data-partial-id]").each(processPartial);

                // Attach events
                this.attachEvents(this.getEvents(), tpl);
            }
        }

        this.compiled = tpl;

        if (!options.html) {
            this._rendered();
        }
        return tpl;
    }
}

export default TemplateInstance;

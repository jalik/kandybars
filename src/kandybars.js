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

import {Template as KTemplate, TemplateInstance} from "./template";
import Patterns from "./patterns";
import Util from "./lib";

const reservedWords = ["abstract", "arguments", "boolean", "break", "byte",
    "case", "catch", "char", "class", "const",
    "continue", "debugger", "default", "delete", "do",
    "double", "else", "enum", "eval", "export",
    "extends", "false", "final", "finally", "float",
    "for", "function", "goto", "if", "implements",
    "import", "in", "instanceof", "int", "interface",
    "let", "long", "native", "new", "null",
    "package", "private", "protected", "public", "return",
    "short", "static", "super", "switch", "synchronized",
    "this", "throw", "throws", "transient", "true",
    "try", "typeof", "let", "void", "volatile",
    "while", "with", "yield"];

const Template = {};


/**
 * The Kandybars template engine
 */
export default {
    /**
     * Enable or disable the use of cache
     * @type {boolean}
     */
    cache: false,

    /**
     * The built-in helpers
     * @type {{}}
     */
    helpers: {},

    /**
     * Creates and register a new template
     * @param name
     * @param source
     * @return {Template}
     */
    create(name, source) {
        return Template[name] = new KTemplate(name, source);
    },

    /**
     * Checks if a template exists
     * @param name
     * @return {boolean}
     */
    exists(name) {
        return Template.hasOwnProperty(name);
    },

    /**
     * Loads one or more files
     * @param file
     * @param callback
     */
    load(file, callback) {
        // Load a single file
        if (typeof file === "string") {
            this.loadFile(file, callback);
        }
        // Load a list of files
        else if (file instanceof Array) {
            let remaining = file.length;

            for (let i = 0; i < file.length; i += 1) {
                this.loadFile(file[i], (err) => {
                    remaining -= err ? 0 : 1;

                    if (err || remaining === 0) {
                        if (typeof callback === "function") {
                            callback.call(this, err);
                        }
                    }
                });
            }
        }
    },

    /**
     * Returns the template
     * @param name
     * @return {Template}
     */
    getTemplate(name) {
        return Template[name];
    },

    /**
     * Returns all templates logic
     * @returns {{}}
     */
    getTemplatesLogic() {
        return Template;
    },

    /**
     * Loads a file
     * @param url
     * @param callback
     */
    loadFile(url, callback) {
        // Get file type
        const fileType = url.substr(url.lastIndexOf(".") + 1);

        // Prepare HTTP request
        const req = new XMLHttpRequest();
        // todo return cached version of the URL

        // Error callback
        req.onerror = (ev) => {
            if (typeof callback === "function") {
                callback.call(this, new Error(`Cannot load file : ${url}`, ev.target.status));
            }
        };

        // State changed callback
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    switch (fileType) {
                        case "js":
                            // Evaluate JavaScript
                            eval(req.responseText);
                            break;

                        case "html":
                        case "hbml":
                        case "kbml":
                        case "tpl":
                            // Get templates from file
                            this.parseTemplates(req.responseText);
                            break;
                    }
                    // Execute the callback
                    if (typeof callback === "function") {
                        callback.call(this, null);
                    }
                } else {
                    // Execute the callback
                    if (typeof callback === "function") {
                        callback.call(this, new Error(`Cannot load file : ${url}`));
                    }
                }
            }
        };

        // Prepare async request
        req.open("GET", url, true);

        // Avoid browser to parse HTML content
        switch (fileType) {
            case "html":
            case "hbml":
            case "kbml":
            case "tpl":
                req.overrideMimeType("text/plain");
                break;
        }
        // Get file
        req.send(null);
    },

    /**
     * Returns arguments from string
     * @example "'arg1' 'arg2' 3 var4"
     * @param text
     * @param data
     * @param options
     * @return Array
     */
    parseHelperArguments(text, data, options) {
        let args = [];
        let split = text.split(" ");

        // Fetch arguments
        for (let a = 0; a < split.length; a += 1) {
            let firstChar = split[a][0];
            let lastChar = split[a].slice(-1);

            if ((firstChar === '"' || firstChar === "'")
                && (firstChar !== lastChar || "\\" + lastChar === split[a].slice(-2))) {
                let merge = [split[a]];

                for (let b = a + 1; b < split.length; b += 1) {
                    lastChar = split[b].slice(-1);
                    merge.push(split[b]);

                    // Check if last char matches first char and is not escaped
                    if (lastChar === firstChar && "\\" + lastChar !== split[b].slice(-2)) {
                        a = b;
                        args.push(merge.join(" "));
                        break;
                    }
                }
            } else {
                args.push(split[a]);
            }
        }

        // Replace arguments
        for (let i = 0; i < args.length; i += 1) {
            let value = this.parseValue(args[i], data, options);

            if (/^(["'])[^\1]+?\1$/.test(value)) {
                value = value.substring(1, value.length - 1);
            }
            args[i] = value;
        }
        return args;
    },

    /**
     * Returns params from string
     * @example "number=123 string='abc' variable=val"
     * @param text
     * @param data
     * @param options
     * @return {{}}
     */
    parseHelperParams(text, data, options) {
        let params = {};

        if (typeof text === "string") {
            let p = text.trim().split(" ");

            for (let i = 0; i < p.length; i += 1) {
                let param = p[i].trim().split("=", 2);
                let attr = param[0].trim();

                if (attr === "this") {
                    let value = this.parseValue(param[1], data, options);

                    if (typeof value === "object") {
                        params = Util.extend({}, value, params);
                    }
                } else {
                    params[attr] = this.parseValue(param[1], data, options);
                }
            }
        }
        return params;
    },

    /**
     * Search and creates templates found in the html
     * @param html
     * @return {Array}
     */
    parseTemplates(html) {
        let models = html.match(Patterns.templatePattern);

        for (let i = 0; i < models.length; i += 1) {
            let model = models[i];
            let name = model.match(Patterns.templateNamePattern)[1];
            let source = model.replace(Patterns.templateTagsPattern, '');

            // Creates the template
            this.create(name, source);
        }
        return models;
    },

    /**
     * Returns the parsed value
     * @param value
     * @param data
     * @param options
     * @return {*}
     */
    parseValue(value, data, options) {
        if (value !== null && value !== undefined) {
            // Ignore strings
            if (/^(['"])[^\1]+?\1$/.test(value)) {
                return value.replace(/^['"]/g, '').replace(/['"]$/g, '');
            }
            // Ignore operators
            if (["+", "-", "*", "/"].indexOf(value) !== -1) {
                return value;
            }
            // Ignore reserved words
            if (reservedWords.indexOf(value) !== -1) {
                return value;
            }

            // Resolve paths
            if (Patterns.pathPattern.test(value)) {
                value = this.resolvePath(value, data, options);
            }

            if (value !== null && value !== undefined) {
                if (/^true$/i.test(value)) {
                    return true;
                }
                if (/^false$/i.test(value)) {
                    return false;
                }
                if (/^[+-]?(?:[0-9]+|Infinity)$/.test(value)) {
                    return parseInt(value);
                }
                if (/^[+-]?(?:[0-9]+\.[0-9]+$)/.test(value)) {
                    return parseFloat(value);
                }
                if (typeof value === "string") {
                    value = '"' + value.replace(/"/g, '\\"') + '"';
                }
            }
        }
        return value;
    },

    /**
     * Registers a helper
     * @param name
     * @param callback
     */
    registerHelper(name, callback) {
        if (typeof name !== "string" || name.length < 1) {
            throw new Error("helper name must be a string");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            throw new Error("helper name is not valid: " + name);
        }
        if (typeof callback !== "function") {
            throw new Error("helper callback must be a function");
        }
        this.helpers[name] = callback;
    },

    /**
     * Returns the generated template
     * @param name
     * @param data
     * @param options
     * @return {string|*}
     */
    render(name, data, options) {
        if (!this.exists(name)) {
            throw(`The template "${name}" does not exist`);
        }
        return Template[name].createInstance(data, options).render(options);
    },

    /**
     * Returns the generated template
     * @param html
     * @param data
     * @param options
     * @returns {string|*}
     */
    renderHTML(html, data, options) {
        // Generate a temporary name
        let name = "tpl_" + Date.now();

        // Create and render the template
        this.create(name, html);
        let tpl = this.render(name, data, options);

        // Delete temporary template to avoid memory consumption.
        delete Template[name];

        return tpl;
    },

    /**
     * Replaces all dynamic elements
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceAll(source, data, options) {
        if (data) {
            for (let k in data) {
                if (data.hasOwnProperty(k) && typeof data[k] === "function") {
                    data[k] = data[k].call(data);
                }
            }
        }
        if (!options) {
            options = {};
        }
        source = this.replaceComments(source);
        source = this.replaceConditions(source, data, options);
        source = this.replaceBlocks(source, data, options);
        source = this.replacePartials(source, data, options);
        source = this.replaceWith(source, data, options);
        source = this.replaceEvals(source, data, options);
        source = this.replaceHelpers(source, data, options);
        source = this.replaceVars(source, data, options);
        source = this.replaceAttributes(source);
        return source;
    },

    /**
     * Replaces all attributes
     * @param source
     * @return {string}
     */
    replaceAttributes(source) {
        // Replace states (checked, disabled and selected)
        return source.replace(/(?:disabled|checked|selected)=["'](?:false)?["']/gim, '');
    },

    /**
     * Replaces all blocks
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceBlocks(source, data, options) {
        return source.replace(Patterns.blockPattern, (match, path, html) => {
            let object = this.resolvePath(path, data, options);
            let result = '';
            let blockContext = {};
            let blockHtml = '';

            if (object !== null && object !== undefined) {
                if (object instanceof Array || typeof object.length === "number") {
                    for (let i = 0; i < object.length; i += 1) {
                        blockContext = object[i];

                        if (typeof blockContext === "object") {
                            blockContext["@index"] = i;
                        }
                        blockHtml = html.replace("{{@index}}", i);
                        blockHtml = blockHtml.replace("@index", String(i));

                        result += this.replaceAll(blockHtml, blockContext, {
                            special: {"@index": i},
                            parent: {
                                data: data,
                                parent: options
                            }
                        });
                    }
                }
                else if (typeof object === "object") {
                    for (let key in object) {
                        if (object.hasOwnProperty(key)) {
                            blockContext = object[key];

                            if (typeof blockContext === "object") {
                                blockContext["@key"] = key;
                            }
                            blockHtml = html.replace("{{@key}}", key);
                            blockHtml = blockHtml.replace("@key", key);
                            result += this.replaceAll(blockHtml, blockContext, {
                                special: {"@key": key},
                                parent: {
                                    data: data,
                                    parent: options
                                }
                            });
                        }
                    }
                }
            }
            return result;
        });
    },

    /**
     * Replaces all comments
     * @param source
     * @return {string}
     */
    replaceComments(source) {
        return source.replace(Patterns.commentPattern, '');
    },

    /**
     * Replaces all conditions
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceConditions(source, data, options) {
        // Very greedy !!
        while (source.indexOf("{{#if") !== -1) {
            source = source.replace(Patterns.expressionPattern, (match, test, html) => {
                let result = '';

                let parts = html.split("{{else}}");
                html = parts[0];
                let html2 = parts[1];

                // Replace variables in condition
                test = test.replace(Patterns.valuePattern, (match, variable) => {
                    return this.parseValue(variable, data, options);
                });

                if (Util.evalCondition(test)) {
                    if (typeof html === "string") {
                        result = this.replaceAll(html, data, {
                            parent: {
                                data: data,
                                parent: options
                            }
                        });
                    }
                } else if (typeof html2 === "string") {
                    result = this.replaceAll(html2, data, {
                        parent: {
                            data: data,
                            parent: options
                        }
                    });
                }
                return result;
            });
        }
        return source;
    },

    /**
     * Replaces all evaluations
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceEvals(source, data, options) {
        return source.replace(Patterns.evalPattern, (match, expression) => {
            // Replace variables in expression
            expression = expression.replace(Patterns.valuePattern, (match, variable) => {
                return this.parseValue(variable, data, options);
            });
            const args = this.parseHelperArguments(expression, data, options);
            return Util.evalCondition(args.join(" "));
        });
    },

    /**
     * Replaces all helpers
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceHelpers(source, data, options) {
        return source.replace(Patterns.helperPattern, (match, name, args) => {
            args = this.parseHelperArguments(args, data, options);

            if (this.helpers[name] === undefined) {
                throw new Error(`Helper "${name}" does not exist`);
            }

            // Get the helper value
            let result = this.helpers[name];

            // Get the value from a function
            if (typeof result === "function") {
                result = result.apply(data, args);
            }
            return result !== undefined && result !== null ? result : '';
        });
    },

    /**
     * Replaces all partials
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replacePartials(source, data, options) {
        return source.replace(Patterns.partialPattern, (match, name, params) => {
            // Get partial params
            params = this.parseHelperParams(params, data, options);

            // Prepare partial context
            const context = Util.extend({}, data, params);

            return this.render(name, context, {
                html: true,
                parent: Util.extend({}, (options || {}).parent, {instance: this}),
                partial: true
            });
        });
    },

    /**
     * Replaces all variables
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceVars(source, data, options) {
        return source.replace(Patterns.varPattern, (match, path) => {
            let value = this.resolvePath(path, data, options);
            let type = typeof value;

            if (value !== null && value !== undefined) {
                if (type === "string" || type === "number" || type === "boolean") {
                    return value;
                }
                else if (type === "object") {
                    return value.hasOwnProperty("toString") ? value.toString() : value;
                }
                else if (type === "function") {
                    let parent = options && options.parent ? options.parent : {};
                    return value(data, parent.data, parent); // todo return parent only as 2nd argument
                }
                throw new Error(`Cannot replace variable "${path}" of type "${type}"`);
            }
            return "";
        });
    },

    /**
     * Replaces with blocks (custom scope)
     * @param source
     * @param data
     * @param options
     * @return {string}
     */
    replaceWith(source, data, options) {
        return source.replace(Patterns.withPattern, (match, path, html) => {
            let object = this.resolvePath(path, data, options);
            let result = '';

            if (object !== null && object !== undefined && typeof object === "object") {
                result = this.replaceAll(html, object, {
                    parent: {
                        data: data,
                        parent: options
                    }
                });
                return result;
            }
        });
    },

    /**
     * Returns the value of a path
     * @param path
     * @param data
     * @param options
     * @return {*}
     */
    resolvePath(path, data, options) {
        options = options || {};

        if (typeof path === "string" && data !== null && data !== undefined) {
            // Look for special vars
            if (options.special && options.special.hasOwnProperty(path)) {
                return options.special[path];
            }
            // Check if path is valid
            if (!Patterns.pathPattern.test(path)) {
                return null;
            }
            // Return current context
            if (path === "this") {
                return data;
            }

            // Find value in context
            let obj = data;

            // Access parent data
            if (path.indexOf("../") === 0) {
                if (options.parent) {
                    // Get template parent's data
                    if (options instanceof TemplateInstance) {
                        obj = options.parent.parent.data || {};
                    }
                    // Get block parent's data
                    else if (options.parent.data) {
                        obj = options.parent.data || {};
                    }
                } else {
                    obj = {};
                }
                path = path.substring(3);
            }
            // Access current data
            else if (path.indexOf("this.") === 0) {
                obj = data;
                path = path.substring(5);
            }

            if (obj !== null) {
                let parts = path.split(".");
                let depth = parts.length;

                for (let i = 0; i < depth; i += 1) {
                    // is Object
                    if (obj !== null && typeof obj === "object" && obj.hasOwnProperty(parts[i])) {
                        obj = obj[parts[i]];

                        // Get the result of the function
                        if (obj !== null && typeof obj === "function") {
                            obj = obj.call(data);
                        }
                    }
                    else {
                        obj = null;
                        break;
                    }
                }
            }
            return obj;
        }
        return null;
    }
};

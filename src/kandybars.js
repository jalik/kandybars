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

const reservedWords = [
    "abstract", "arguments", "boolean", "break", "byte",
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
    "while", "with", "yield"
];

const Template = {};

const Kandybars = {
    /**
     * The built-in helpers
     * @type {object}
     */
    helpers: {},

    /**
     * Registers a template
     * @deprecated
     * @param name
     * @param source
     * @return {Template}
     */
    create(name, source) {
        console.warn("deprecated method Kandybars.create(), use Kandybars.registerTemplate() instead");
        return this.registerTemplate(name, source);
    },

    /**
     * Checks if a template exists
     * @deprecated
     * @param name
     * @return {boolean}
     */
    exists(name) {
        console.warn("deprecated method Kandybars.exists(), use Kandybars.isTemplate() instead");
        return this.isTemplate(name);
    },

    /**
     * Returns block arguments from string
     * @param text
     * @return {Array}
     */
    fetchBlockArguments(text) {
        const args = [];

        if (typeof text === "string" && text.length) {
            text = text.trim();
        }

        const split = text.split(" ");

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
        return args;
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
     * @returns {object}
     */
    getTemplatesLogic() {
        return Template;
    },

    /**
     * Checks if helper exists
     * @param name
     * @return {boolean}
     */
    isHelper(name) {
        return this.helpers.hasOwnProperty(name) && typeof this.helpers[name] === "function";
    },

    /**
     * Checks if template exists
     * @param name
     * @return {boolean}
     */
    isTemplate(name) {
        return Template.hasOwnProperty(name) && Template[name] instanceof KTemplate;
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
     * Returns block arguments with computed value
     * @example "arg1 arg2 arg3"
     * @param text
     * @param data
     * @param options
     * @return {Array}
     */
    parseBlockArguments(text, data, options) {
        const args = this.fetchBlockArguments(text);

        // Replace arguments
        for (let i = 0; i < args.length; i += 1) {
            let value = this.parseValue(args[i], data, options);

            // Unquote string ("test" => test)
            if (/^(["'])[^\1]+?\1$/.test(value)) {
                value = value.substring(1, value.length - 1);
            }
            args[i] = value;
        }
        return args;
    },

    /**
     * Returns block params with computed value
     * @example "a=123 b='abc' c=true" => {a: 123, b: 'abc', c: true}
     * @param text
     * @param data
     * @param options
     * @return {object}
     */
    parseBlockParams(text, data, options) {
        let params = {};

        if (typeof text === "string") {
            let p = text.trim().split(" ");

            for (let i = 0; i < p.length; i += 1) {
                let param = p[i].trim().split("=", 2);
                let attr = param[0].trim();

                if (attr === "this") {
                    let value = this.parseValue(param[1], data, options);

                    if (typeof value === "object" && value !== null) {
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
     * Returns block arguments with computed value
     * @deprecated
     * @param text
     * @param data
     * @param options
     * @return {Array}
     */
    parseHelperArguments(text, data, options) {
        console.warn("deprecated method Kandybars.parseHelperArguments(), use Kandybars.parseBlockArguments() instead");
        return this.parseBlockArguments(text, data, options);
    },

    /**
     * Returns block params with computed value
     * @deprecated
     * @param text
     * @param data
     * @param options
     * @return {Object}
     */
    parseHelperParams(text, data, options) {
        console.warn("deprecated method Kandybars.parseHelperParams(), use Kandybars.parseBlockParams() instead");
        return this.parseBlockParams(text, data, options);
    },

    /**
     * Search and creates templates found in the HTML code
     * @param html
     * @return {object}
     */
    parseTemplates(html) {
        const templates = {length: 0};
        const matches = html.match(Patterns.templateRegExp);

        for (let i = 0; i < matches.length; i += 1) {
            const template = matches[i];
            const nameMatch = template.match(/name=(["'])([^"]+)\1/);
            const name = nameMatch && nameMatch[2];

            // Check template name
            if (typeof name !== "string" || name.length === 0) {
                // console.error(template);
                throw new SyntaxError(`Missing "name" attribute for <template>`);
            }
            if (name === "length") {
                // console.error(template);
                throw new SyntaxError(`Value of "name" attribute for <template> cannot be "length"`);
            }

            // Remove template tags
            const src = template.replace(Patterns.templateTagsRegExp, "");

            // Register template
            templates[name] = this.registerTemplate(name, src);
            templates.length += 1;
        }
        return templates;
    },

    /**
     * Returns the parsed value
     * @param value
     * @param data
     * @param options
     * @return {*}
     */
    parseValue(value, data, options) {
        if (typeof value === "string") {
            // Ignore string (ex: "test")
            if (/^(['"])[^\1]+?\1$/.test(value)) {
                // Remove quotes
                return value.substr(1, value.length - 2);
            }
            // Ignore operator
            if (["+", "-", "*", "/"].indexOf(value) !== -1) {
                return value;
            }
            // Boolean
            if (/^true$/i.test(value)) {
                return true;
            }
            if (/^false$/i.test(value)) {
                return false;
            }
            // Float
            if (/^[+-]?[0-9]*[.,][0-9]+$/.test(value)) {
                return parseFloat(value.replace(",", "."));
            }
            // Integer
            if (/^[+-]?(?:[0-9]+|Infinity)$/.test(value)) {
                return parseInt(value);
            }
            // Ignore reserved word
            if (reservedWords.indexOf(value) !== -1) {
                return value;
            }
            // Resolve path
            if (Patterns.contextPathRegExp.test(value)) {
                value = this.resolvePath(value, data, options);

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
        if (typeof name !== "string" || name.length === 0) {
            throw new Error("Helper name must be a string");
        }
        if (!/^[a-zA-Z_]+[a-zA-Z0-9_]*$/.test(name)) {
            throw new Error("Helper name is not valid: " + name);
        }
        if (typeof callback !== "function") {
            throw new Error("Helper callback must be a function");
        }
        if (this.isHelper(name)) {
            console.warn(`Helper "${name}" has been defined already`);
        }
        this.helpers[name] = callback;
    },

    /**
     * Registers a template
     * @param name
     * @param html
     * @return {Template}
     */
    registerTemplate(name, html) {
        return Template[name] = new KTemplate(name, html);
    },

    /**
     * Returns the generated template
     * @param name
     * @param data
     * @param options
     * @return {string}
     */
    render(name, data, options) {
        if (!this.isTemplate(name)) {
            throw new Error(`Template "${name}" does not exist`);
        }
        const template = this.getTemplate(name);
        const tpl = template.createInstance(data, options);
        return tpl.render(options);
    },

    /**
     * Returns the generated template
     * @param html
     * @param data
     * @param options
     * @returns {string}
     */
    renderHTML(html, data, options) {
        // Generate a temporary name
        const name = `tpl_${Date.now()}`;

        // Create and render the template
        const template = new KTemplate(name, html);
        const tpl = template.createInstance(data, options);
        return tpl.render(options);
    },

    /**
     * Replaces all templating elements
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceAll(src, data, options) {
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
        src = this.replaceComments(src);
        src = this.replaceConditions(src, data, options);
        src = this.replaceBlocks(src, data, options);
        src = this.replacePartials(src, data, options);
        src = this.replaceWith(src, data, options);
        src = this.replaceEvals(src, data, options);
        src = this.replaceHelpers(src, data, options);
        src = this.replaceVariables(src, data, options);
        src = this.replaceAttributes(src);
        return src;
    },

    /**
     * Replaces all attributes
     * @param src
     * @return {string}
     */
    replaceAttributes(src) {
        // Replace states (checked, disabled and selected)
        return src.replace(/(?:disabled|checked|selected)=["'](?:false)?["']/gim, '');
    },

    /**
     * Replaces all blocks
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceBlocks(src, data, options) {
        return src.replace(Patterns.eachBlockRegExp, (match, path, html) => {
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
     * @param src
     * @return {string}
     */
    replaceComments(src) {
        return src.replace(Patterns.commentBlockRegExp, "");
    },

    /**
     * Replaces all conditions
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceConditions(src, data, options) {
        // Very greedy !!
        while (src.indexOf("{{#if") !== -1) {
            src = src.replace(Patterns.conditionBlockRegExp, (match, test, html) => {
                let result = '';

                let parts = html.split("{{else}}");
                html = parts[0];
                let html2 = parts[1];

                // Replace variables in condition
                test = test.replace(Patterns.blockArgumentRegExp, (match, variable) => {
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
        return src;
    },

    /**
     * Replaces all evaluations
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceEvals(src, data, options) {
        return src.replace(Patterns.evalBlockRegExp, (match, expression) => {
            // Replace variables in expression
            expression = expression.replace(Patterns.blockArgumentRegExp, (match, variable) => {
                return this.parseValue(variable, data, options);
            });
            const args = this.parseBlockArguments(expression, data, options);
            return Util.evalCondition(args.join(" "));
        });
    },

    /**
     * Replaces all helpers
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceHelpers(src, data, options) {
        return src.replace(Patterns.helperBlockRegExp, (match, name, args) => {
            args = this.parseBlockArguments(args, data, options);

            if (!this.isHelper(name)) {
                throw new Error(`Helper "${name}" does not exist`);
            }

            // Get the helper value
            let result = this.helpers[name];

            // Get the value from a function
            if (typeof result === "function") {
                result = result.apply(data, args);
            }
            return result !== undefined && result !== null ? result : "";
        });
    },

    /**
     * Replaces partial blocks
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replacePartials(src, data, options) {
        return src.replace(Patterns.partialBlockRegExp, (match, name, params) => {
            params = this.parseBlockParams(params, data, options);

            // Prepare partial context
            const context = Util.extend({}, data, params);

            const value = this.render(name, context, {
                html: true,
                parent: Util.extend({}, (options || {}).parent, {instance: this}),
                partial: true
            });
            return value !== null ? value : "";
        });
    },

    /**
     * Replaces variable blocks
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceVariables(src, data, options) {
        return src.replace(Patterns.variableBlockRegExp, (match, path) => {
            let value = this.resolvePath(path, data, options);
            const type = typeof value;

            if (value !== null
                && value !== undefined
                && type !== "string"
                && type !== "number"
                && type !== "boolean") {

                if (type === "object") {
                    value = value.hasOwnProperty("toString") ? value.toString() : value;
                }
                else if (type === "function") {
                    let parent = options && options.parent ? options.parent : {};
                    value = value(data, parent.data, parent); // todo return parent only as 2nd argument
                } else {
                    throw new Error(`Cannot replace variable "${path}" of type "${type}"`);
                }
            }
            return value !== null ? value : "";
        });
    },

    /**
     * Replaces variable blocks
     * @deprecated
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceVars(src, data, options) {
        console.warn("deprecated method Kandybars.replaceVars(), use Kandybars.replaceVariables() instead");
        return this.replaceVariables(src, data, options);
    },

    /**
     * Replaces with blocks (custom scope)
     * @param src
     * @param data
     * @param options
     * @return {string}
     */
    replaceWith(src, data, options) {
        return src.replace(Patterns.withBlockRegExp, (match, path, html) => {
            const object = this.resolvePath(path, data, options);
            let result = "";

            if (object !== null && object !== undefined && typeof object === "object") {
                result = this.replaceAll(html, object, {
                    parent: {
                        data: data,
                        parent: options
                    }
                });
            }
            return result;
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
            if (!Patterns.contextPathRegExp.test(path)) {
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
                    let part = parts[i];

                    if (obj === null || obj === undefined) {
                        break;
                    }

                    // is Object
                    if (part.length && typeof obj === "object") {
                        if (part.indexOf("[") !== -1) {
                            let indexStart = part.indexOf("[");
                            let indexEnd = 0;
                            const partName = part.substr(0, indexStart);

                            if (obj.hasOwnProperty(partName)) {
                                do {
                                    indexStart = part.indexOf("[", indexEnd);
                                    indexEnd = part.indexOf("]", indexStart);

                                    // users[0]
                                    if (indexStart !== -1 && indexEnd !== -1) {
                                        let partIndex = part.substr(indexStart + 1, indexEnd - (indexStart + 1));

                                        // users
                                        if (obj[partName] instanceof Array) {
                                            obj = obj[partName][partIndex];
                                        } else {
                                            obj = obj[partName][partIndex];
                                        }
                                    }
                                } while (indexStart !== -1);
                            }
                        } else if (obj.hasOwnProperty(part)) {
                            obj = obj[part];
                        } else {
                            obj = null;
                        }

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

export default Kandybars;


// Expose lib to window
if (window !== undefined && window.Kandybars === undefined) {
    window.Kandybars = Kandybars;
    window.Kandybars.Template = KTemplate;
    window.Kandybars.TemplateInstance = TemplateInstance;
    window.Template = Template;
}

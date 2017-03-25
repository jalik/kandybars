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

// Patterns
const blockPattern = /{{#each ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}([\s\S]*?){{\/each}}/g;
const commentPattern = /{{![^}]+?}}/g;
const evalPattern = /{{\eval ([^}]+)}}/g;
const expressionPattern = /{{#if ([^}]+)}}((?:(?!{{#if)[\s\S])*?){{\/if}}/g;
const helperPattern = /{{([a-zA-Z0-9_]+) ([^}]+)}}/g;
const pathPattern = /^(?:this\.|\.\.\/)?[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*$/;
const partialPattern = /{{> *([^ }]+)( +[^}]+)*}}/g;
const templatePattern = /<template[^>]*>([\s\S]*?)<\/template>/g;
const templateNamePattern = /name="([^"]+)"/;
const templateTagsPattern = /<template[^>]*>|<\/template>|/g;
const valuePattern = /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;
const varPattern = /{{{?((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}}?/g;
const withPattern = /{{#with ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}([\s\S]*?){{\/with}}/g;

const partials = {};
const Template = {};

let instanceCount = 0;

/**
 * The Kandybars template engine
 * @param name
 * @return {Kandybars}
 * @constructor
 */
const Kandybars = {
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
     * @return {Kandybars.Template}
     */
    create: function (name, source) {
        return Template[name] = new Kandybars.Template(name, source);
    },

    /**
     * Checks if a template exists
     * @param name
     * @return {boolean}
     */
    exists: function (name) {
        return Template.hasOwnProperty(name);
    },

    /**
     * Loads one or more files
     * @param file
     * @param callback
     */
    load: function (file, callback) {
        // Load a single file
        if (typeof file === "string") {
            this.loadFile(file, callback);
        }
        // Load a list of files
        else if (file instanceof Array) {
            let remaining = file.length;

            for (let i = 0; i < file.length; i += 1) {
                this.loadFile(file[i], function (err) {
                    remaining -= err ? 0 : 1;

                    if (err || remaining === 0) {
                        if (typeof callback === "function") {
                            callback.call(Kandybars, err);
                        }
                    }
                });
            }
        }
    },

    /**
     * Returns all templates logic
     * @returns {{}}
     */
    getTemplatesLogic: function () {
        return Template;
    },

    /**
     * Loads a file
     * @param url
     * @param callback
     */
    loadFile: function (url, callback) {
        // Get file type
        const fileType = url.substr(url.lastIndexOf(".") + 1);

        // Prepare HTTP request
        const req = new XMLHttpRequest();
        // todo return cached version of the URL

        // Error callback
        req.onerror = function (ev) {
            if (typeof callback === "function") {
                callback.call(Kandybars, new Error(`Cannot load file : ${url}`, ev.target.status));
            }
        };

        // State changed callback
        req.onreadystatechange = function () {
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
                            Kandybars.parseTemplates(req.responseText);
                            break;
                    }
                    // Execute the callback
                    if (typeof callback === "function") {
                        callback.call(Kandybars, null);
                    }
                } else {
                    // Execute the callback
                    if (typeof callback === "function") {
                        callback.call(Kandybars, new Error(`Cannot load file : ${url}`));
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
                req.overrideMimeType('text/plain');
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
    parseHelperArguments: function (text, data, options) {
        let args = [];
        let split = text.split(" ");

        // Fetch arguments
        for (let a = 0; a < split.length; a += 1) {
            let firstChar = split[a][0];
            let lastChar = split[a].slice(-1);

            if ((firstChar === '"' || firstChar === "'")
                && (firstChar !== lastChar || '\\' + lastChar === split[a].slice(-2))) {
                let merge = [split[a]];

                for (let b = a + 1; b < split.length; b += 1) {
                    lastChar = split[b].slice(-1);
                    merge.push(split[b]);

                    // Check if last char matches first char and is not escaped
                    if (lastChar === firstChar && '\\' + lastChar !== split[b].slice(-2)) {
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
            let value = Kandybars.parseValue(args[i], data, options);

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
    parseHelperParams: function (text, data, options) {
        let params = {};

        if (typeof text === "string") {
            let p = text.trim().split(" ");

            for (let i = 0; i < p.length; i += 1) {
                let param = p[i].trim().split("=", 2);
                let attr = param[0].trim();

                if (attr === "this") {
                    let value = Kandybars.parseValue(param[1], data, options);

                    if (typeof value === "object") {
                        params = extend({}, value, params);
                    }
                } else {
                    params[attr] = Kandybars.parseValue(param[1], data, options);
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
    parseTemplates: function (html) {
        let models = html.match(templatePattern);

        for (let i = 0; i < models.length; i += 1) {
            let model = models[i];
            let name = model.match(templateNamePattern)[1];
            let source = model.replace(templateTagsPattern, '');

            // Creates the template
            Kandybars.create(name, source);
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
    parseValue: function (value, data, options) {
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
            if (pathPattern.test(value)) {
                value = Kandybars.resolvePath(value, data, options);
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
    registerHelper: function (name, callback) {
        if (typeof name !== "string" || name.length < 1) {
            throw new Error("invalid helper name");
        }
        if (typeof callback !== "function") {
            throw new Error("invalid helper callback");
        }
        Kandybars.helpers[name] = callback;
    },

    /**
     * Returns the generated template
     * @param name
     * @param data
     * @param options
     * @return {string|*}
     */
    render: function (name, data, options) {
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
    renderHTML: function (html, data, options) {
        // Generate a temporary name
        let name = "tpl_" + Date.now();

        // Create and render the template
        Kandybars.create(name, html);
        let tpl = Kandybars.render(name, data, options);

        // Delete temporary template to avoid memory consumption.
        delete Template[name];

        return tpl;
    },

    /**
     * Returns the value of a path
     * @param path
     * @param data
     * @param options
     * @return {*}
     */
    resolvePath: function (path, data, options) {
        options = options || {};

        if (typeof path === "string" && typeof data === "object" && data !== null) {
            // Look for special vars
            if (options.special && options.special.hasOwnProperty(path)) {
                return options.special[path];
            }
            // Check path
            if (!pathPattern.test(path)) {
                return null;
            }
            if (path === "this") {
                return data;
            }

            let obj = data;

            // Access parent data
            if (path.indexOf("../") === 0) {
                if (options.parent && options.parent.parent) {
                    obj = options.parent.parent.data || {};
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

/**
 * Template model
 * @param name
 * @param source
 * @constructor
 */
Kandybars.Template = function (name, source) {
    const self = this;

    self._events = {};
    self._helpers = {};
    self._source = source;
    self.name = name;
    self.rendered = null;

    /**
     * Returns template events
     * @return {*}
     */
    self.getEvents = function () {
        return self._events;
    };

    /**
     * Returns template helpers
     * @return {*}
     */
    self.getHelpers = function () {
        return self._helpers;
    };

    /**
     * Returns template name
     * @return {*}
     */
    self.getName = function () {
        return self.name;
    };

    /**
     * Returns template source
     * @return {*}
     */
    self.getSource = function () {
        return self._source;
    };
};

/**
 * Creates an instance of the template
 * @param data
 * @param options
 * @return {Kandybars.TemplateInstance}
 */
Kandybars.Template.prototype.createInstance = function (data, options) {
    return new Kandybars.TemplateInstance(this, data, options);
};

/**
 * Defines the events of a template
 * @param events
 */
Kandybars.Template.prototype.events = function (events) {
    if (events !== null && typeof events === "object") {
        for (let action in events) {
            if (events.hasOwnProperty(action)) {
                this._events[action] = events[action];
            }
        }
    }
};

/**
 * Defines the helpers of a template
 * @param helpers
 */
Kandybars.Template.prototype.helpers = function (helpers) {
    if (helpers !== null && typeof helpers === "object") {
        for (let key in helpers) {
            if (helpers.hasOwnProperty(key)) {
                this._helpers[key] = helpers[key];
            }
        }
    }
};

/**
 * Instance of a template
 * @param template
 * @param data
 * @param options
 * @constructor
 */
Kandybars.TemplateInstance = function (template, data, options) {
    const self = this;

    instanceCount += 1;

    options = extend({
        events: {},
        helpers: {},
        parent: null,
        partial: false,
        rendered: null
    }, options);

    let children = [];
    const id = "kbti_" + instanceCount;
    let parent = options.parent;

    if (options.partial) {
        partials[id] = this;
    }

    // Link instance to it's parent
    if (parent && parent.instance instanceof Kandybars.TemplateInstance) {
        parent.instance.getChildren().push(this);
    }

    /**
     * Attaches the event to the elements in the template
     * @param event
     * @param callback
     * @param node
     */
    self.attachEvent = function (event, callback, node) {
        const self = this;
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

                (function (action, selector) {
                    // Attach event now and in the future
                    node.on(action, selector, function (ev) {
                        callback.call(self.getContext(), ev, node, self);
                    });
                })(action, selector);
            }
        }
    };

    /**
     * Parses all events in the template
     * @param events
     * @param node
     */
    self.attachEvents = function (events, node) {
        for (let action in events) {
            if (events.hasOwnProperty(action)) {
                self.attachEvent(action, events[action], node);
            }
        }
    };

    /**
     * Returns template children
     * @return {Array}
     */
    self.getChildren = function () {
        return children;
    };

    /**
     * Returns instance context
     * @return {*}
     */
    self.getContext = function () {
        return extend({}, data, template._helpers);
    };

    /**
     * Returns instance events
     * @return {*}
     */
    self.getEvents = function () {
        return extend({}, self.getTemplate().getEvents(), options.events);
    };

    /**
     * Returns instance helpers
     * @return {*}
     */
    self.getHelpers = function () {
        return extend({}, self.getTemplate().getHelpers(), options.helpers);
    };

    /**
     * Returns the template Id
     * @return {string}
     */
    self.getId = function () {
        return id;
    };

    /**
     * Checks if instance has children
     * @return {boolean}
     */
    self.hasChildren = function () {
        return children.length > 0;
    };

    /**
     * Checks if instance is a partial template
     * @return {boolean}
     */
    self.isPartial = function () {
        return options.partial === true;
    };

    /**
     * Returns the template parent
     * @return {null|Kandybars.TemplateInstance}
     */
    self.getParent = function () {
        return parent && parent.instance;
    };

    /**
     * Returns the template
     * @return {Kandybars.Template}
     */
    self.getTemplate = function () {
        return template;
    };

    /**
     * Executes rendered callbacks
     * @private
     */
    self._rendered = function () {
        if (typeof options.rendered === "function") {
            options.rendered.call(self, self.compiled, self.getContext());
        }
        else if (typeof self.getTemplate().rendered === "function") {
            self.getTemplate().rendered.call(self, self.compiled, self.getContext());
        }
    };
};

/**
 * Returns a compiled version of the template
 * @param options
 * @return {*|HTMLElement}
 */
Kandybars.TemplateInstance.prototype.render = function (options) {
    options = extend({
        events: {},
        helpers: {},
        html: false,
        parent: null,
        rendered: null
    }, options);

    const self = this;
    let context = self.getContext();
    let template = self.getTemplate();
    let source = template.getSource();

    // Generate template
    let tpl = self.replaceAll(source, context, options);

    if (self.isPartial()) {
        let partialId = self.getId();

        // Search first node
        let startIndex = tpl.indexOf("<");
        let closeIndex = tpl.indexOf(">", startIndex);

        if (startIndex === -1 || closeIndex === -1) {
            tpl = '<div data-partial-id="' + partialId + '">' + tpl + '</div>';
        } else {
            tpl = tpl.substr(0, closeIndex) + ' data-partial-id="' + partialId + '"' + tpl.substr(closeIndex);
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

            let processPartial = function () {
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
            self.attachEvents(self.getEvents(), tpl);
        }
    }

    self.compiled = tpl;

    if (!options.html) {
        self._rendered();
    }
    return tpl;
};


/**
 * Replaces all dynamic elements
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceAll = function (source, data, options) {
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
};

/**
 * Replaces all attributes
 * @param source
 * @return {*}
 */
Kandybars.TemplateInstance.prototype.replaceAttributes = function (source) {
    // Replace states (checked, disabled and selected)
    return source.replace(/(?:disabled|checked|selected)=["'](?:false)?["']/gim, '');
};

/**
 * Replaces all blocks
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceBlocks = function (source, data, options) {
    const self = this;
    return source.replace(blockPattern, function (match, path, html) {
        let object = Kandybars.resolvePath(path, data, options);
        let result = '';
        let blockContext = {};
        let blockHtml = '';

        if (object !== null && object !== undefined) {
            if (object instanceof Array) {
                for (let i = 0; i < object.length; i += 1) {
                    blockContext = object[i];

                    if (typeof blockContext === "object") {
                        blockContext["@index"] = i;
                    }
                    blockHtml = html.replace("{{@index}}", i);
                    blockHtml = blockHtml.replace("@index", String(i));

                    result += self.replaceAll(blockHtml, blockContext, {
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
                        result += self.replaceAll(blockHtml, blockContext, {
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
};

/**
 * Replaces all comments
 * @param source
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceComments = function (source) {
    return source.replace(commentPattern, '');
};

/**
 * Replaces all conditions
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceConditions = function (source, data, options) {
    const self = this;
    // Very greedy !!
    while (source.indexOf("{{#if") !== -1) {
        source = source.replace(expressionPattern, function (match, test, html) {
            let result = '';

            let parts = html.split("{{else}}");
            html = parts[0];
            let html2 = parts[1];

            test = test.replace(valuePattern, function (match, variable) {
                return Kandybars.parseValue(variable, data, options);
            });

            if (evalCondition(test)) {
                if (typeof html === "string") {
                    result = self.replaceAll(html, data, {
                        parent: {
                            data: data,
                            parent: options
                        }
                    });
                }
            } else if (typeof html2 === "string") {
                result = self.replaceAll(html2, data, {
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
};

/**
 * Replaces all evaluations
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceEvals = function (source, data, options) {
    return source.replace(evalPattern, function (match, expression) {
        const args = Kandybars.parseHelperArguments(expression, data, options);
        return evalCondition(args.join(" "));
    });
};

/**
 * Replaces all helpers
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceHelpers = function (source, data, options) {
    return source.replace(helperPattern, function (match, name, args) {
        args = Kandybars.parseHelperArguments(args, data, options);

        if (Kandybars.helpers[name] === undefined) {
            throw new Error(`Helper "${name}" does not exist`);
        }

        // Get the helper value
        let result = Kandybars.helpers[name];

        // Get the value from a function
        if (typeof result === "function") {
            result = result.apply(data, args);
        }
        return result !== undefined && result !== null ? result : '';
    });
};

/**
 * Replaces all partials
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replacePartials = function (source, data, options) {
    const self = this;
    return source.replace(partialPattern, function (match, name, params) {
        // Get partial params
        params = Kandybars.parseHelperParams(params, data, options);

        // Prepare partial context
        let context = extend({}, data, params);

        return Kandybars.render(name, context, {
            html: true,
            parent: extend({}, options, {instance: self}),
            partial: true
        });
    });
};

/**
 * Replaces all variables
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceVars = function (source, data, options) {
    return source.replace(varPattern, function (match, path) {
        let value = Kandybars.resolvePath(path, data, options);
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
        return '';
    });
};

/**
 * Replaces with blocks (custom scope)
 * @param source
 * @param data
 * @param options
 * @return {string}
 */
Kandybars.TemplateInstance.prototype.replaceWith = function (source, data, options) {
    const self = this;
    return source.replace(withPattern, function (match, path, html) {
        let object = Kandybars.resolvePath(path, data, options);
        let result = '';

        if (object !== null && object !== undefined && typeof object === "object") {
            result = self.replaceAll(html, object, {
                parent: {
                    data: data,
                    parent: options
                }
            });
            return result;
        }
    });
};

// Add jQuery selector in template instance
if (typeof jQuery !== "undefined") {
    Kandybars.TemplateInstance.prototype.$ = function (selector) {
        let tpl = jQuery(this.compiled);
        return selector !== null ? tpl.find(selector) : tpl;
    };
    Kandybars.TemplateInstance.prototype.find = function (selector) {
        return this.$(selector);
    };
}

/**
 * Returns the value of the condition
 * @param condition
 * @return {*}
 */
function evalCondition(condition) {
    let __kbRes = undefined;

    if (typeof condition === "string" && condition.length > 0) {
        // Remove carrier returns that could break evaluation
        condition = condition.replace(/[\r\n]/g, '');
    }

    eval(`__kbRes = ( ${condition} );`);

    return __kbRes;
}

/**
 * Merge objects
 * @return {*}
 */
function extend() {
    for (let i = 1; i < arguments.length; i += 1) {
        for (let key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                arguments[0][key] = arguments[i][key];
            }
        }
    }
    return arguments[0];
}

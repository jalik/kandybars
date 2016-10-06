/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Karl STEIN
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

(function (root, factory) {
    var k = factory();

    // Export module to AMD
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            root.Kandybars = k;
            root.Template = k.getTemplatesLogic();
            return root.Kandybars;
        });
    }
    // Export module to NodeJS/CommonJS
    else if (typeof module === 'object' && module.exports) {
        module.exports = {
            Kandybars: k,
            Template: k.getTemplatesLogic()
        };
    }
    // Export module to root/window
    else {
        root.Kandybars = k;
        root.Template = k.getTemplatesLogic();
    }
}(this, function () {

    var reservedWords = ['abstract', 'arguments', 'boolean', 'break', 'byte',
        'case', 'catch', 'char', 'class', 'const',
        'continue', 'debugger', 'default', 'delete', 'do',
        'double', 'else', 'enum', 'eval', 'export',
        'extends', 'false', 'final', 'finally', 'float',
        'for', 'function', 'goto', 'if', 'implements',
        'import', 'in', 'instanceof', 'int', 'interface',
        'let', 'long', 'native', 'new', 'null',
        'package', 'private', 'protected', 'public', 'return',
        'short', 'static', 'super', 'switch', 'synchronized',
        'this', 'throw', 'throws', 'transient', 'true',
        'try', 'typeof', 'var', 'void', 'volatile',
        'while', 'with', 'yield'];

    // Patterns
    var blockPattern = /\{\{\#each ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    var commentPattern = /\{\{\![^}]+?\}\}/g;
    var evalPattern = /\{\{\eval ([^}]+)\}\}/g;
    var expressionPattern = /\{\{\#if ([^}]+)\}\}((?:(?!\{\{\#if)[\s\S])*?)\{\{\/if\}\}/g;
    var helperPattern = /\{\{([a-zA-Z0-9_]+) ([^}]+)\}\}/g;
    var pathPattern = /^(?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/;
    var partialPattern = /\{\{> *([^ }]+)( +[^}]+)*\}\}/g;
    var templatePattern = /<template[^>]*>([\s\S]*?)<\/template>/g;
    var templateNamePattern = /name="([^"]+)"/;
    var templateTagsPattern = /<template[^>]*>|<\/template>|/g;
    var valuePattern = /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;
    var varPattern = /\{\{\{?((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}\}?/g;
    var withPattern = /\{\{\#with ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}([\s\S]*?)\{\{\/with\}\}/g;

    var partials = {};
    var instanceCount = 0;
    var Template = {};

    /**
     * The Kandybars template engine
     * @param name
     * @return {Kandybars}
     * @constructor
     */
    var Kandybars = {
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
            if (typeof file === 'string') {
                this.loadFile(file, callback);
            }
            // Load a list of files
            else if (file instanceof Array) {
                var remaining = file.length;

                for (var i = 0; i < file.length; i += 1) {
                    this.loadFile(file[i], function (err) {
                        remaining -= err ? 0 : 1;

                        if (err || remaining === 0) {
                            if (typeof callback === 'function') {
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
            // Prepare HTTP request
            var req = new XMLHttpRequest();
            // todo use cache with Kandybars.cache
            // Error callback
            req.onerror = function (ev) {
                if (typeof callback === 'function') {
                    callback.call(Kandybars, new Error('Cannot load file : ' + url, ev.target.status));
                }
            };
            // State changed callback
            req.onreadystatechange = function (ev) {
                if (req.readyState == 4) {
                    if (req.status == 200) {
                        // Get file type
                        var type = url.substr(url.lastIndexOf('.') + 1);

                        switch (type) {
                            case 'html':
                            case 'tpl':
                                // Get templates from file
                                Kandybars.parseTemplates(req.responseText);
                                break;
                        }
                        // Execute the callback
                        if (typeof callback === 'function') {
                            callback.call(Kandybars, null);
                        }
                    } else {
                        // Execute the callback
                        if (typeof callback === 'function') {
                            callback.call(Kandybars, new Error('Cannot load file : ' + url));
                        }
                    }
                }
            };
            req.open('GET', url, true);
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
            var args = [];
            var split = text.split(' ');

            // Fetch arguments
            for (var a = 0; a < split.length; a += 1) {
                var firstChar = split[a][0];
                var lastChar = split[a].slice(-1);

                if ((firstChar === '"' || firstChar === "'")
                    && (firstChar !== lastChar || '\\' + lastChar === split[a].slice(-2))) {
                    var merge = [split[a]];

                    for (var b = a + 1; b < split.length; b += 1) {
                        lastChar = split[b].slice(-1);
                        merge.push(split[b]);

                        // Check if last char matches first char and is not escaped
                        if (lastChar === firstChar && '\\' + lastChar !== split[b].slice(-2)) {
                            a = b;
                            args.push(merge.join(' '));
                            break;
                        }
                    }
                } else {
                    args.push(split[a]);
                }
            }

            // Replace arguments
            for (var i = 0; i < args.length; i += 1) {
                var value = Kandybars.parseValue(args[i], data, options);

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
            var params = {};

            if (typeof text === 'string') {
                var p = text.trim().split(' ');

                for (var i = 0; i < p.length; i += 1) {
                    var param = p[i].trim().split('=', 2);
                    var attr = param[0].trim();

                    if (attr === 'this') {
                        var value = Kandybars.parseValue(param[1], data, options);

                        if (typeof value === 'object') {
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
            var models = html.match(templatePattern);

            for (var i = 0; i < models.length; i += 1) {
                var model = models[i];
                var name = model.match(templateNamePattern)[1];
                var source = model.replace(templateTagsPattern, '');

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
            if (value != null) {
                if (/^(['"])[^\1]+?\1$/.test(value)) {
                    return value.replace(/^['"]/g, '').replace(/['"]$/g, '');
                }
                if (/^true$/i.test(value)) {
                    return true;
                }
                if (/^false$/i.test(value)) {
                    return false;
                }
                if (reservedWords.indexOf(value) != -1) {
                    return value;
                }
                if (/^[+-]?(?:[0-9]+|Infinity)$/.test(value)) {
                    return parseInt(value);
                }
                if (/^[+-]?(?:[0-9]+\.[0-9]+$)/.test(value)) {
                    return parseFloat(value);
                }

                if (pathPattern.test(value)) {
                    value = Kandybars.resolvePath(value, data, options);
                }

                if (value != null) {
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
                    if (typeof value === 'string') {
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
            if (typeof name !== 'string' || name.length < 1) {
                throw new Error("invalid helper name");
            }
            if (typeof callback !== 'function') {
                throw new Error("invalid helper callback");
            }
            Kandybars.helpers[name] = callback;
        },

        /**
         * Replaces all dynamic elements
         * @param source
         * @param data
         * @param options
         * @return {string}
         */
        replaceAll: function (source, data, options) {
            if (data) {
                for (var k in data) {
                    if (data.hasOwnProperty(k) && typeof data[k] === 'function') {
                        data[k] = data[k].call(data);
                    }
                }
            }
            if (!options) {
                options = {};
            }
            source = Kandybars.replaceComments.call(this, source, options);
            source = Kandybars.replaceConditions.call(this, source, data, options);
            source = Kandybars.replaceBlocks.call(this, source, data, options);
            source = Kandybars.replacePartials.call(this, source, data, options);
            source = Kandybars.replaceWith.call(this, source, data, options);
            source = Kandybars.replaceEvals.call(this, source, data, options);
            source = Kandybars.replaceHelpers.call(this, source, data, options);
            source = Kandybars.replaceVars.call(this, source, data, options);
            source = Kandybars.replaceTags.call(this, source, options);
            return source;
        },

        /**
         * Replaces all blocks
         * @param source
         * @param data
         * @param options
         * @return {string}
         */
        replaceBlocks: function (source, data, options) {
            return source.replace(blockPattern, function (match, path, html) {
                var object = Kandybars.resolvePath(path, data, options);
                var result = '';
                var blockContext = {};
                var blockHtml = '';

                if (object != null) {
                    if (object instanceof Array) {
                        for (var i = 0; i < object.length; i += 1) {
                            blockContext = object[i];

                            if (typeof blockContext === 'object') {
                                blockContext['@index'] = i;
                            }
                            blockHtml = html.replace('{{@index}}', i);
                            blockHtml = blockHtml.replace('@index', i);

                            result += Kandybars.replaceAll(blockHtml, blockContext, {
                                special: {'@index': i},
                                parent: {
                                    data: data,
                                    parent: options
                                }
                            });
                        }
                    }
                    else if (typeof object === 'object') {
                        for (var key in object) {
                            if (object.hasOwnProperty(key)) {
                                blockContext = object[key];

                                if (typeof blockContext === 'object') {
                                    blockContext['@key'] = key;
                                }
                                blockHtml = html.replace('{{@key}}', key);
                                blockHtml = blockHtml.replace('@key', key);
                                result += Kandybars.replaceAll(blockHtml, blockContext, {
                                    special: {'@key': key},
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
         * @param options
         * @return {string}
         */
        replaceComments: function (source, options) {
            return source.replace(commentPattern, '');
        },

        /**
         * Replaces all conditions
         * @param source
         * @param data
         * @param options
         * @return {string}
         */
        replaceConditions: function (source, data, options) {
            // Very greedy !!
            while (source.indexOf('{{#if') !== -1) {
                source = source.replace(expressionPattern, function (match, test, html) {
                    var result = '';

                    var parts = html.split('{{else}}');
                    html = parts[0];
                    var html2 = parts[1];

                    test = test.replace(valuePattern, function (match, variable) {
                        return Kandybars.parseValue(variable, data, options);
                    });

                    if (evalCondition(test)) {
                        if (typeof html === 'string') {
                            result = Kandybars.replaceAll(html, data, {
                                parent: {
                                    data: data,
                                    parent: options
                                }
                            });
                        }
                    } else if (typeof html2 === 'string') {
                        result = Kandybars.replaceAll(html2, data, {
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
        replaceEvals: function (source, data, options) {
            return source.replace(evalPattern, function (match, expression) {
                var args = Kandybars.parseHelperArguments(expression, data, options);
                return evalCondition(args.join(' '));
            });
        },

        /**
         * Replaces all helpers
         * @param source
         * @param data
         * @param options
         * @return {string}
         */
        replaceHelpers: function (source, data, options) {
            return source.replace(helperPattern, function (match, name, args) {
                args = Kandybars.parseHelperArguments(args, data, options);

                if (Kandybars.helpers[name] === undefined) {
                    throw 'Helper `' + name + '` does not exist';
                }

                // Get the helper value
                var result = Kandybars.helpers[name];

                // Get the value from a function
                if (typeof result === 'function') {
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
        replacePartials: function (source, data, options) {
            var self = this;
            return source.replace(partialPattern, function (match, name, params) {
                // Get partial params
                params = Kandybars.parseHelperParams(params, data, options);

                // Prepare partial context
                var context = extend({}, data, params);

                return Kandybars.render(name, context, {
                    html: true,
                    parent: (self instanceof Kandybars.TemplateInstance ? self : options),
                    partial: true
                });
            });
        },

        /**
         * Replaces all tags
         * @param source
         * @param options
         * @return {*}
         */
        replaceTags: function (source, options) {
            // Replace checked, disabled and selected tags
            return source.replace(/(?:disabled|checked|selected)=["'](?:false)?["']/gim, '');
        },

        /**
         * Replaces all variables
         * @param source
         * @param data
         * @param options
         * @return {string}
         */
        replaceVars: function (source, data, options) {
            return source.replace(varPattern, function (match, path) {
                var value = Kandybars.resolvePath(path, data, options);
                var type = typeof value;

                if (value != null) {
                    if (type === 'string' || type === 'number' || type === 'boolean') {
                        return value;

                    } else if (type === 'object') {
                        return value.hasOwnProperty('toString') ? value.toString() : value;

                    } else if (type === 'function') {
                        var parent = options && options.parent ? options.parent : {};
                        return value(data, parent.data, parent); // todo return parent only as 2nd argument
                    }
                    throw 'Cannot replace var `' + path + '` of type ' + type;
                }
                return '';
            });
        },

        /**
         * Replaces with blocks (custom scope)
         * @param source
         * @param data
         * @param options
         * @return {string}
         */
        replaceWith: function (source, data, options) {
            return source.replace(withPattern, function (match, path, html) {
                var object = Kandybars.resolvePath(path, data, options);
                var result = '';

                if (object != null && typeof object === 'object') {
                    result = Kandybars.replaceAll(html, object, {
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
         * Returns the generated template
         * @param name
         * @param data
         * @param options
         * @return {string|*}
         */
        render: function (name, data, options) {
            if (!this.exists(name)) {
                throw('The template `' + name + '` does not exist');
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
            var name = 'tpl_' + Date.now();

            // Create and render the template
            Kandybars.create(name, html);
            var tpl = Kandybars.render(name, data, options);

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

            if (path != null && data != null) {
                if (options.special && options.special.hasOwnProperty(path)) {
                    return options.special[path];
                }

                if (!pathPattern.test(path)) {
                    return null;
                }
                if (path === 'this') {
                    return data;
                }

                var obj = data;

                if (path.indexOf('../') == 0) {
                    obj = options.parent ? options.parent.data : {};
                    path = path.substring(3);

                } else if (path.indexOf('this.') == 0) {
                    obj = data;
                    path = path.substring(5);
                }

                if (obj != null) {
                    var parts = path.split('.');
                    var depth = parts.length;

                    for (var i = 0; i < depth; i += 1) {
                        if (obj != null && obj.hasOwnProperty(parts[i])) {
                            obj = obj[parts[i]];

                            // Get the result of the function
                            if (obj != null && typeof obj === 'function') {
                                obj = obj.call(data);
                            }
                        } else {
                            obj = null;
                            break;
                        }
                    }
                }
                return obj;
            }
        }
    };

    /**
     * Template model
     * @param name
     * @param source
     * @constructor
     */
    Kandybars.Template = function (name, source) {
        var self = this;

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
        if (events !== null && typeof events === 'object') {
            for (var key in events) {
                if (events.hasOwnProperty(key)) {
                    this._events[key] = events[key];
                }
            }
        }
    };

    /**
     * Defines the helpers of a template
     * @param helpers
     */
    Kandybars.Template.prototype.helpers = function (helpers) {
        if (helpers !== null && typeof helpers === 'object') {
            for (var key in helpers) {
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
        var self = this;

        instanceCount += 1;

        options = extend({
            events: {},
            helpers: {},
            parent: null,
            partial: false,
            rendered: null
        }, options);

        var children = [];
        var id = 'kbti_' + instanceCount;
        var parent = options.parent;

        if (options.partial) {
            partials[id] = this;
        }

        if (parent instanceof Kandybars.TemplateInstance) {
            parent.getChildren().push(this);
        }

        /**
         * Attaches the event to the elements in the template
         * @param event
         * @param callback
         * @param node
         */
        self.attachEvent = function (event, callback, node) {
            if (typeof callback === 'function') {
                var events = event.split(',');

                for (var i = 0; i < events.length; i += 1) {
                    event = events[i];
                    var parts = event.split(' ', 2);
                    var action = parts[0];
                    var selector = parts[1];
                    var target = selector && node.filter(selector);

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
            for (var event in events) {
                if (events.hasOwnProperty(event)) {
                    self.attachEvent(event, events[event], node);
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
            return parent;
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
            if (typeof options.rendered === 'function') {
                options.rendered.call(self, self.compiled, self.getContext());
            }
            else if (typeof self.getTemplate().rendered === 'function') {
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

        var self = this;
        var context = self.getContext();
        var template = self.getTemplate();
        var source = template.getSource();

        // Generate template
        var tpl = Kandybars.replaceAll.call(self, source, context, options);

        if (self.isPartial()) {
            var partialId = self.getId();

            // Search first node
            var startIndex = tpl.indexOf('<');
            var closeIndex = tpl.indexOf('>', startIndex);

            if (startIndex === -1 || closeIndex === -1) {
                tpl = '<div data-partial-id="' + partialId + '">' + tpl + '</div>';
            } else {
                tpl = tpl.substr(0, closeIndex) + ' data-partial-id="' + partialId + '"' + tpl.substr(closeIndex);
            }
        }
        // Create a DOM version of the version
        else if (!options.html) {
            // Wrap template with jQuery
            if (typeof jQuery !== 'undefined') {
                tpl = jQuery(tpl);

                // Insert the template in the target
                if (options.target) {
                    jQuery(options.target).html(tpl);
                }

                var processPartial = function () {
                    var node = jQuery(this);
                    var partialId = node.attr('data-partial-id');
                    var partial = partials[partialId];

                    // Overwrite compiled result
                    partial.compiled = jQuery(this);

                    // Attach events
                    partial.attachEvents(partial.getEvents(), node);

                    // Execute rendered callback
                    partial._rendered();
                };

                // Search partial in root node
                tpl.filter('[data-partial-id]').each(processPartial);

                // Search partials in child nodes
                tpl.find('[data-partial-id]').each(processPartial);

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

    // Add jQuery selector in template instance
    if (typeof jQuery !== 'undefined') {
        Kandybars.TemplateInstance.prototype.$ = function (selector) {
            var tpl = jQuery(this.compiled);
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
        var __kbRes = undefined;

        if (typeof condition === 'string' && condition.length > 0) {
            // Remove carrier returns that could break evaluation
            condition = condition.replace(/\r|\n/g, '');
        }

        eval('__kbRes = ( ' + condition + ' );');

        return __kbRes;
    }

    /**
     * Merge objects
     * @return {*}
     */
    function extend() {
        for (var i = 1; i < arguments.length; i += 1) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    arguments[0][key] = arguments[i][key];
                }
            }
        }
        return arguments[0];
    }

    return Kandybars;
}));

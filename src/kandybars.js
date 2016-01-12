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

var Kandybars, Template = {};

(function ($) {
    'use strict';

    // Check jQuery dependency
    if (typeof $ !== 'function' || !jQuery) {
        throw new Error('jQuery not found');
    }

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
    var expressionPattern = /\{\{\#if ([^}]+)\}\}((?:(?!\{\{\#if)[\s\S])*?)\{\{\/if\}\}/g;
    var helperPattern = /\{\{([a-zA-Z0-9_]+) ([^}]+)\}\}/g;
    var pathPattern = /^(?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/;
    var partialPattern = /\{\{> *([^ }]+)( +[^}]+)*\}\}/g;
    var templatePattern = /<template[^>]*>([\s\S]*?)<\/template>/g;
    var templateNamePattern = /name="([^"]+)"/;
    var templateTagsPattern = /<template[^>]*>|<\/template>|/g;
    var valuePattern = /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;
    var varPattern = /\{\{((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}/g;
    var withPattern = /\{\{\#with ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}([\s\S]*?)\{\{\/with\}\}/g;

    var partials = {};
    var partialId = 0;

    /**
     * The Kandybars object
     * @param name
     * @return {Kandybars}
     * @constructor
     */
    Kandybars = {
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
         * Attaches the event to the elements in the template
         * @param event
         * @param fn
         * @param context
         * @param tpl
         * @param parent
         */
        attachEvent: function (event, fn, context, tpl, parent) {
            if (typeof fn === 'function') {
                var events = event.split(',');

                for (var i = 0; i < events.length; i += 1) {
                    event = events[i];
                    var parts = event.split(' ', 2);
                    var action = parts[0];
                    var selector = parts[1];
                    var target = selector && tpl.filter(selector);

                    // Check if root node is the target
                    if (target && target.length === 1) {
                        tpl = target;
                        selector = null;
                    }

                    (function (action, selector) {
                        // Attach event now and in the future
                        tpl.on(action, selector, function (ev) {
                            fn.call(context, ev, tpl, parent);
                        });
                    })(action, selector);
                }
            }
        },

        /**
         * Parses all events in the template
         * @param events
         * @param context
         * @param tpl
         * @param parent
         */
        attachEvents: function (events, context, tpl, parent) {
            for (var event in events) {
                if (events.hasOwnProperty(event)) {
                    Kandybars.attachEvent(event, events[event], context, tpl, parent);
                }
            }
        },

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
         * Loads a file
         * @param file
         * @param callback
         */
        loadFile: function (file, callback) {
            // Get file type
            var type = file.substr(file.lastIndexOf('.') + 1);

            $.ajax({
                method: 'GET',
                url: file,
                cache: Kandybars.cache,
                error: function (xhr, status, err) {
                    // Execute the callback
                    if (typeof callback === 'function') {
                        callback.call(Kandybars, new Error('Cannot load file : ' + file, err));
                    }
                },
                success: function (result) {
                    switch (type) {
                        case 'html':
                        case 'tpl':
                            // Get templates from file
                            Kandybars.parseTemplates(result);
                            break;
                    }

                    // Execute the callback
                    if (typeof callback === 'function') {
                        callback.call(Kandybars, null);
                    }
                }
            });
        },

        /**
         * Returns params from string
         * @example "number=123 string='abc' variable=val"
         * @param params
         * @param context
         * @return {{}}
         */
        parseParams: function (params, context) {
            var obj = {};

            if (typeof params === 'string') {
                var p = params.trim().split(' ');

                for (var i = 0; i < p.length; i += 1) {
                    var param = p[i].trim().split('=', 2);
                    var attr = param[0].trim();

                    if (attr === 'this') {
                        var value = Kandybars.parseValue(param[1], context);

                        if (typeof value === 'object') {
                            obj = $.extend({}, value, obj);
                        }
                    } else {
                        obj[attr] = Kandybars.parseValue(param[1], context);
                    }
                }
            }
            return obj;
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
         * @param context
         * @param parent
         * @return {*}
         */
        parseValue: function (value, context, parent) {
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

                value = Kandybars.resolvePath(value, context, parent);

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
            Kandybars.helpers[name] = callback;
        },

        /**
         * Replaces all dynamic elements
         * @param source
         * @param context
         * @param options
         * @return {string}
         */
        replaceAll: function (source, context, options) {
            if (context) {
                for (var k in context) {
                    if (context.hasOwnProperty(k) && typeof context[k] === 'function') {
                        context[k] = context[k].call(context);
                    }
                }
            }
            if (!options) {
                options = {};
            }
            source = Kandybars.replaceComments(source);
            source = Kandybars.replaceConditions(source, context, options.parent);
            source = Kandybars.replaceBlocks(source, context, options.parent);
            source = Kandybars.replacePartials(source, context, options.parent);
            source = Kandybars.replaceWith(source, context, options.parent);
            source = Kandybars.replaceHelpers(source, context, options.parent);
            source = Kandybars.replaceVars(source, context, options.parent);
            source = Kandybars.replaceTags(source);
            return source;
        },

        /**
         * Replaces all blocks
         * @param source
         * @param context
         * @param parent
         * @return {string}
         */
        replaceBlocks: function (source, context, parent) {
            return source.replace(blockPattern, function (match, path, html) {
                var object = Kandybars.resolvePath(path, context, parent);
                var result = '';

                if (object != null) {
                    if (object instanceof Array) {
                        for (var i = 0; i < object.length; i += 1) {
                            result += Kandybars.replaceAll(html.replace('{{@index}}', i), object[i], {parent: context});
                        }
                    }
                    else if (typeof object === 'object') {
                        for (var key in object) {
                            if (object.hasOwnProperty(key)) {
                                result += Kandybars.replaceAll(html.replace('{{@key}}', key), object[key], {parent: context});
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
        replaceComments: function (source) {
            return source.replace(commentPattern, '');
        },

        /**
         * Replaces all conditions
         * @param source
         * @param context
         * @param parent
         * @return {string}
         */
        replaceConditions: function (source, context, parent) {
            // Very greedy !!
            while (source.indexOf('{{#if') !== -1) {
                source = source.replace(expressionPattern, function (match, test, html) {
                    var result = '';

                    var parts = html.split('{{else}}');
                    html = parts[0];
                    var html2 = parts[1];

                    test = test.replace(valuePattern, function (match, variable) {
                        return Kandybars.parseValue(variable, context, parent);
                    });

                    if (evalCondition(test)) {
                        if (typeof html === 'string') {
                            result = Kandybars.replaceAll(html, context, {parent: parent});
                        }
                    } else if (typeof html2 === 'string') {
                        result = Kandybars.replaceAll(html2, context, {parent: parent});
                    }
                    return result;
                });
            }
            return source;
        },

        /**
         * Replaces all helpers
         * @param source
         * @param context
         * @param parent
         * @return {string}
         */
        replaceHelpers: function (source, context, parent) {
            return source.replace(helperPattern, function (match, name, args) {
                args = args.split(' ');

                for (var i = 0; i < args.length; i += 1) {
                    var value = Kandybars.parseValue(args[i], context, parent);

                    if (/^(["'])[^\1]+?\1$/.test(value)) {
                        value = value.substring(1, value.length - 1);
                    }
                    args[i] = value;
                }

                if (Kandybars.helpers[name] === undefined) {
                    throw 'Helper `' + name + '` does not exist';
                }

                // Get the helper value
                var result = Kandybars.helpers[name];

                // Get the value from a function
                if (typeof result === 'function') {
                    result = result.apply(context, args);
                }
                return result !== undefined && result !== null ? result : '';
            });
        },

        /**
         * Replaces all partials
         * @param source
         * @param context
         * @param parent
         * @return {string}
         */
        replacePartials: function (source, context, parent) {
            return source.replace(partialPattern, function (match, name, params) {
                var tmpl = Template[name];

                if (!tmpl) {
                    throw new Error('Partial `' + name + '` does not exist');
                }

                // Search first node
                var src = tmpl._source;
                var nodeIndex = src.indexOf('<');
                if (nodeIndex === -1) return '';

                // Find a place to put the partial id attribute
                var closeIndex = src.indexOf('>', nodeIndex);
                if (closeIndex === -1) return '';

                // Get partial params
                params = Kandybars.parseParams(params, context) || {};

                // Prepare partial context
                var ctx = $.extend({}, context, tmpl._helpers, params);

                partialId += 1;
                partials[partialId] = {
                    data: ctx,
                    events: tmpl._events,
                    helpers: tmpl._helpers,
                    name: name,
                    parent: parent,
                    rendered: tmpl.rendered
                };

                // Add the partial id attribute
                src = [
                    src.substr(0, closeIndex),
                    ' data-partial-id="', partialId, '"',
                    src.substr(closeIndex)
                ].join('');

                return Kandybars.replaceAll(src, ctx, {parent: parent});
            });
        },

        /**
         * Replaces all tags
         * @param source
         * @return {*}
         */
        replaceTags: function (source) {
            // Replace checked, disabled and selected tags
            return source.replace(/(?:disabled|checked|selected)=["'](?:false)?["']/gim, '');
        },

        /**
         * Replaces all variables
         * @param source
         * @param context
         * @param parent
         * @return {string}
         */
        replaceVars: function (source, context, parent) {
            return source.replace(varPattern, function (match, path) {
                var value = Kandybars.resolvePath(path, context, parent);
                var type = typeof value;

                if (value != null) {
                    if (type === 'string' || type === 'number' || type === 'boolean') {
                        return value;

                    } else if (type === 'object') {
                        return value.hasOwnProperty('toString') ? value.toString() : value;

                    } else if (type === 'function') {
                        return value(context, parent);
                    }
                    throw 'Cannot replace var `' + path + '` of type ' + type;
                }
                return '';
            });
        },

        /**
         * Replaces with blocks (custom scope)
         * @param source
         * @param context
         * @param parent
         * @return {string}
         */
        replaceWith: function (source, context, parent) {
            return source.replace(withPattern, function (match, path, html) {
                var object = Kandybars.resolvePath(path, context, parent);
                var result = '';

                if (object != null && typeof object === 'object') {
                    result = Kandybars.replaceAll(html, object, {parent: context});
                }
                return result;
            });
        },

        /**
         * Returns the generated template
         * @param name
         * @param context
         * @param options
         * @return {jQuery}
         */
        render: function (name, context, options) {
            if (!this.exists(name)) {
                throw('The template `' + name + '` does not exist');
            }

            // Create an instance of the template
            var tmpl = $.extend({}, Template[name]);

            // Prepare options
            options = $.extend(true, {
                events: tmpl._events,
                helpers: tmpl._helpers,
                name: name,
                parent: {},
                rendered: tmpl.rendered,
                target: null
            }, options);

            // Merge data and helpers
            context = $.extend({}, (context || {}), tmpl._helpers);

            return Kandybars.renderHTML(tmpl._source, context, options);
        },

        /**
         * Returns the generated template
         * @param source
         * @param context
         * @param options
         * @returns {jQuery}
         */
        renderHTML: function (source, context, options) {
            options = $.extend(true, {
                events: {},
                parent: {},
                rendered: null
            }, options);

            // Generate the template with data
            var tpl = $(Kandybars.replaceAll(source, context, options));

            // Insert the template in the target
            if (options.target) {
                $(options.target).html(tpl);
            }

            var processPartial = function () {
                var node = $(this);
                var partialId = node.attr('data-partial-id');
                var partial = partials[partialId];

                // Attach events
                Kandybars.attachEvents(partial.events, partial.data, node, partial.parent);

                // Execute rendered callback
                if (typeof partial.rendered === 'function') {
                    partial.rendered.call(node, partial.data);
                }
            };

            // Search partial in root node
            tpl.filter('[data-partial-id]').each(processPartial);

            // Search partials in child nodes
            tpl.find('[data-partial-id]').each(processPartial);

            // Attach events
            Kandybars.attachEvents(options.events, context, tpl, options.parent);

            // Execute rendered callback
            if (typeof options.rendered === 'function') {
                options.rendered.call(tpl, context);
            }
            return tpl;
        },

        /**
         * Returns the value of a path
         * @param path
         * @param context
         * @param parent
         * @return {*}
         */
        resolvePath: function (path, context, parent) {
            if (path != null && context != null) {
                if (!pathPattern.test(path)) {
                    return null;
                }
                if (path === 'this') {
                    return context;
                }

                var obj = context;

                if (path.indexOf('../') == 0) {
                    obj = parent;
                    path = path.substring(3);

                } else if (path.indexOf('this.') == 0) {
                    obj = context;
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
                                obj = obj.call(context);
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
     * Creates a template
     * @param name
     * @param source
     * @constructor
     */
    Kandybars.Template = function (name, source) {
        this._events = {};
        this._helpers = {};
        this._source = source;
        this.name = name;
        this.rendered = null;
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

}(jQuery));

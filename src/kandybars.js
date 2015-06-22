/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Karl STEIN
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

(function ($) {
    'use strict';

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
    var expressionPattern = /\{\{\#if ([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
    var helperPattern = /\{\{([a-zA-Z0-9_]+) ([^}]+)\}\}/g;
    var pathPattern = /^(?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/;
    var partialPattern = /\{\{> *([^}]+)\}\}/g;
    var templatePattern = /<template[^>]*>([\s\S]*?)<\/template>/g;
    var templateNamePattern = /name="([^"]+)"/;
    var templateTagsPattern = /<template[^>]*>|<\/template>|/g;
    var valuePattern = /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;
    var varPattern = /\{\{((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}/g;

    var partials = {};
    var partialId = 0;
    var templates = {};

    /**
     * The Kandybars object
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
         * Attaches the event to the elements in the template
         * @param event
         * @param fn
         * @param data
         * @param tpl
         */
        attachEvent: function (event, fn, data, tpl) {
            if (typeof fn === 'function') {
                var parts = event.split(' ', 2);
                var action = parts[0];
                var elements = parts[1] != null ? tpl.find(parts[1]) : tpl;
                elements.on(action, function (ev) {
                    fn.call(data, ev, tpl);
                });
            }
        },

        /**
         * Parses all events in the template
         * @param events
         * @param data
         * @param tpl
         */
        attachEvents: function (events, data, tpl) {
            for (var event in events) {
                if (events.hasOwnProperty(event)) {
                    Kandybars.attachEvent(event, events[event], data, tpl);
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
            return templates[name] = new Kandybars.Template(name, source);
        },

        /**
         * Checks if a template exists
         * @param name
         * @return {boolean}
         */
        exists: function (name) {
            return templates.hasOwnProperty(name);
        },

        /**
         * Returns the template
         * @param name
         * @return {Kandybars.Template}
         */
        getTemplate: function (name) {
            return templates[name];
        },

        /**
         * Loads a template
         * @param file
         * @param callback
         */
        load: function (file, callback) {
            $.ajax({
                url: file,
                dataType: 'html',
                cache: Kandybars.cache,
                success: function (html) {
                    // Find template tags
                    var models = Kandybars.parseTemplates(html);

                    if (models && models.length > 0) {
                        $.ajax({
                            url: file.replace(/\.(html|tpl)$/, '.js'),
                            dataType: 'script',
                            cache: Kandybars.cache,
                            complete: function () {
                                if (typeof callback === 'function') {
                                    callback.call(Kandybars, models);
                                }
                            }

                        });
                    }
                },
                error: function () {
                    throw('Error while loading template `' + file + '`');
                }
            });
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
         * @param parent
         * @return {*}
         */
        parseValue: function (value, data, parent) {
            if (value != null) {
                if (/^(['"'])[^\1]+?\1$/.test(value)) {
                    return value;
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

                value = Kandybars.resolvePath(value, data, parent);

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
                        value = '"' + value.replace('"', '\\"') + '"';
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
         * Replaces all dynamic elements in the source
         * @param source
         * @param data
         * @param parent
         * @return {string}
         */
        replaceAll: function (source, data, parent) {
            // Replace comments
            source = Kandybars.replaceComments(source);

            // Replace conditions
            source = Kandybars.replaceConditions(source, data, parent);

            // Replace blocks
            source = Kandybars.replaceBlocks(source, data, parent);

            // Replace partials
            source = Kandybars.replacePartials(source, data, parent);

            // Replace helpers
            source = Kandybars.replaceHelpers(source, data, parent);

            // Replace variables
            source = Kandybars.replaceVars(source, data, parent);

            // Replace tags
            source = Kandybars.replaceTags(source);

            return source;
        },

        /**
         * Replaces all blocks in the source
         * @param source
         * @param data
         * @param parent
         * @return {string}
         */
        replaceBlocks: function (source, data, parent) {
            return source.replace(blockPattern, function (match, path, html) {
                var object = Kandybars.resolvePath(path, data, parent);
                var result = '';

                if (object != null) {
                    if (object instanceof Array) {
                        for (var i = 0; i < object.length; i += 1) {
                            result += Kandybars.replaceAll(html.replace('{{@index}}', i), object[i], data);
                        }
                    }
                    else if (typeof object === 'object') {
                        for (var key in object) {
                            if (object.hasOwnProperty(key)) {
                                result += Kandybars.replaceAll(html.replace('{{@key}}', key), object[key], data);
                            }
                        }
                    }
                }
                return result;
            });
        },

        /**
         * Replaces all comments in the source
         * @param source
         * @return {string}
         */
        replaceComments: function (source) {
            return source.replace(commentPattern, '');
        },

        /**
         * Replaces all conditions in the source
         * @param source
         * @param data
         * @param parent
         * @return {string}
         */
        replaceConditions: function (source, data, parent) {
            return source.replace(expressionPattern, function (match, condition, html, html2) {
                var result = '';

                condition = condition.replace(valuePattern, function (match, variable) {
                    return Kandybars.parseValue(variable, data, parent);
                });

                if (evalCondition(condition)) {
                    if (typeof html === 'string') {
                        result = Kandybars.replaceAll(html, data, parent);
                    }
                } else if (typeof html2 === 'string') {
                    result = Kandybars.replaceAll(html2, data, parent);
                }
                return result;
            });
        },

        /**
         * Replaces all helpers in the source
         * @param source
         * @param data
         * @param parent
         * @return {string}
         */
        replaceHelpers: function (source, data, parent) {
            return source.replace(helperPattern, function (match, name, args) {
                args = args.split(' ');

                for (var i = 0; i < args.length; i += 1) {
                    var value = Kandybars.parseValue(args[i], data, parent);

                    if (/^(["'])[^\1]+?\1$/.test(value)) {
                        value = value.substring(1, value.length - 1);
                    }
                    args[i] = value;
                }

                var helper = Kandybars.helpers[name];

                if (helper === undefined) {
                    throw 'Helper `' + name + '` does not exist';
                }

                var result;

                if (typeof helper === 'function') {
                    result = Kandybars.helpers[name].apply(data, args);
                } else {
                    result = Kandybars.helpers[name];
                }
                return result !== undefined && result !== null ? result : '';
            });
        },

        /**
         * Replaces all partials in the source
         * @param source
         * @param data
         * @param parent
         * @return {string}
         */
        replacePartials: function (source, data, parent) {
            return source.replace(partialPattern, function (match, name) {
                var partial = templates[name];

                if (partial) {
                    var source = partial._source;
                    var ctx = $.extend(true, {}, data, partial._helpers);
                    var node = $(Kandybars.replaceAll(source, ctx, parent));

                    if (node && node.length > 0) {
                        partialId += 1;
                        partials[partialId] = {
                            events: partial._events,
                            rendered: Template[name].rendered,// todo sup ?
                            source: source,
                            context: data,
                            parent: parent,
                            name: name
                        };
                        node.attr('data-partial-id', partialId);
                        return node[0].outerHTML;
                    }
                    return '';
                }
                throw 'Partial `' + name + '` does not exist';
            });
        },

        /**
         * Replaces all empty tags
         * @param source
         * @return {*}
         */
        replaceTags: function (source) {
            // Replace checked, disabled and selected tags
            source = source.replace(/(?:disabled|checked|selected)=["'](?:false)?["']/gim, '');
            return source;
        },

        /**
         * Replaces all variables in the source
         * @param source
         * @param data
         * @param parent
         * @return {string}
         */
        replaceVars: function (source, data, parent) {
            return source.replace(varPattern, function (match, path) {
                var value = Kandybars.resolvePath(path, data, parent);
                var type = typeof value;

                if (value != null) {
                    if (type === 'string' || type === 'number' || type === 'boolean') {
                        return value;

                    } else if (type === 'object') {
                        return value.hasOwnProperty('toString') ? value.toString() : value;

                    } else if (type === 'function') {
                        return value(data, parent);
                    }
                    throw 'Cannot replace var `' + path + '` of type ' + type;
                }
                return '';
            });
        },

        /**
         * Returns the template generated with data
         * @param name
         * @param data
         * @param options
         * @return {jQuery}
         */
        render: function (name, data, options) {
            var template = templates[name];

            if (templates[name]) {
                if (typeof data !== 'object') {
                    data = {};
                }

                var source = templates[name]._source;

                // Merges data and helpers
                var ctx = $.extend(true, {}, data, template._helpers);

                // Define default options
                options = $.extend(true, {
                    events: template._events,
                    rendered: Template[name].rendered,// todo sup ?
                    name: name,
                    parent: null,
                    target: null
                }, options);

                return Kandybars.renderHTML(source, ctx, options);
            }
            throw('The template `' + name + '` does not exist');
        },

        /**
         * Generate a template form HTML source
         * @param source
         * @param data
         * @param options
         * @returns {jQuery}
         */
        renderHTML: function (source, data, options) {
            options = options || {
                    parent: null,
                    name: null
                };

            // Wrap the template in a jQuery element
            var tpl = $(Kandybars.replaceAll(source, data, options.parent));

            if (options && options.target) {
                $(options.target).html(tpl);
            }

            tpl.find('[data-partial-id]').each(function () {
                var self = $(this);
                var partialId = self.attr('data-partial-id');
                var partial = partials[partialId];
                Kandybars.attachEvents(partial.events, partial.context, self);
                Kandybars.rendered(self, partial.context, partial.rendered);
            });

            if (options) {
                Kandybars.attachEvents(options.events, data, tpl);
                Kandybars.rendered(tpl, data, options.rendered);
            }
            return tpl;
        },

        /**
         * Executes the rendered callback on the template
         * @param tpl
         * @param data
         * @param callback
         */
        rendered: function (tpl, data, callback) {
            if (typeof callback === 'function') {
                callback.call(tpl, data);
            }
        },

        /**
         * Returns the value of a path
         * @param path
         * @param data
         * @param parent
         * @return {*}
         */
        resolvePath: function (path, data, parent) {
            if (path != null && data != null) {
                if (!pathPattern.test(path)) {
                    return null;
                }
                if (path === 'this') {
                    return data;
                }

                var obj = data;

                if (path.indexOf('../') == 0) {
                    obj = parent;
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
     * The error handler
     * @param xhr
     * @param status
     * @param code
     */
    Kandybars.errorHandler = function (xhr, status, code) {
        console.error(xhr.status + ' ' + xhr.statusText);
    };

    /**
     * Creates a template
     * @param name
     * @param source
     * @return {Kandybars.Template}
     * @constructor
     */
    Kandybars.Template = function (name, source) {
        this._events = {};
        this._helpers = {};
        this._source = source;
        this.name = name;

        if (!window.Template) {
            window.Template = {};
        }
        return window.Template[name] = this;
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
     * Returns the generated version of the template using data
     * @param data
     * @param options
     * @return {jQuery}
     */
    Kandybars.Template.prototype.render = function (data, options) {
        return Kandybars.render(this.name, data, options);
    };

    /**
     * Returns the value of the condition
     * @param condition
     * @return {*}
     */
    function evalCondition(condition) {
        var __kbRes = undefined;
        eval('__kbRes = ( ' + condition + ' );');
        return __kbRes;
    }

    window.Kandybars = Kandybars;

}(jQuery));
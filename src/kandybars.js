/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Karl STEIN
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
    var conditionPattern = /\{\{\#if ([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))\{\{\/if\}\}/g;
    var helperPattern = /\{\{([a-zA-Z0-9_]+) ([^}]+)\}\}/g;
    var pathPattern = /^(?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/;
    var partialPattern = /\{\{> ([^}]+)\}\}/g;
    var regExpPattern = /([.*+?^${}()|\[\]\/\\])/g;
    var templatePattern = /<template[^>]*>([\s\S]*?)<\/template>/g;
    var templateNamePattern = /name="([^"]+)"/;
    var templateTagsPattern = /<template[^>]*>|<\/template>|/g;
    var valuePattern = /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;
    var varPattern = /\{\{((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}/g;


    var compiledPartials = {};
    var compiledTemplates = {};
    var partials = {};
    var partialId = 0;
    var templates = {};


    /**
     *
     * @param name
     * @return {Kandybars}
     * @constructor
     */
    var Kandybars = {};

    /**
     * The base path of all templates
     * @type {string}
     */
    Kandybars.basePath = 'pages';

    Kandybars.helpers = {};

    /**
     * The rendered callback
     * @type {function}
     */
    Kandybars.rendered = null;

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
        this._compiled = null;
        this._events = {};
        this._helpers = {};
        this._source = source;
        this.name = name;
        this.rendered = null;
        if (!window.Kandybar) {
            window.Kandybar = {};
        }
        return window.Kandybar[name] = this;
    };

    /**
     * Defines the events of a template
     * @param events
     */
    Kandybars.Template.prototype.events = function (events) {
        $.extend(true, this._events, events);
    };

    /**
     * Defines the helpers of a template
     * @param helpers
     */
    Kandybars.Template.prototype.helpers = function (helpers) {
        $.extend(true, this._helpers, helpers);
    };

    /**
     * Returns the generated version of the template using data
     * @param data
     * @return {jQuery}
     */
    Kandybars.Template.prototype.render = function (data) {
        return Kandybars.render(this.name, data);
    };

    /**
     * Compile the source
     * @param source
     * @return {function}
     */
    Kandybars.compile = function (source) {
        // todo
    };

    /**
     * Creates and register a new template
     * @param name
     * @param source
     * @return {Kandybars.Template}
     */
    Kandybars.create = function (name, source) {
        return templates[name] = new Kandybars.Template(name, source);
    };

    /**
     * Loads a template
     * @param path
     * @param callback
     */
    Kandybars.load = function (path, callback) {
        $.ajax({
            url: Kandybars.basePath + '/' + path + '/page.html',
            dataType: 'html',
            cache: false,
            success: function (html) {
                // Scans template tags
                var models = html.match(templatePattern);

                for (var i in models) {
                    if (models.hasOwnProperty(i)) {
                        var model = models[i];
                        var name = model.match(templateNamePattern)[1];
                        var source = model.replace(templateTagsPattern, '');

                        // Creates the template
                        Kandybars.create(name, source);
                    }
                }

                if (models && models.length > 0) {
                    $.ajax({
                        url: Kandybars.basePath + '/' + path + '/script.js',
                        dataType: 'script',
                        cache: false,
                        complete: function (response) {
                            if (typeof callback === 'function') {
                                callback.call(templates[name]);
                            }
                        }

                    });
                }
            },
            error: function () {
                throw('Error while loading template `' + path + '`');
            }
        });
    };

    /**
     *
     * @param string
     * @return {XML|string|void}
     */
    function escapeRegExp(string) {
        return string.replace(regExpPattern, '\\$1');
    }

    /**
     * Parses and attach the event to the corresponding elements
     * in the template
     * @param event
     * @param fn
     * @param context
     * @param tpl
     */
    Kandybars.parseEvent = function (event, fn, context, tpl) {
        if (typeof fn === 'function') {
            var parts = event.split(' ', 2);
            var action = parts[0];
            var target = parts[1] ? tpl.find(parts[1]) : tpl;
            target.on(action, function (ev) {
                fn.call(context, ev, tpl);
            });
        }
    };

    /**
     * Parses all events in the template
     * @param events
     * @param context
     * @param tpl
     */
    Kandybars.parseEvents = function (events, context, tpl) {
        for (var event in events) {
            if (events.hasOwnProperty(event)) {
                Kandybars.parseEvent(event, events[event], context, tpl);
            }
        }
    };

    /**
     * Returns the parsed value
     * @param value
     * @param context
     * @param parent
     * @return {*}
     */
    Kandybars.parseValue = function (value, context, parent) {
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
                    value = '"' + value.replace('"', '\\"') + '"';
                }
            }
        }
        return value;
    };

    /**
     * Registers a helper
     * @param name
     * @param callback
     */
    Kandybars.registerHelper = function (name, callback) {
        Kandybars.helpers[name] = callback;
    };

    /**
     * Replaces all dynamic elements in the source
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceAll = function (source, context, parent) {
        // Replace comments
        source = Kandybars.replaceComments(source, context);

        // Replace conditions
        source = Kandybars.replaceConditions(source, context, parent);

        // Replace blocks
        source = Kandybars.replaceBlocks(source, context, parent);

        // Replace partials
        source = Kandybars.replacePartials(source, context, parent);

        // Replace helpers
        source = Kandybars.replaceHelpers(source, context, parent);

        // Replace variables
        source = Kandybars.replaceVars(source, context, parent);

        return source;
    };

    /**
     * Replaces all blocks in the source
     * todo support nested blocks
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceBlocks = function (source, context, parent) {
        return source.replace(blockPattern, function (match, block, html) {
            var value = Kandybars.resolvePath(block, context, parent);

            if (value != null) {
                if (value instanceof Array) {
                    var list = '';

                    for (var i in value) {
                        if (value.hasOwnProperty(i)) {
                            list += Kandybars.replaceAll(html, value[i], context);
                        }
                    }
                    return list;
                }
            }
            return '';
        });
    };

    /**
     * Replaces all comments in the source
     * @param source
     * @param context
     * @return {string}
     */
    Kandybars.replaceComments = function (source, context) {
        return source.replace(commentPattern, '');
    };

    /**
     * Replaces all conditions in the source
     * todo support nested conditions
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceConditions = function (source, context, parent) {
        return source.replace(conditionPattern, function (match, condition, html, html2) {
            var result = false;

            condition = condition.replace(valuePattern, function (match, variable) {
                return Kandybars.parseValue(variable, context, parent);
            });

            result = evalCondition(condition);

            return result ? html : html2;
        });
    };

    /**
     * Replaces all helpers in the source
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceHelpers = function (source, context, parent) {
        return source.replace(helperPattern, function (match, helper, args) {
            args = args.split(' ');

            for (var i = 0; i < args.length; i += 1) {
                var value = Kandybars.parseValue(args[i], context, parent);

                if (/^(["'])[^\1]+?\1$/.test(value)) {
                    value = value.substring(1, value.length - 1);
                }
                args[i] = value;
            }

            if (Kandybars.helpers[helper]) {
                var result = Kandybars.helpers[helper].apply(context, args);
                return result !== undefined ? result : '';
            }
            throw 'Helper `' + helper + '` does not exist';
        });
    };

    /**
     * Replaces all partials in the source
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replacePartials = function (source, context, parent) {
        return source.replace(partialPattern, function (match, partial) {
            if (templates[partial]) {
                partialId += 1;

                partials[partialId] = {
                    source: source,
                    context: context,
                    parent: parent,
                    name: partial
                };

                var result = Kandybars.render(partial, context, {parent: parent});
                result.attr('data-partial-id', partialId);

                return result && result[0] ? result[0].outerHTML : '';
            }
            throw 'Partial `' + partial + '` does not exist';
        });
    };

    /**
     * Replaces all variables in the source
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceVars = function (source, context, parent) {
        return source.replace(varPattern, function (match, variable) {
            var value = Kandybars.resolvePath(variable, context, parent);
            var type = typeof value;

            if (value != null) {
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    return value;
                }
                else if (type === 'object') {
                    return value.hasOwnProperty('toString') ? value.toString() : value;
                }
                throw 'Cannot replace var `' + variable + '` of type ' + type;
            }
            return '';
        });
    };

    /**
     * Returns the template generated with data
     * @param name
     * @param data
     * @param options
     * @return {jQuery}
     */
    Kandybars.render = function (name, data, options) {
        var bench = new Date().getTime();

        if (!templates[name]) {
            throw('The template `' + name + '` does not exist');
        }

        if (typeof data !== 'object') {
            data = {};
        }

        var template = templates[name];
        var source = templates[name]._source;

        // Merges data and helpers
        var helpers = $.extend(true, {}, data, template._helpers);

        // Define default options
        options = $.extend(true, {
            events: template._events,
            rendered: template.rendered,
            name: name,
            parent: null
        }, options);

        return Kandybars.renderHTML(source, helpers, options);
    };

    /**
     * Generate a template form HTML source
     * @param source
     * @param data
     * @param options
     * @returns {jQuery}
     */
    Kandybars.renderHTML = function (source, data, options) {
        options = options || {
            parent: null,
            name: null
        };

        source = Kandybars.replaceAll(source, data, options.parent);

        var tpl;

        // Wrap the template in a jQuery element
        tpl = $(source);

        // Execute the general callback
        if (typeof Kandybars.rendered === 'function') {
            Kandybars.rendered.call(tpl, data);
        }

        for (var partialId in partials) {
            if (partials.hasOwnProperty(partialId)) {
                var partial = partials[partialId];
                var template = templates[partial.name];
                var partialTpl = tpl.find('[data-partial-id=' + partialId + ']');

                if (partialTpl && partialTpl.length > 0) {
                    var events = template._events;
                    Kandybars.parseEvents(events, partial.context, partialTpl);
                }
            }
        }

        if (options) {
            if (typeof options.rendered === 'function') {
                options.rendered.call(tpl, data);
            }
            if (options.events) {
                Kandybars.parseEvents(options.events, data, tpl);
            }
        }
        return tpl;
    };

    /**
     * Returns the value of a path
     * @param path
     * @param context
     * @param parent
     * @return {*}
     */
    Kandybars.resolvePath = function (path, context, parent) {
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
            }
            else if (path.indexOf('this.') == 0) {
                obj = context;
                path = path.substring(5);
            }

            if (obj != null) {
                var parts = path.split('.');
                var depth = parts.length;

                for (var i = 0; i < depth; i += 1) {
                    if (obj != null && obj.hasOwnProperty(parts[i])) {
                        obj = obj[parts[i]];

                        if (obj != null && typeof obj === 'function') {
                            obj = obj.call(context);
                        }
                    }
                    else {
                        obj = null;
                        break;
                    }
                }
                return obj;
            }
        }
        return null;
    };

    /**
     * Returns the value of the condition
     * @param condition
     * @return {*}
     */
    function evalCondition(condition) {
        var _result_;
        eval('_result_ = ( ' + condition + ' );');
        return _result_;
    }

    window.Kandybars = Kandybars;

}(jQuery));
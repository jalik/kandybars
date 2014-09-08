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


    var templates = {};
    var partials = {};


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
                var models = html.match(/<template[^>]*>([\s\S]*?)<\/template>/g);

                for (var i in models) {
                    if (models.hasOwnProperty(i)) {
                        var model = models[i];
                        var name = model.match(/name="([^"]+)"/)[1];
                        var source = model.replace(/<template[^>]*>|<\/template>|/g, '');

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
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
    }

    /**
     * Registers a helper
     *
     * @param name
     * @param callback
     */
    Kandybars.registerHelper = function (name, callback) {
        Kandybars.helpers[name] = callback;
    };

    /**
     *
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
     *
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceBlocks = function (source, context, parent) {
        var pattern = /\{\{\#each ([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g;

        return source.replace(pattern, function (match, block, html) {
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
     *
     * @param source
     * @param context
     * @return {string}
     */
    Kandybars.replaceComments = function (source, context) {
        var pattern = /\{\{\![^}]+?\}\}/g;

        return source.replace(pattern, '');
    };

    /**
     * Replaces all conditions in the source
     * todo support nested conditions
     *
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceConditions = function (source, context, parent) {
        var pattern = /\{\{\#if ([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))\{\{\/if\}\}/g;
        var varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;//todo support parent (../)

        return source.replace(pattern, function (match, condition, html, html2) {
            var result = false;

            condition = condition.replace(varPattern, function (match, variable) {
                return Kandybars.resolveValue(variable, context, parent);
            });

            (function () {
                eval('result = ( ' + condition + ' );');
            })();

            return result ? html : html2;
        });
    };

    /**
     * Replaces all helpers in the source
     *
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceHelpers = function (source, context, parent) {
        var pattern = /\{\{([a-zA-Z0-9_]+) ([^}]+)\}\}/g;

        return source.replace(pattern, function (match, helper, args) {
            args = args.split(' ');

            for (var i = 0; i < args.length; i += 1) {
                args[i] = Kandybars.resolveValue(args[i], context, parent);

                if (/^(["'])[^\1]+?\1$/.test(args[i])) {
                    args[i] = args[i].substring(1, args[i].length - 1);
                }
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
     *
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replacePartials = function (source, context, parent) {
        var pattern = /\{\{> ([^}]+)\}\}/;

        return source.replace(pattern, function (match, partial) {
            if (templates[partial]) {
                var partialId = new Date().getTime();

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
     *
     * @param source
     * @param context
     * @param parent
     * @return {string}
     */
    Kandybars.replaceVars = function (source, context, parent) {
        var pattern = /\{\{((?:\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}\}/g;

        return source.replace(pattern, function (match, variable) {
            var value = Kandybars.resolvePath(variable, context, parent);
            var type = typeof value;

            if (value != null) {
                if (type === 'string' || type === 'number') {
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
     *
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

        var html = Kandybars.renderHTML(source, helpers, options);

//        console.log(name + ' generated in ' + (new Date().getTime() - bench) + ' ms');

        return html;
    };

    /**
     * Génère un template à partir de code HTML
     *
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
                    for (var event in events) {
                        if (events.hasOwnProperty(event)) {
                            (function (evts, ctx, tpl) {
                                var fn = evts[event];

                                if (typeof fn === 'function') {
                                    var eventParts = event.split(' ', 2);
                                    var action = eventParts[0];
                                    var target = eventParts[1] ? tpl.find(eventParts[1]) : tpl;

                                    target.on(action, function (ev) {
                                        fn.call(ctx, ev, tpl);
                                    });
                                }
                            })(events, partial.context, partialTpl);
                        }
                    }
                }
            }
        }

        if (options) {
            // Exécute la méthode rendered
            if (typeof options.rendered === 'function') {
                options.rendered.call(tpl, data);
            }

            // Ajout de la couche évènementielle
            if (options.events) {
                for (var event in options.events) {
                    if (options.events.hasOwnProperty(event)) {
                        (function (events) {
                            var fn = events[event];

                            if (typeof fn === 'function') {
                                var eventParts = event.split(' ', 2);
                                var action = eventParts[0];
                                var target = eventParts[1] ? tpl.find(eventParts[1]) : tpl;

                                target.on(action, function (ev) {
                                    fn.call(data, ev, tpl);
                                });
                            }
                        })(options.events);
                    }
                }
            }
        }
        return tpl;
    };

    /**
     * Returns the value of a path
     *
     * @param path
     * @param context
     * @param parent
     * @return {*}
     */
    Kandybars.resolvePath = function (path, context, parent) {
        if (path != null && context != null) {
            if (path === 'this') {
                return context;
            }

            var obj = context;

            if (/^\.\.\//.test(path)) {
                obj = parent;
                path = path.substring(3);
            }
            else if (/^this\./.test(path)) {
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
     * Returns the value parsed
     *
     * @param value
     * @param context
     * @param parent
     * @return {*}
     */
    Kandybars.resolveValue = function (value, context, parent) {
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

    window.Kandybars = Kandybars;

}(jQuery));
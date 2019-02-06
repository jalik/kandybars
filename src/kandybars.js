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
 * FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import extend from '@jalik/extend';
import Patterns from './patterns';
import reservedWords from './reserved-words';
import Template from './template';

const Kandybars = {
  /**
   * The built-in helpers
   * @type {*}
   */
  helpers: {},

  /**
   * The templates
   * @type: {*}
   */
  templates: {},

  /**
   * Registers a template
   * @deprecated
   * @param name
   * @param source
   * @return {Template}
   */
  create(name, source) {
    // eslint-disable-next-line no-console
    console.warn('deprecated method Kandybars.create(), use Kandybars.registerTemplate() instead');
    return this.registerTemplate(name, source);
  },

  /**
   * Returns the value of the condition
   * @param condition
   * @return {*}
   */
  evalCondition(condition) {
    // eslint-disable-next-line
    let kbRes = undefined;
    let expression = condition;

    if (typeof expression === 'string' && expression.length > 0) {
      // Remove carrier returns that could break evaluation
      expression = expression.replace(/[\r\n]/g, '');
    }

    // eslint-disable-next-line
    eval(`kbRes = ( ${expression} );`);

    return kbRes;
  },

  /**
   * Checks if a template exists
   * @deprecated
   * @param name
   * @return {boolean}
   */
  exists(name) {
    // eslint-disable-next-line
    console.warn('deprecated method Kandybars.exists(), use Kandybars.isTemplate() instead');
    return this.isTemplate(name);
  },

  /**
   * Returns block arguments from string
   * @param string
   * @return {Array}
   */
  fetchBlockArguments(string) {
    const args = [];
    let argsString = string;

    if (typeof argsString === 'string' && argsString.length) {
      argsString = argsString.trim();
    }

    const split = argsString.split(' ');

    for (let a = 0; a < split.length; a += 1) {
      const firstChar = split[a][0];
      let lastChar = split[a].slice(-1);

      if ((firstChar === '"' || firstChar === '\'')
        && (firstChar !== lastChar || (`\\${lastChar}`) === split[a].slice(-2))) {
        const merge = [split[a]];

        for (let b = a + 1; b < split.length; b += 1) {
          lastChar = split[b].slice(-1);
          merge.push(split[b]);

          // Check if last char matches first char and is not escaped
          if (lastChar === firstChar && (`\\${lastChar}`) !== split[b].slice(-2)) {
            a = b;
            args.push(merge.join(' '));
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
   * Returns "each" blocks
   * @param src
   * @return {Array}
   */
  findBlocks(src) {
    const blocks = [];
    const startIndexes = [];
    const endIndexes = [];
    const tags = [];
    let startIndex = -1;
    let endIndex = -1;

    do {
      startIndex = src.indexOf('{{#each', startIndex + 1);

      if (startIndex !== -1) {
        startIndexes.push(startIndex);
        tags.push({ index: startIndex, isStart: true });
      }
    } while (startIndex !== -1);

    do {
      endIndex = src.indexOf('{{/each}}', endIndex + 1);

      if (endIndex !== -1) {
        endIndexes.push(endIndex);

        for (let i = 0; i <= tags.length; i += 1) {
          if (i >= tags.length) {
            tags.push({ index: endIndex, isStart: false });
            break;
          } else if (endIndex < tags[i].index && i > 0) {
            tags.splice(i, 0, { index: endIndex, isStart: false });
            break;
          }
        }
      }
    } while (endIndex !== -1);

    // Check coherence
    if (startIndexes.length > endIndexes.length) {
      throw new Error('Missing closing {{/each}} somewhere');
    } else if (startIndexes.length < endIndexes.length) {
      throw new Error('Missing opening {{#each ..}} somewhere');
    }

    // Extract blocks contents
    for (let i = 1; i < tags.length; i += 1) {
      if (!tags[i].isStart && tags[i - 1].isStart) {
        const contentIndex = src.indexOf('}}', tags[i - 1].index) + 2;
        const source = src.substring(tags[i - 1].index, tags[i].index + 9);
        const content = src.substr(contentIndex, tags[i].index - contentIndex);
        const args = src.substring(tags[i - 1].index + 7, contentIndex - 2);
        blocks.push({
          fromIndex: tags[i - 1].index,
          toIndex: tags[i].index,
          arguments: args.trim(),
          content,
          source,
        });
        // Remove indexes from list
        tags.splice(i - 1, 2);
        i = 0;
      }
    }

    // Removes child blocks
    for (let i = 0; i < blocks.length; i += 1) {
      for (let j = 0; j < blocks.length; j += 1) {
        if (blocks[j].fromIndex > blocks[i].fromIndex
          && blocks[j].toIndex < blocks[i].toIndex) {
          blocks.splice(j, 1);
        }
      }
    }

    return blocks;
  },

  /**
   * Returns the template
   * @param name
   * @return {Template}
   */
  getTemplate(name) {
    return this.templates[name];
  },

  /**
   * Checks if helper exists
   * @param name
   * @return {boolean}
   */
  isHelper(name) {
    return typeof this.helpers[name] !== 'undefined'
      && typeof this.helpers[name] === 'function';
  },

  /**
   * Checks if template exists
   * @param name
   * @return {boolean}
   */
  isTemplate(name) {
    return typeof this.templates[name] !== 'undefined'
      && this.templates[name] instanceof Template;
  },

  /**
   * Loads a file
   * @param url
   * @param callback
   */
  loadFile(url, callback) {
    // Get file type
    const fileType = url.substr(url.lastIndexOf('.') + 1);

    // Prepare HTTP request
    const req = new XMLHttpRequest();
    // todo return cached version of the URL

    // Error callback
    req.onerror = (ev) => {
      if (typeof callback === 'function') {
        callback.call(this, new Error(`Cannot load file : ${url}`, ev.target.status));
      }
    };

    // State changed callback
    req.onreadystatechange = () => {
      if (req.readyState === 4) {
        if (req.status === 200) {
          switch (fileType) {
            case 'js':
              // Evaluate JavaScript
              // eslint-disable-next-line no-eval
              eval(req.responseText);
              break;
            case 'html':
            case 'hbml':
            case 'kbml':
            case 'tpl':
              // Get templates from file
              this.parseTemplates(req.responseText);
              break;
            default:
          }
          // Execute the callback
          if (typeof callback === 'function') {
            callback.call(this, null);
          }
        } else if (typeof callback === 'function') {
          // Execute the callback
          callback.call(this, new Error(`Cannot load file : ${url}`));
        }
      }
    };

    // Prepare async request
    req.open('GET', url, true);

    // Avoid browser to parse HTML content
    switch (fileType) {
      case 'html':
      case 'hbml':
      case 'kbml':
      case 'tpl':
        req.overrideMimeType('text/plain');
        break;
      default:
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

    if (typeof text === 'string') {
      const p = text.trim().split(' ');

      for (let i = 0; i < p.length; i += 1) {
        const param = p[i].trim().split('=', 2);
        const attr = param[0].trim();

        if (attr === 'this') {
          const value = this.parseValue(param[1], data, options);

          if (typeof value === 'object' && value !== null) {
            params = extend({}, value, params);
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
    // eslint-disable-next-line no-console
    console.warn('deprecated method Kandybars.parseHelperArguments(), use Kandybars.parseBlockArguments() instead');
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
    // eslint-disable-next-line no-console
    console.warn('deprecated method Kandybars.parseHelperParams(), use Kandybars.parseBlockParams() instead');
    return this.parseBlockParams(text, data, options);
  },

  /**
   * Search and creates templates found in the HTML code
   * @param html
   * @return {object}
   */
  parseTemplates(html) {
    const templates = { length: 0 };
    const matches = html.match(Patterns.templateRegExp);

    for (let i = 0; i < matches.length; i += 1) {
      const template = matches[i];
      const nameMatch = template.match(/name=(["'])([^"]+)\1/);
      const name = nameMatch && nameMatch[2];

      // Check template name
      if (typeof name !== 'string' || name.length === 0) {
        throw new SyntaxError('Missing "name" attribute for <template>');
      }
      if (name === 'length') {
        throw new SyntaxError('Value of "name" attribute for <template> cannot be "length"');
      }

      // Remove template tags
      const src = template.replace(Patterns.templateTagsRegExp, '');

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
    let newVal = value;

    if (typeof newVal === 'string') {
      // Ignore string (ex: "test")
      if (/^(['"])[^\1]+?\1$/.test(newVal)) {
        // Remove quotes
        return newVal.substr(1, newVal.length - 2);
      }
      // Ignore operator
      if (['+', '-', '*', '/'].indexOf(newVal) !== -1) {
        return newVal;
      }
      // Boolean
      if (/^true$/i.test(newVal)) {
        return true;
      }
      if (/^false$/i.test(newVal)) {
        return false;
      }
      // Float
      if (/^[+-]?[0-9]*[.,][0-9]+$/.test(newVal)) {
        return parseFloat(newVal.replace(',', '.'));
      }
      // Integer
      if (/^[+-]?(?:[0-9]+|Infinity)$/.test(newVal)) {
        return Number.parseInt(newVal, 10);
      }
      // Ignore reserved word
      if (reservedWords.indexOf(newVal) !== -1) {
        return newVal;
      }
      // Resolve path
      if (Patterns.contextPathRegExp.test(newVal)) {
        newVal = this.resolvePath(newVal, data, options);

        if (typeof newVal === 'string') {
          newVal = `"${newVal.replace(/"/g, '\\"')}"`;
        }
      }
    }
    return newVal;
  },

  /**
   * Registers a helper
   * @param name
   * @param callback
   */
  registerHelper(name, callback) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Helper name must be a string');
    }
    if (!/^[a-zA-Z_]+[a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Helper name is not valid: ${name}`);
    }
    if (typeof callback !== 'function') {
      throw new Error('Helper callback must be a function');
    }
    if (this.isHelper(name)) {
      // eslint-disable-next-line no-console
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
    this.templates[name] = new Template(name, html);
    return this.templates[name];
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
    const template = new Template(name, html);
    const tpl = template.createInstance(data, options);
    return tpl.render(options);
  },

  /**
   * Replaces all templating elements
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replaceAll(source, data, options) {
    let src = source;
    const opt = options || {};
    const ctx = data;

    if (typeof ctx === 'object') {
      const dataKeys = Object.keys(ctx);
      const dataKeysLength = dataKeys.length;

      for (let i = 0; i < dataKeysLength; i += 1) {
        const key = dataKeys[i];

        if (typeof ctx[key] === 'function') {
          ctx[key] = ctx[key].call(ctx);
        }
      }
    }

    src = this.replaceComments(src);
    src = this.replaceConditions(src, ctx, opt);
    src = this.replaceBlocks(src, ctx, opt);
    src = this.replacePartials(src, ctx, opt);
    src = this.replaceWith(src, ctx, opt);
    src = this.replaceEvals(src, ctx, opt);
    src = this.replaceHelpers(src, ctx, opt);
    src = this.replaceVariables(src, ctx, opt);
    src = this.replaceAttributes(src);
    return src;
  },

  /**
   * Replaces all attributes
   * @param source
   * @return {string}
   */
  replaceAttributes(source) {
    // Remove false states (checked, disabled and selected)
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
    let src = source;
    const blocks = this.findBlocks(src);

    for (let b = 0; b < blocks.length; b += 1) {
      // Parse arguments
      const args = blocks[b].arguments;
      const html = blocks[b].content;
      let object;

      blocks[b].result = '';

      if (/^[^ ]+ in [^ ]+$/.test(args)) {
        // todo expose context in a variable (ex: each item in items)
      } else if (Patterns.contextPathRegExp.test(args)) {
        object = this.resolvePath(args, data, options);
      }

      // Loop on values
      if (object !== null && typeof object !== 'undefined') {
        if (typeof object.length === 'number') {
          for (let i = 0; i < object.length; i += 1) {
            const blockContext = object[i];

            if (typeof blockContext === 'object') {
              blockContext['@index'] = i;
            }
            let blockHtml = html.replace('{{@index}}', i);
            blockHtml = blockHtml.replace('@index', String(i));
            blocks[b].result += this.replaceAll(blockHtml, blockContext, {
              special: { '@index': i },
              parent: {
                data,
                parent: options,
              },
            });
          }
        } else if (typeof object === 'object') {
          const objectKeys = Object.keys(object);
          const objectKeysLength = objectKeys.length;

          for (let i = 0; i < objectKeysLength; i += 1) {
            const key = objectKeys[i];
            const blockContext = object[key];

            if (typeof blockContext === 'object') {
              blockContext['@key'] = key;
            }
            let blockHtml = html.replace('{{@key}}', key);
            blockHtml = blockHtml.replace('@key', key);
            blocks[b].result += this.replaceAll(blockHtml, blockContext, {
              special: { '@key': key },
              parent: {
                data,
                parent: options,
              },
            });
          }
        }
      }

      // Replace source by compiled code
      src = src.replace(blocks[b].source, blocks[b].result);
    }
    return src;
  },

  /**
   * Replaces all comments
   * @param source
   * @return {string}
   */
  replaceComments(source) {
    return source.replace(Patterns.commentBlockRegExp, '');
  },

  /**
   * Replaces all conditions
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replaceConditions(source, data, options) {
    let src = source;

    // Very greedy !!
    while (src.indexOf('{{#if') !== -1) {
      src = src.replace(Patterns.conditionBlockRegExp, (match, test, html) => {
        let result = '';
        const [cond1, cond2] = html.split('{{else}}');

        // Replace variables in condition
        const condition = test.replace(Patterns.blockArgumentRegExp,
          (match2, variable) => this.parseValue(variable, data, options));

        if (this.evalCondition(condition)) {
          if (typeof cond1 === 'string') {
            result = this.replaceAll(cond1, data, {
              parent: {
                data,
                parent: options,
              },
            });
          }
        } else if (typeof cond2 === 'string') {
          result = this.replaceAll(cond2, data, {
            parent: {
              data,
              parent: options,
            },
          });
        }
        return result;
      });
    }
    return src;
  },

  /**
   * Replaces all evaluations
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replaceEvals(source, data, options) {
    return source.replace(Patterns.evalBlockRegExp, (match, expression) => {
      // Replace variables in expression
      const expr = expression.replace(Patterns.blockArgumentRegExp,
        (match2, variable) => this.parseValue(variable, data, options));
      const args = this.parseBlockArguments(expr, data, options);
      return this.evalCondition(args.join(' '));
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
    return source.replace(Patterns.helperBlockRegExp, (match, name, argsString) => {
      const args = this.parseBlockArguments(argsString, data, options);

      if (!this.isHelper(name)) {
        throw new Error(`Helper "${name}" does not exist`);
      }

      // Get the helper value
      let result = this.helpers[name];

      // Get the value from a function
      if (typeof result === 'function') {
        result = result.apply(data, args);
      }
      return typeof result !== 'undefined' && result !== null ? result : '';
    });
  },

  /**
   * Replaces partial blocks
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replacePartials(source, data, options) {
    return source.replace(Patterns.partialBlockRegExp, (match, name, paramsString) => {
      const params = this.parseBlockParams(paramsString, data, options);
      const context = extend({}, data, params);
      const value = this.render(name, context, {
        html: true,
        // fixme "this" should refer to template instance
        parent: extend({}, (options || {}).parent, { instance: this }),
        partial: true,
      });
      return value !== null ? value : '';
    });
  },

  /**
   * Replaces variable blocks
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replaceVariables(source, data, options) {
    return source.replace(Patterns.variableBlockRegExp, (match, varExpr) => {
      let value = this.resolvePath(varExpr, data, options);

      if (value !== null && typeof value !== 'undefined') {
        if (typeof value === 'object') {
          value = typeof value.toString === 'function' ? value.toString() : value;
        } else if (typeof value === 'function') {
          const parent = options && options.parent ? options.parent : {};
          // todo return parent only as 2nd argument
          value = value(data, parent.data, parent);
        }
      }
      return value !== null && typeof value !== 'undefined' ? value : '';
    });
  },

  /**
   * Replaces variable blocks
   * @deprecated
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replaceVars(source, data, options) {
    // eslint-disable-next-line no-console
    console.warn('deprecated method Kandybars.replaceVars(), use Kandybars.replaceVariables() instead');
    return this.replaceVariables(source, data, options);
  },

  /**
   * Replaces with blocks (custom scope)
   * @param source
   * @param data
   * @param options
   * @return {string}
   */
  replaceWith(source, data, options) {
    return source.replace(Patterns.withBlockRegExp, (match, path, html) => {
      const object = this.resolvePath(path, data, options);
      let result = '';

      if (object !== null && typeof object !== 'undefined') {
        result = this.replaceAll(html, object, {
          parent: {
            data,
            parent: options,
          },
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
    const opt = options || {};
    let newPath = path;
    let value;

    if (typeof newPath === 'string' && data !== null && typeof data !== 'undefined') {
      // Look for special vars
      if (opt.special && typeof opt.special[newPath] !== 'undefined') {
        return opt.special[newPath];
      }
      // Check if path is valid
      if (!Patterns.contextPathRegExp.test(newPath)) {
        return null;
      }
      // Return current context
      if (newPath === 'this') {
        return data;
      }

      // Find value in context
      let obj = data;

      // Access parent data
      if (newPath.indexOf('../') === 0) {
        if (opt.parent) {
          // todo Get template parent's data
          // if (options.parent instanceof TemplateInstance) {
          //     obj = options.parent.parent.data || {};
          // }
          // Get block parent's data
          // else
          if (opt.parent.data) {
            obj = opt.parent.data || {};
          }
        } else {
          obj = {};
        }
        newPath = newPath.substring(3);
      } else if (newPath.indexOf('this.') === 0) {
        // Access current data
        newPath = newPath.substring(5);
      }

      const parts = newPath.split('.');
      const depth = parts.length;

      for (let i = 0; i < depth; i += 1) {
        const part = parts[i];

        if (obj === null || typeof obj === 'undefined') {
          break;
        }

        // is Object
        if (part.length && typeof obj === 'object') {
          if (part.indexOf('[') !== -1) {
            let indexStart = part.indexOf('[');
            let indexEnd = 0;
            const partName = part.substr(0, indexStart);

            if (typeof obj[partName] !== 'undefined') {
              do {
                indexStart = part.indexOf('[', indexEnd);
                indexEnd = part.indexOf(']', indexStart);

                if (indexStart !== -1 && indexEnd !== -1) {
                  const partIndex = part.substr(indexStart + 1, indexEnd - (indexStart + 1));
                  obj = obj[partName][partIndex];
                }
              } while (indexStart !== -1);
            }
          } else if (typeof obj[part] !== 'undefined') {
            obj = obj[part];
          } else {
            obj = null;
          }

          // Get the result of the function
          if (obj !== null && typeof obj === 'function') {
            obj = obj.call(data);
          }
        } else {
          obj = null;
          break;
        }
      }
      value = obj;
    }
    return value;
  },
};

export default Kandybars;

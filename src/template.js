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

import Observer from '@jalik/observer';

class Template {
  constructor(name, source) {
    // Check template's name
    if (typeof name !== 'string' || name.length < 1) {
      throw new Error('Template name must be a string');
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Template name "${name}" is not valid`);
    }
    // Check template's source
    if (typeof source !== 'string') {
      throw new Error('Template source must be a string');
    }

    this._events = {};
    this._helpers = {};
    this.name = name;
    this.observer = new Observer(this);
    this.rendered = null;
    this.source = source;
  }

  /**
   * Defines events of the template
   * @param events
   */
  events(events) {
    if (events !== null && typeof events === 'object') {
      const keys = Object.keys(events);
      const keysLength = keys.length;

      for (let i = 0; i < keysLength; i += 1) {
        const action = keys[i];
        this._events[action] = events[action];
      }
    }
  }

  /**
   * Returns template events
   * @return {*}
   */
  getEvents() {
    return this._events;
  }

  /**
   * Returns template helpers
   * @return {*}
   */
  getHelpers() {
    return this._helpers;
  }

  /**
   * Returns template name
   * @return {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Returns template source
   * @return {string}
   */
  getSource() {
    return this.source;
  }

  /**
   * Defines helpers of the template
   * @param helpers
   */
  helpers(helpers) {
    if (helpers !== null && typeof helpers === 'object') {
      const keys = Object.keys(helpers);
      const keysLength = keys.length;

      for (let i = 0; i < keysLength; i += 1) {
        const key = keys[i];
        this._helpers[key] = helpers[key];
      }
    }
  }

  /**
   * Executes a function when the template is rendered.
   * @param func
   */
  onRendered(func) {
    this.observer.attach('rendered', func);
  }
}

export default Template;

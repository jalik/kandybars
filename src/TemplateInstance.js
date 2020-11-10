/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Karl STEIN
 */

import extend from '@jalik/extend';
import Observer from '@jalik/observer';
import Kandybars from './kandybars';
import Template from './Template';

let instanceCount = 0;
const partials = {};

class TemplateInstance {
  constructor(template, data, options) {
    instanceCount += 1;

    const opt = extend({
      events: {},
      helpers: {},
      parent: null,
      partial: false,
      rendered: null,
    }, options);

    // Check template
    if (!(template instanceof Template)) {
      throw new TypeError('template is not an instance of Template');
    }

    this.children = [];
    this.compiled = null;
    this.data = data;
    this.id = `kbti_${instanceCount}`;
    this.observer = new Observer(this);
    this.options = opt;
    this.parent = opt.parent;
    this.template = template;

    if (opt.partial) {
      partials[this.id] = this;
    }

    // Link instance to it's parent
    if (this.parent && this.parent.instance instanceof TemplateInstance) {
      this.parent.instance.getChildren().push(this);
    }
  }

  /**
   * Attaches the event to the elements in the template
   * @param event
   * @param callback
   * @param node
   */
  attachEvent(event, callback, node) {
    if (typeof callback === 'function') {
      const events = event.split(',');

      for (let i = 0; i < events.length; i += 1) {
        const eventName = events[i];
        const parts = eventName.split(' ', 2);
        const action = parts[0];
        let selector = parts[1];
        const target = selector ? node.find(selector) : node;
        let htmlNode;

        // Check if root node is the target
        if (target && target.length === 1) {
          htmlNode = target;
          selector = null;
        } else {
          htmlNode = node;
        }

        ((newAction, newSelector) => {
          // Attach event now and in the future
          htmlNode.on(newAction, newSelector, (ev) => {
            callback.call(this.getContext(), ev, node, this);
          });
        })(action, selector);
      }
    }
  }

  /**
   * Parses all events in the template
   * @param events
   * @param node
   */
  attachEvents(events, node) {
    const keys = Object.keys(events);
    const keysLength = keys.length;

    for (let i = 0; i < keysLength; i += 1) {
      const action = keys[i];
      this.attachEvent(action, events[action], node);
    }
  }

  /**
   * Returns template children
   * @return {Array}
   */
  getChildren() {
    return this.children;
  }

  /**
   * Returns instance context
   * @return {*}
   */
  getContext() {
    return extend({}, this.data, this.template.getHelpers());
  }

  /**
   * Returns instance events
   * @return {*}
   */
  getEvents() {
    return extend({}, this.template.getEvents(), this.options.events);
  }

  /**
   * Returns instance helpers
   * @return {*}
   */
  getHelpers() {
    return extend({}, this.template.getHelpers(), this.options.helpers);
  }

  /**
   * Returns the template Id
   * @return {string}
   */
  getId() {
    return this.id;
  }

  /**
   * Returns the template parent
   * @return {null|TemplateInstance}
   */
  getParent() {
    return this.parent && this.parent.instance;
  }

  /**
   * Returns the template
   * @return {Template}
   */
  getTemplate() {
    return this.template;
  }

  /**
   * Checks if instance has children
   * @return {boolean}
   */
  hasChildren() {
    return this.children.length > 0;
  }

  /**
   * Checks if instance is a partial template
   * @return {boolean}
   */
  isPartial() {
    return this.options.partial === true;
  }

  /**
   * Returns a compiled version of the template
   * @param options
   * @return {*|HTMLElement}
   */
  render(options) {
    const opt = extend({
      events: {},
      helpers: {},
      html: false,
      parent: null,
      rendered: null,
    }, options);

    const context = this.getContext();
    const template = this.getTemplate();
    const source = template.getSource();

    // Generate template
    let tpl = Kandybars.replaceAll(source, context, opt);

    if (this.isPartial()) {
      const partialId = this.getId();

      // Search first node
      const startIndex = tpl.indexOf('<');
      const closeIndex = tpl.indexOf('>', startIndex);

      if (startIndex === -1 || closeIndex === -1) {
        tpl = `<div data-partial-id="${partialId}">${tpl}</div>`;
      } else {
        tpl = `${tpl.substr(0, closeIndex)} data-partial-id="${partialId}"${tpl.substr(closeIndex)}`;
      }
    } else if (!opt.html) {
      // Create a DOM version of the version
      // Wrap template with jQuery
      if (typeof window.jQuery !== 'undefined') {
        tpl = window.jQuery(tpl);

        // Insert the template in the target
        if (opt.target) {
          window.jQuery(opt.target).html(tpl);
        }

        const processPartial = function processPartial() {
          const node = window.jQuery(this);
          const partialId = node.attr('data-partial-id');
          const partial = partials[partialId];

          // Overwrite compiled result
          partial.compiled = window.jQuery(this);

          // Attach events
          partial.attachEvents(partial.getEvents(), node);

          // Execute rendered callback
          partial.rendered();
        };

        // Search partial in root node
        tpl.filter('[data-partial-id]').each(processPartial);

        // Search partials in child nodes
        tpl.find('[data-partial-id]').each(processPartial);

        // Attach events
        this.attachEvents(this.getEvents(), tpl);
      }
    }

    this.compiled = tpl;

    if (!opt.html) {
      this.rendered();
    }
    return tpl;
  }

  /**
   * Executes rendered callbacks
   * @private
   */
  rendered() {
    if (typeof this.options.rendered === 'function') {
      this.options.rendered.call(this, this.compiled, this.getContext());
    } else if (typeof this.getTemplate().rendered === 'function') {
      this.getTemplate().rendered.call(this, this.compiled, this.getContext());
    }
    // Notify listeners
    this.observer.notify('rendered', this.compiled, this.getContext());
  }
}

export default TemplateInstance;

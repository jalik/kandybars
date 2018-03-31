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

import Template from '../src/template';
import TemplateInstance from '../src/template-instance';

const templateName = 'test';
const templateSource = '<div>{{variable}}</div>';

describe('TemplateInstance', () => {
  it('should be importable from package', () => {
    expect(typeof TemplateInstance).toEqual('function');
  });

  it('getChildren() should return an empty array if instance has no child', () => {
    const tpl = new Template(templateName, templateSource);
    const tplInstance = new TemplateInstance(tpl);
    expect(tplInstance.getChildren()).toEqual([]);
  });

  // it('getChildren() should return an array containing children templates', () => {
  //     const tplInstance = new TemplateInstance(tpl);
  //     expect(tplInstance.getChildren()).toEqual([]);
  // });

  it('getTemplate() should return a Template instance', () => {
    const tpl = new Template(templateName, templateSource);
    const tplInstance = new TemplateInstance(tpl);
    expect(tplInstance.getTemplate() instanceof Template).toEqual(true);
  });

  it('hasChildren() should return false if instance has no child', () => {
    const tpl = new Template(templateName, templateSource);
    const tplInstance = new TemplateInstance(tpl);
    expect(tplInstance.hasChildren()).toEqual(false);
  });

  // it('isPartial() should return true if instance is a partial', () => {
  //     const tplInstance = new TemplateInstance(tpl);
  //     expect(tplInstance.isPartial()).toEqual(true);
  // });
  //
  // it('isPartial() should return false if instance is not a partial', () => {
  //     const tplInstance = new TemplateInstance(tpl);
  //     expect(tplInstance.isPartial()).toEqual(false);
  // });

  it('render() should replace variables', () => {
    const data = { variable: 'ok' };
    const tpl = new Template('test', '<div>{{variable}}</div>');
    const tplInstance = new TemplateInstance(tpl, data, {});
    expect(tplInstance.render()).toEqual(`<div>${data.variable}</div>`);
  });

  it('render() should remove comment blocks', () => {
    const tpl = new Template('test', '<div>{{! This is a comment }}</div>');
    const tplInstance = new TemplateInstance(tpl);
    expect(tplInstance.render()).toEqual('<div></div>');
  });
});

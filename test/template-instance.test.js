/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Karl STEIN
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

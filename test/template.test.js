/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Karl STEIN
 */

import Template from '../src/template';

const templateName = 'test';
const templateSource = '<div>{{variable}}</div>';

describe('Template', () => {
  it('should be importable from package', () => {
    expect(typeof Template).toEqual('function');
  });

  it('getName() should return a string', () => {
    const tpl = new Template(templateName, templateSource);
    expect(tpl.getName()).toEqual(templateName);
  });

  it('getSource() should return a string', () => {
    const tpl = new Template(templateName, templateSource);
    expect(tpl.getSource()).toEqual(templateSource);
  });
});

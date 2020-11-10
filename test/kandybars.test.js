/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Karl STEIN
 */

import Kandybars from '../src/kandybars';

describe('Kandybars', () => {
  it('should be importable from package', () => {
    expect(typeof Kandybars.render).toEqual('function');
  });
});

describe('fetchBlockArguments()', () => {
  it('should return arguments', () => {
    expect(Kandybars.fetchBlockArguments(' "a" true 32 ')).toEqual(['"a"', 'true', '32']);
  });
});

describe('findBlocks()', () => {
  it('should return "each" blocks', () => {
    const html = '<ul>{{#each colors}}<li>{{color}}</li>{{/each}}</ul>'
      + '<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul>';
    expect(Kandybars.findBlocks(html)).toEqual([
      {
        fromIndex: 4,
        toIndex: 38,
        arguments: 'colors',
        content: '<li>{{color}}</li>',
        source: '{{#each colors}}<li>{{color}}</li>{{/each}}',
      },
      {
        fromIndex: 56,
        toIndex: 88,
        arguments: 'sizes',
        content: '<li>{{size}}</li>',
        source: '{{#each sizes}}<li>{{size}}</li>{{/each}}',
      },
    ]);
  });

  it('should return only "each" root blocks', () => {
    const html = '<ul>{{#each colors}}<li>{{color}}<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul></li>{{/each}}</ul>'
      + '<ul>{{#each colors}}<li>{{color}}<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul></li>{{/each}}</ul>';
    expect(Kandybars.findBlocks(html)).toEqual([
      {
        fromIndex: 4,
        toIndex: 88,
        arguments: 'colors',
        content: '<li>{{color}}<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul></li>',
        source: '{{#each colors}}<li>{{color}}<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul></li>{{/each}}',
      },
      {
        fromIndex: 106,
        toIndex: 190,
        arguments: 'colors',
        content: '<li>{{color}}<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul></li>',
        source: '{{#each colors}}<li>{{color}}<ul>{{#each sizes}}<li>{{size}}</li>{{/each}}</ul></li>{{/each}}',
      },
    ]);
  });
});

describe('parseBlockArguments()', () => {
  it('should return parsed arguments', () => {
    expect(Kandybars.parseBlockArguments(' "a" true 32 -16 ')).toEqual(['a', true, 32, -16]);
  });
  it('should not return "" if empty string', () => {
    expect(Kandybars.parseBlockArguments(' "" true 32 -16 ')).toEqual(['', true, 32, -16]);
  });
  it('should not return \'\' if empty string', () => {
    expect(Kandybars.parseBlockArguments(' \'\' true 32 -16 ')).toEqual(['', true, 32, -16]);
  });
});

describe('parseBlockParams()', () => {
  it('should return parsed parameters', () => {
    expect(Kandybars.parseBlockParams(' a=10 b="test" c=true ')).toEqual({
      a: 10,
      b: 'test',
      c: true,
    });
  });
});

describe('parseTemplates()', () => {
  it('should throw an error if template has no name attribute', () => {
    const html = '<template>missing name</template>';
    expect(() => Kandybars.parseTemplates(html)).toThrow(SyntaxError);
  });

  it('should throw an error if template has no valid name', () => {
    const html = '<template name=\'\'>missing name</template>';
    expect(() => Kandybars.parseTemplates(html)).toThrow(SyntaxError);
  });

  it('should return templates from source', () => {
    const html = '<template name=\'hello\'><b>Hello</b></template> \r\n <template name=\'world\'><b>world</b></template>';
    expect(Kandybars.parseTemplates(html).length).toEqual(2);
  });

  it('should register templates from source', () => {
    const html = '<template name=\'hello\'><b>Hello</b></template>';
    Kandybars.parseTemplates(html);
    expect(Kandybars.isTemplate('hello')).toEqual(true);
  });
});

describe('parseValue()', () => {
  it('should parse boolean', () => {
    expect(Kandybars.parseValue('true')).toEqual(true);
    expect(Kandybars.parseValue('false')).toEqual(false);
  });

  it('should parse number', () => {
    expect(Kandybars.parseValue('100')).toEqual(100);
    expect(Kandybars.parseValue('99.9')).toEqual(99.9);
    expect(Kandybars.parseValue('-50')).toEqual(-50);
    expect(Kandybars.parseValue('-25.6998')).toEqual(-25.6998);
  });

  it('should parse string', () => {
    expect(Kandybars.parseValue('\'hello\'')).toEqual('hello');
  });

  it('should parse variable', () => {
    const context = { name: 'karl' };
    expect(Kandybars.parseValue('name', context)).toEqual(`"${context.name}"`);
  });
});

describe('registerHelper()', () => {
  it('should registers the helper', () => {
    Kandybars.registerHelper('sum', (a, b) => a + b);
    expect(Kandybars.isHelper('sum')).toEqual(true);
  });
});

describe('registerTemplate()', () => {
  it('should registers the template', () => {
    Kandybars.registerTemplate('hello', '<b>Hello World</b>');
    expect(Kandybars.isTemplate('hello')).toEqual(true);
  });
});

describe('replaceComments()', () => {
  it('should remove comment blocks', () => {
    expect(Kandybars.replaceComments('<div>{{!This is a comment}}</div>')).toEqual('<div></div>');
    expect(Kandybars.replaceComments('<div>{{! This is a comment}}</div>')).toEqual('<div></div>');
    expect(Kandybars.replaceComments('<div>{{! This is a comment }}</div>')).toEqual('<div></div>');
  });
});

describe('replaceBlocks()', () => {
  it('should replace blocks containing primitive values', () => {
    const data = { colors: ['red', 'white', 'blue'] };
    const html = '<ul>{{#each colors}}<li>{{this}}</li>{{/each}}</ul>';
    const compiled = `<ul><li>${data.colors[0]}</li><li>${data.colors[1]}</li><li>${data.colors[2]}</li></ul>`;
    expect(Kandybars.replaceBlocks(html, data)).toEqual(compiled);
  });

  it('should replace blocks containing objects', () => {
    const data = { colors: [{ name: 'red' }, { name: 'white' }, { name: 'blue' }] };
    const html = '<ul>{{#each colors}}<li>{{name}}</li>{{/each}}</ul>';
    const compiled = `<ul><li>${data.colors[0].name}</li><li>${data.colors[1].name}</li><li>${data.colors[2].name}</li></ul>`;
    expect(Kandybars.replaceBlocks(html, data)).toEqual(compiled);
  });

  it('should replace nested blocks', () => {
    const data = { items: [{ num: 1, children: [{ num: 1 }] }] };
    const html = '<ul>{{#each items}}<li>{{num}}<ul>{{#each children}}<li>{{num}}</li>{{/each}}</ul></li>{{/each}}</ul>';
    const compiled = `<ul><li>${data.items[0].num}<ul><li>${data.items[0].children[0].num}</li></ul></li></ul>`;
    expect(Kandybars.replaceBlocks(html, data)).toEqual(compiled);
  });

  it('should replace separate blocks', () => {
    const data = { a: [{ num: 100 }], b: [{ num: 200 }] };
    const html = '<ul>{{#each a}}<li>{{num}}</li>{{/each}}</ul>'
      + '<ul>{{#each b}}<li>{{num}}</li>{{/each}}</ul>';
    const compiled = `<ul><li>${data.a[0].num}</li></ul><ul><li>${data.b[0].num}</li></ul>`;
    expect(Kandybars.replaceBlocks(html, data)).toEqual(compiled);
  });

  it('should remove unused blocks', () => {
    const html = '<div>{{#each colors}}<b>{{name}}</b>{{/each}}</div>';
    expect(Kandybars.replaceBlocks(html)).toEqual('<div></div>');
  });
});

describe('replaceConditions()', () => {
  it('should replace true conditions with true blocks', () => {
    const data = { a: 100, b: 250 };
    const html = '<div>{{#if a < b}}true{{else}}false{{/if}}</div>';
    expect(Kandybars.replaceConditions(html, data)).toEqual('<div>true</div>');
  });

  it('should replace false conditions with else blocks', () => {
    const data = { a: 100, b: 250 };
    const html = '<div>{{#if a > b}}true{{else}}false{{/if}}</div>';
    expect(Kandybars.replaceConditions(html, data)).toEqual('<div>false</div>');
  });
});

describe('replaceEvals()', () => {
  it('should replace evaluations', () => {
    const data = { a: 100, b: 250 };
    const html = '<div>{{eval (a + b)}}</div>';
    const result = (data.a + data.b);
    expect(Kandybars.replaceEvals(html, data)).toEqual(`<div>${result}</div>`);
  });
});

describe('replaceHelpers()', () => {
  it('should replace helper blocks', () => {
    Kandybars.registerHelper('lowercase', (text) => (typeof text === 'string' ? text.toLowerCase() : text));
    const data = { text: 'HELLO' };
    const html = '<div>{{lowercase text}}</div>';
    expect(Kandybars.replaceHelpers(html, data)).toEqual(`<div>${data.text.toLowerCase()}</div>`);
  });

  it('should throw an error for unknown helpers', () => {
    const html = '<div>{{lc \'TEXT\'}}</div>';
    expect(() => Kandybars.replaceHelpers(html)).toThrow(Error);
  });
});

describe('replacePartials()', () => {
  it('should replace partials', () => {
    Kandybars.registerTemplate('partialTemplate', '<b>Child</b>');
    const html = '<div>{{> partialTemplate}}</div>';
    expect(Kandybars.replacePartials(html).replace(/ data-partial-id="[^"]+"/g, '')).toEqual('<div><b>Child</b></div>');
  });

  it('should throw an error for unknown partials', () => {
    const html = '<div>{{> unknownTemplate}}</div>';
    expect(() => Kandybars.replacePartials(html)).toThrow(Error);
  });
});

describe('replaceVariables()', () => {
  it('should replace variables', () => {
    const data = { text: 'hello' };
    const html = '<div>{{text}}</div>';
    expect(Kandybars.replaceVariables(html, data)).toEqual(`<div>${data.text}</div>`);
  });

  it('should remove unused variables', () => {
    const html = '<div>{{text}}</div>';
    expect(Kandybars.replaceVariables(html)).toEqual('<div></div>');
  });
});

describe('replaceWith()', () => {
  it('should replace "with" blocks', () => {
    const data = { user: { name: 'karl' } };
    const html = '<div>{{#with user}}<b>{{name}}</b>{{/with}}</div>';
    expect(Kandybars.replaceWith(html, data)).toEqual(`<div><b>${data.user.name}</b></div>`);
  });

  it('should remove unused "with" blocks', () => {
    const html = '<div>{{#with user}}<b>{{name}}</b>{{/with}}</div>';
    expect(Kandybars.replaceWith(html)).toEqual('<div></div>');
  });
});

describe('resolvePath()', () => {
  it('should return null for unresolved paths', () => {
    const data = { test: { title: 'Test' } };
    expect(Kandybars.resolvePath('test.name', data)).toEqual(null);
  });

  it('should resolve paths', () => {
    const data = {
      user: {
        name: 'karl',
        phones: [
          {
            code: '689',
            number: '87218910',
            array: { a: 1, b: 2, c: 3 },
          },
        ],
        sayHello() {
          return 'hello';
        },
      },
    };
    expect(Kandybars.resolvePath('this', data)).toEqual(data);
    expect(Kandybars.resolvePath('this.user', data)).toEqual(data.user);
    expect(Kandybars.resolvePath('user', data)).toEqual(data.user);
    expect(Kandybars.resolvePath('user.name', data)).toEqual(data.user.name);
    expect(Kandybars.resolvePath('user.sayHello', data)).toEqual(data.user.sayHello());
    expect(Kandybars.resolvePath('user.phones', data)).toEqual(data.user.phones);
    expect(Kandybars.resolvePath('user.phones[0]', data)).toEqual(data.user.phones[0]);
    expect(Kandybars.resolvePath('user.phones[0].number', data)).toEqual(data.user.phones[0].number);
    expect(Kandybars.resolvePath('user.phones[0].array[a]', data)).toEqual(data.user.phones[0].array.a);
  });
});

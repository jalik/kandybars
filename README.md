# Kandybars
![GitHub package.json version](https://img.shields.io/github/package-json/v/jalik/kandybars.svg)
[![Build Status](https://travis-ci.com/jalik/kandybars.svg?branch=master)](https://travis-ci.com/jalik/kandybars)
![GitHub](https://img.shields.io/github/license/jalik/kandybars.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/jalik/kandybars.svg)
[![GitHub issues](https://img.shields.io/github/issues/jalik/kandybars.svg)](https://github.com/jalik/kandybars/issues)
![npm](https://img.shields.io/npm/dt/kandybars.svg)

A template engine based on mustache syntax for all purposes.

## Create a template in HTML

Each template is wrapped in a **template** html tag and referenced by a unique name using the **name** attribute.

```html
<template name="welcome">
    <p>Welcome</p>
</template>
```

## Create a template in JavaScript

This is not the common way, but you can create a template directly from JavaScript.

```js
import Kandybars from "kandybars";

Kandybars.registerTemplate('welcome', '<p>Welcome</p>');
```

## Load templates from a string

You can also load templates contained in a string by parsing it.

```js
import Kandybars from "kandybars";

Kandybars.parseTemplates('<template name="hello">Hello World</template>');
Kandybars.render('hello');
```

## Comments

All comments are removed from the code when the template is rendered.

```html
<template name="secret">
    {{! this comment will not appear in the final HTML}}
    <p>{{secret}}</p>
</template>
```

## Variables

```html
<template name="hello">
    <p>Hello {{user.name}}</p>
</template>
```

```js
import Kandybars from "kandybars";

var tpl = Kandybars.render('hello', {
    user: {name: "Karl"}
});
```

## For-Each blocks

Loops are done easily using javascript arrays.

```html
<template name="colors">
    <ul>
        {{#each colors}}
        <li>{{name}} : {{hexCode}}</li>
        {{/each}}
    </ul>
</template>
```

```js
import Kandybars from "kandybars";

var tpl = Kandybars.render('colors', {
    colors: [
        {
            name: "red",
            hexCode: "ff0000"
        },
        {
            name: "green",
            hexCode: "00ff00"
        },
        {
            name: "blue",
            hexCode: "0000ff"
        }
    ]
});
```

## Conditional blocks

It is possible to display data depending of the result of an expression.

```html
<template name="messageCounter">
    {{#if messageCount > 0}}
    <p>You have {{messageCount}} messages</p>
    {{else}}
    <p>You don't have any messages</p>
    {{/if}}
</template>
```

```js
import Kandybars from "kandybars";

var tpl = Kandybars.render('messageCounter', {
    messageCount: 19
});
```

## Helpers

Helpers are like functions but they are used directly inside templates, they accept arguments.

```html
<template name="interest">
    <p>I love {{uppercase interest}}</p>
</template>
```

```js
import Kandybars from "kandybars";

Kandybars.registerHelper('uppercase', function(word) {
    return word ? word.toUpperCase() : "";
});

var tpl = Kandybars.render('interest', {
    interest: "coding"
});
```

## Evaluations

Evals allow to get the result of an expression.

```html
<template name="formula">
    <p>x + y - 0.5 = {{eval x + y - 0.5}}</p>
</template>
```

```js
import Kandybars from "kandybars";

var tpl = Kandybars.render('formula', {
    x: 100,
    y: Math.random() * 10
});
```

## Partials

Templates that are already loaded can be included inside other templates by using a special helper.

```html
<template name="colors">
    <ul>
    {{#each colors}}
    {{> colorListItem}}
    {{/each}}
    </ul>
</template>

<template name="colorListItem">
    <li>{{name}} : {{hexCode}}</li>
</template>
```

```js
import Kandybars from "kandybars";

var tpl = Kandybars.render('colors', {
    colors: [
        {
            name: "red",
            hexCode: "ff0000"
        },
        {
            name: "green",
            hexCode: "00ff00"
        },
        {
            name: "blue",
            hexCode: "0000ff"
        }
    ]
});
```

## Changelog

History of releases is in the [changelog](./CHANGELOG.md).

## License

The code is released under the [MIT License](http://www.opensource.org/licenses/MIT).

If you find this lib useful and would like to support my work, donations are welcome :)

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7UABXKNGPQBVJ)

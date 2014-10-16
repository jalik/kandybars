# Kandybars.js

## Creating templates in HTML

Each template is wrapped in a **template** html tag and referenced by its name using the **name** attribute.

```html
<template name="welcome">
    <p>Welcome</p>
</template>
```

## Creating templates in Javascript

This is not the common way, but you can create a template directly from Javascript.

```js
Kandybars.create('welcome', '<p>Welcome</p>');
```

## Loading templates using HTTP request

A simple way to load template code (HTML) and logic (Javascript) is provided.

```js
Kandybars.load('relative/path/to/template', function() {
    console.log('Template is loaded');
});
```

## Comments

All comments are removed from the code when the template is rendered.

```html
<template name="secret">
    {{! this comment will not appears in the final HTML}}
    <p>{{secret}}</p>
</template>
```

## Variables

```html
<template name="hello">
    <p>Hello {{user.firstname}} {{user.name}}</p>
</template>
```

```js
var tpl = Kandybars.render('hello', {
    user: {
        firstname: "Bob"
        name: "Marley"
    }
});
```

## Iteratives blocs

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

## Conditional blocs

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
Kandybars.registerHelper('uppercase', function(word) {
    return word ? word.toUpperCase() : '';
});
var tpl = Kandybars.render('interest', {
    interest: "coding"
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
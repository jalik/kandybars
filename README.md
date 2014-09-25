# Kandybars.js

## Creating templates in HTML
Each template is wrapped in a **template** html tag and referenced by its name using the **name** attribute.

```html
<template name="welcome">
  <p>Welcome</p>
</template>
```

## Creating templates in Javascript

```js
Kandybars.create('welcome', '<p>Welcome</p>');
```

## Loading templates using HTTP request

```js
Kandybars.load('relative/path/to/template', function() {
  console.log('Template is loaded');
});
```

## Comments

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
var context = {
  user: {
    firstname: "Bob"
    name: "Marley"
  }
};
var tpl = Kandybars.render('hello', context);
```

## Iteratives blocs

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
var context = {
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
};
var tpl = Kandybars.render('colors', context);
```

## Partials

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
var context = {
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
};
var tpl = Kandybars.render('colors', context);
```

## Conditional blocs

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
var context = {
  messageCount: 19
};
var tpl = Kandybars.render('messageCounter', context);
```

## Helpers

```html
<template name="interest">
  <p>I love {{uppercase interest}}</p>
</template>
```

```js
var context = {
  interest: "coding"
};
Kandybars.registerHelper('uppercase', function(word) {
  return word ? word.toUpperCase() : '';
});
var tpl = Kandybars.render('interest', context);
```
# nwc-utils

Utilities to help reduce boilerplate when working with native web components.

**Warning:** This utility is still highly experimental! Use at your own risk!

## Setup

At a minimum, the `@babel/plugin-proposal-decorators` plugin is required to utilize the `renderOnChange` decorator. The `@babel/plugin-proposal-class-properties` plugin is recommended for convenience.

### Sample `.babelrc` Setup:

```json
{
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    ["@babel/plugin-proposal-class-properties", { "loose": true }]
  ]
}
```

## How To Use

To create a component, import `defineElement`, `html`, and `renderOnChange` from `nwc-utils`:

```js
import { defineElement, html, renderOnChange } from 'nwc-utils';
```

### Custom Element Creation

`defineElement` is a function that takes two arguments: the custom element name, and the custom element class. It returns a function that can be called to initialize the component properties.

### Lifecycle Methods

You can still use any of the normal lifecycle methods if you wish, but I recommend only using three custom lifecycle methods added by this utility: `connected`, `propChanged`, and `render`:

`connected(element)` - Called immediately after `connectedCallback` and is passed a reference to the component which you can use to destructure properties.

`propChanged(name, value)` - Called when a property decorated with `renderOnChange` is updated. The name and value of the changed property are passed to this function.

`render(element)` - Called when a property decorated with `renderOnChange` is updated. A reference to the component is passed to this function. This function must return a template created using the included `html` function.

### Event Listeners

Event listeners are automatically created in templates defined using `html` for attributes beginning with `on`. In your template, simply interpolate the function you wish to use as an attribute.

### Usage

_Define a custom element:_

```js
import { defineElement, html, renderOnChange } from 'nwc-utils';

export default defineElement(
  'my-custom-element',
  class MyCustomElement extends HTMLElement {
    @renderOnChange
    count = 0;

    render() {
      return html`
        <section>
          <div>Current count: ${this.count}</div>
          <button onclick="${() => this.count--}" type="button">Decrement</button>
          <button onclick="${() => this.count++}" type="button">Increment</button>
        </section>
      `;
    }
  }
);
```

_Using HTML tags:_

```js
import './MyCustomElement.mjs';

document.body.innerHTML = '<my-custom-element count="10"></my-custom-element>';
```

_Using the function returned by `defineElement` within another custom element:_

```js
import MyCustomElement from './MyCustomElement.mjs';

document.body.innerHTML = MyCustomElement({ count: 10 });
```

## JS Apps

If you wish to use this utility as the basis for a JavaScript webapp, you can import `mountApp` to perform the initial mount. The component being mounted should be a component created using `defineElement`:

```js
import { mountApp } from 'nwc-utils';
import HomePage from './src/HomePage.mjs';

mountApp(HomePage, document.getElementById('#root'));
```

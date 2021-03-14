let tempDataCache = {};

function attrsToObject(element) {
  const attrs = {};

  for (const { name, value } of element.attributes) {
    attrs[name] = value;
  }

  return attrs;
}

export function clearCache() {
  tempDataCache = {};
}

export function convertToAttrName(string) {
  return string.replace(/[A-Z]/g, value => `-${value.toLowerCase()}`);
}

export function convertToPropName(string) {
  return string.replace(/-[a-z]/g, value => value.toUpperCase().replace('-', ''));
}

export function createElement(tagName, { attrs = {}, children = [] } = {}) {
  return { ...Object.create(null), attrs, children, tagName };
}

export function diff(oldVTree, newVTree) {
  if (newVTree === undefined) {
    return node => {
      node.remove();
      return;
    };
  }

  if (typeof oldVTree === 'string' || typeof newVTree === 'string') {
    if (oldVTree === newVTree) {
      return node => node;
    } else {
      return node => {
        const newNode = render(newVTree);
        node.replaceWith(newNode);
        return newNode;
      };
    }
  }

  if (oldVTree.tagName !== newVTree.tagName) {
    return node => {
      const newNode = render(newVTree);
      node.replaceWith(newNode);
      return newNode;
    };
  }

  const patchAttrs = diffAttrs(oldVTree.attrs, newVTree.attrs);
  const patchChildren = diffChildren(oldVTree.children, newVTree.children);

  return node => {
    patchAttrs(node);
    patchChildren(node);
    return node;
  };
}

function diffAttrs(oldAttrs, newAttrs) {
  const patches = [];

  for (const [k, v] of Object.entries(newAttrs)) {
    if (typeof tempDataCache[v] === 'function') {
      continue;
    }

    patches.push(node => {
      if (tempDataCache[v]) {
        node[k] = tempDataCache[v];
        return;
      }

      node.setAttribute(k, v);
      return node;
    });
  }

  for (const k in oldAttrs) {
    if (!(k in newAttrs)) {
      patches.push(node => {
        node.removeAttribute(k);
        return node;
      });
    }
  }

  return node => {
    for (const patch of patches) {
      patch(node);
    }

    return node;
  };
}

function diffChildren(oldVChildren, newVChildren) {
  const childPatches = [];

  oldVChildren.forEach((oldVChild, i) => {
    childPatches.push(diff(oldVChild, newVChildren[i]));
  });

  const additionalPatches = [];

  for (const additionalVChild of newVChildren.slice(oldVChildren.length)) {
    additionalPatches.push(node => {
      node.appendChild(render(additionalVChild));
      return node;
    });
  }

  return parent => {
    for (const [patch, child] of zip(childPatches, parent.childNodes)) {
      patch(child);
    }

    for (const patch of additionalPatches) {
      patch(parent);
    }

    return parent;
  };
}

function generateId() {
  return Math.random()
    .toString(36)
    .substr(2, 11);
}

export function html(strings, ...parts) {
  const template = strings.reduce((acc, cur, i) => {
    let string = parts[i] ?? '';

    if (string === false) {
      string = '';
    }

    if (Array.isArray(string)) {
      string = string.join('');
    }

    if (
      (typeof string === 'function' && !(string.prototype instanceof HTMLElement)) ||
      typeof string === 'object'
    ) {
      const cachedItemIndex = Object.values(tempDataCache).findIndex(item => item === string);
      let newId;

      if (cachedItemIndex === -1) {
        newId = generateId();
        tempDataCache[newId] = string;
      } else {
        newId = Object.keys(tempDataCache)[cachedItemIndex];
      }

      string = newId;
    }

    return `${acc}${cur}${string}`;
  }, '');

  return template;
}

export function htmlToDom(template) {
  const templateEl = document.createElement('template');
  templateEl.innerHTML = template;

  if (templateEl.content.childNodes.length > 1) {
    const wrapper = document.createElement('div');
    wrapper.dataset.componentWrapper = '';
    wrapper.appendChild(templateEl.content);
    templateEl.content.appendChild(wrapper);
  }

  return objectify(templateEl.content.firstElementChild);
}

export function mount(node, target) {
  if (customElements.get(node.customElementName)) {
    node = render(
      htmlToDom(html`
        ${node.toString()}
      `)
    );
  }

  target.replaceWith(node);
  clearCache();
  return node;
}

export function mountApp(Component, target) {
  mount(
    render(
      htmlToDom(
        html`
          ${Component()}
        `
      )
    ),
    target
  );
}

function objectify(element) {
  if (element instanceof Text) {
    return element.textContent;
  }

  return createElement(element.tagName, {
    attrs: attrsToObject(element),
    children: [...element.childNodes].map(child => objectify(child))
  });
}

export function render(vNode) {
  if (typeof vNode === 'string') {
    return document.createTextNode(vNode);
  }

  return renderElement(vNode);
}

export function renderElement({ attrs, children, tagName }) {
  const el = document.createElement(tagName);

  for (const [k, v] of Object.entries(attrs)) {
    if (tempDataCache[v]) {
      if (k.startsWith('on')) {
        el.addEventListener(k.split('on')[1], tempDataCache[v]);
      } else {
        el[k] = tempDataCache[v];
      }
    } else {
      el.setAttribute(k, v);
    }
  }

  for (const child of children) {
    el.appendChild(render(child));
  }

  return el;
}

function zip(xs, ys) {
  const zipped = [];

  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    zipped.push([xs[i], ys[i]]);
  }

  return zipped;
}

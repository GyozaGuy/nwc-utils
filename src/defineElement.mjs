import {
  clearCache,
  convertToAttrName,
  convertToPropName,
  diff,
  html,
  htmlToDom,
  mount,
  render
} from './templateHelpers.mjs';

const typesMap = {
  boolean: Boolean,
  number: Number,
  string: String
};

export default function(name, ComponentClass) {
  Object.defineProperty(ComponentClass, 'customElementName', { value: name });
  Object.defineProperty(ComponentClass, 'root', {});
  Object.defineProperty(ComponentClass, 'template', {});
  Object.defineProperty(ComponentClass, '_rendered', { value: false });

  ComponentClass.prototype.attributeChangedCallback = function(attrName, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    const propName = convertToPropName(attrName);

    if (!this.props[propName]) {
      return;
    }

    const propType = typeof this.props[propName].defaultValue;
    const TypeClass = typesMap[propType];

    if (TypeClass === Boolean) {
      if (newValue === '') {
        return;
      }

      if (!newValue || newValue === 'false') {
        this.removeAttribute(attrName);
        newValue = false;
      } else {
        this.setAttribute(attrName, '');
      }
    }

    this[propName] = TypeClass ? TypeClass(newValue) : newValue;
  };

  ComponentClass.prototype.connectedCallback = function() {
    if (this._rendered) {
      return;
    }

    if (!this.props) {
      this.props = {};
    }

    for (const propName of Object.keys(this.props)) {
      const attrName = convertToAttrName(propName);
      let value;

      Object.defineProperty(this, propName, {
        get() {
          return value;
        },
        set(newVal) {
          if (value === newVal) {
            return;
          }

          value = newVal;

          if (typeof this.propChanged === 'function') {
            this.propChanged(propName, value);
          }

          if ((value || value === 0) && typeof value !== 'object') {
            this.setAttribute(attrName, typeof value === 'boolean' ? '' : value);
          } else {
            this.removeAttribute(attrName);
          }

          if (this._rendered) {
            this.update();
          }
        }
      });

      this.setInitialValue(propName);
    }

    const div = document.createElement('div');
    this.appendChild(div);
    const newTemplate = this.render(this);

    if (newTemplate) {
      this.template = htmlToDom(newTemplate);
      this.root = mount(render(this.template), div);
    }

    this.connected(this);
    this._rendered = true;
  };

  ComponentClass.prototype.setInitialValue = function(propName) {
    const { defaultValue } = this.props[propName];
    const attrName = convertToAttrName(propName);
    const propType = typeof defaultValue;

    // Check for an attribute
    if (this.hasAttribute(attrName)) {
      const TypeClass = typesMap[propType];
      let attrValue = this.getAttribute(attrName);

      if (TypeClass === Boolean) {
        if (attrValue === 'false') {
          this.removeAttribute(attrName);
          attrValue = false;
        } else {
          this.setAttribute(attrName, '');
        }
      }

      this[propName] = TypeClass ? TypeClass(attrValue) : attrValue;
    } else {
      // Check for properties
      if (propType === 'boolean') {
        this.toggleAttribute(attrName, this[propName]);
        this[propName] = Boolean(this[propName]);
      } else if (
        Object.keys(typesMap).includes(propType) &&
        (this[propName] || this[propName === 0])
      ) {
        this.setAttribute(attrName, this[propName]);
      }
    }

    // Set to default value if it exists and if the value was not set above
    if (this[propName] == null && defaultValue) {
      this[propName] = defaultValue;
    }
  };

  ComponentClass.prototype.update = function() {
    const newTemplate = htmlToDom(this.render(this));
    const patch = diff(this.template, newTemplate);
    this.root = patch(this.root);
    clearCache();
    this.template = newTemplate;
  };

  ComponentClass.prototype.constructor.toString = () => {
    return `<${name}></${name}>`;
  };

  if (!ComponentClass.prototype.connected) {
    ComponentClass.prototype.connected = function() {};
  }

  if (!ComponentClass.prototype.render) {
    ComponentClass.prototype.render = function() {};
  }

  customElements.define(name, ComponentClass);

  return (props = {}) => {
    const attrString = Object.entries(props).reduce((acc, [prop, value]) => {
      const attrName = ` ${convertToAttrName(prop)}`;
      const attrValue = html`
        ="${typeof value === 'boolean' ? String(value) : value}"
      `;

      return html`
        ${acc}${attrName}${attrValue}
      `;
    }, '');
    return html`<${name}${attrString}></${name}>`;
  };
}

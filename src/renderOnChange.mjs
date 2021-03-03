import { convertToAttrName } from './templateHelpers.mjs';

export default function(target, name, descriptor) {
  if (!Array.isArray(target.constructor.observedAttributes)) {
    target.constructor.observedAttributes = [];
  }

  target.constructor.observedAttributes.push(convertToAttrName(name));

  if (!target.props) {
    target.props = {};
  }

  target.props[name] = {};

  if (descriptor.initializer) {
    const defaultValue = descriptor.initializer();
    target[name] = defaultValue;
    target.props[name] = { defaultValue };
  }
}

import * as React from 'react';

import { useMDXComponents } from './context';

const TYPE_PROP_NAME = 'mdxType';

const DEFAULTS = {
  inlineCode: 'code',
  wrapper: ({ children }) => React.createElement(React.Fragment, {}, children),
};

const MDXCreateElement = React.forwardRef((props, ref) => {
  const {
    components: propComponents,
    mdxType,
    originalType,
    parentName,
    ...etc
  } = props;

  const components = useMDXComponents(propComponents);
  const type = mdxType;
  const Component =
    components[`${parentName}.${type}`] ||
    components[type] ||
    DEFAULTS[type] ||
    originalType;

  /* istanbul ignore if - To do: what is this useful for? */
  if (propComponents) {
    return React.createElement(Component, {
      ref,
      ...etc,
      components: propComponents,
    });
  }

  return React.createElement(Component, { ref, ...etc });
});

MDXCreateElement.displayName = 'MDXCreateElement';

/**
 * 计算配置后，调用 React.createElement.apply(null, args);
 * @param {*} type
 * @param {*} props
 * @returns
 */
function mdx(type, props) {
  const args = arguments;
  const mdxType = props && props.mdxType;

  if (typeof type === 'string' || mdxType) {
    // ; 处理native html元素

    const argsLength = args.length;

    const createElementArgArray = new Array(argsLength);
    createElementArgArray[0] = MDXCreateElement;

    const newProps = {};
    for (let key in props) {
      /* istanbul ignore else - folks putting stuff in `prototype`. */
      if (hasOwnProperty.call(props, key)) {
        newProps[key] = props[key];
      }
    }

    newProps.originalType = type;
    newProps[TYPE_PROP_NAME] = typeof type === 'string' ? type : mdxType;

    createElementArgArray[1] = newProps;

    for (let i = 2; i < argsLength; i++) {
      createElementArgArray[i] = args[i];
    }

    return React.createElement.apply(null, createElementArgArray);
  }

  return React.createElement.apply(null, args);
}

mdx.Fragment = React.Fragment;

export default mdx;

import copy from 'copy-to-clipboard';
import { setBlockType } from 'prosemirror-commands';
import { textblockTypeInputRule } from 'prosemirror-inputrules';
import refractor from 'refractor/core';
import bash from 'refractor/lang/bash';
import clike from 'refractor/lang/clike';
import csharp from 'refractor/lang/csharp';
import css from 'refractor/lang/css';
import go from 'refractor/lang/go';
import java from 'refractor/lang/java';
import javascript from 'refractor/lang/javascript';
import json from 'refractor/lang/json';
import markup from 'refractor/lang/markup';
import php from 'refractor/lang/php';
import powershell from 'refractor/lang/powershell';
import python from 'refractor/lang/python';
import ruby from 'refractor/lang/ruby';
import sql from 'refractor/lang/sql';
import typescript from 'refractor/lang/typescript';
import yaml from 'refractor/lang/yaml';

import Prism, { LANGUAGES } from '../plugins/Prism';
import isInCode from '../queries/isInCode';
import { ToastType } from '../types';
import Node from './Node';

const PERSISTENCE_KEY = 'rme-code-language';
const DEFAULT_LANGUAGE = 'javascript';

[
  bash,
  css,
  clike,
  csharp,
  go,
  java,
  javascript,
  json,
  markup,
  php,
  python,
  powershell,
  ruby,
  sql,
  typescript,
  yaml,
].forEach(refractor.register);

export default class CodeFence extends Node {
  get languageOptions() {
    return Object.entries(LANGUAGES);
  }

  get name() {
    return 'code_fence';
  }

  get schema() {
    return {
      content: 'text*',
      group: 'block',
      attrs: {
        language: {
          default: DEFAULT_LANGUAGE,
        },
      },
      marks: '',
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [
        { tag: 'pre', preserveWhitespace: 'full' },
        {
          tag: '.code-block',
          preserveWhitespace: 'full',
          contentElement: 'code',
          getAttrs: (dom: HTMLDivElement) => {
            return {
              language: dom.dataset.language,
            };
          },
        },
      ],
      toDOM: (node) => {
        const button = document.createElement('button');
        button.innerText = 'Copy';
        button.type = 'button';
        button.addEventListener('click', this.handleCopyToClipboard);

        const select = document.createElement('select');
        select.addEventListener('change', this.handleLanguageChange);

        this.languageOptions.forEach(([key, label]) => {
          const option = document.createElement('option');
          const value = key === 'none' ? '' : key;
          option.value = value;
          option.innerText = label;
          option.selected = node.attrs.language === value;
          select.appendChild(option);
        });

        return [
          'div',
          { class: 'code-block', 'data-language': node.attrs.language },
          ['div', { contentEditable: false }, select, button],
          ['pre', ['code', { spellCheck: false }, 0]],
        ];
      },
    };
  }

  commands({ type }) {
    return () =>
      setBlockType(type, {
        language: localStorage?.getItem(PERSISTENCE_KEY) || DEFAULT_LANGUAGE,
      });
  }

  keys({ type }) {
    return {
      'Shift-Ctrl-\\': setBlockType(type),
      'Shift-Enter': (state, dispatch) => {
        if (!isInCode(state)) return false;

        const { tr, selection } = state;
        dispatch(tr.insertText('\n', selection.from, selection.to));
        return true;
      },
      Tab: (state, dispatch) => {
        if (!isInCode(state)) return false;

        const { tr, selection } = state;
        dispatch(tr.insertText('  ', selection.from, selection.to));
        return true;
      },
    };
  }

  /** always copy latest code of CodeFence node */
  handleCopyToClipboard = (event) => {
    const { view } = this.editor;
    const element = event.target;
    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const node = view.state.doc.nodeAt(result.pos);
      if (node) {
        copy(node.textContent);
        if (this.options.onShowToast) {
          this.options.onShowToast(
            this.options.dictionary.codeCopied,
            ToastType.Info,
          );
        }
      }
    }
  };

  handleLanguageChange = (event) => {
    const { view } = this.editor;
    const { tr } = view.state;
    const element = event.target;
    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const language = element.value;
      const transaction = tr.setNodeMarkup(result.inside, undefined, {
        language,
      });
      view.dispatch(transaction);

      localStorage?.setItem(PERSISTENCE_KEY, language);
    }
  };

  get plugins() {
    return [Prism({ name: this.name })];
  }

  inputRules({ type }) {
    return [textblockTypeInputRule(/^```$/, type)];
  }

  toMarkdown(state, node) {
    state.write('```' + (node.attrs.language || '') + '\n');
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write('```');
    state.closeBlock(node);
  }

  get markdownToken() {
    return 'fence';
  }

  parseMarkdown() {
    return {
      block: 'code_block',
      getAttrs: (tok) => ({ language: tok.info }),
    };
  }
}

/* eslint-disable func-names */
import { visualDiff } from '@web/test-runner-visual-regression';

import {
  setViewport,
  resetMouse,
  sendMouse
  // sendKeys
} from '@web/test-runner-commands';

import { expect, fixture, html } from '@open-wc/testing';

import '@openscd/open-scd-core/open-scd.js';
import type { OpenSCD } from '@openscd/open-scd-core/open-scd.js';
import { spy } from 'sinon';

// import { test, expect } from '@playwright/test';

import { IconButton } from '@material/mwc-icon-button';
import { ListItem } from '@material/mwc-list/mwc-list-item.js';

// import { midEl } from './test-support.js';
import ImportTemplateIedPlugin from '../../oscd-import-templates.js';

const factor = window.process && process.env.CI ? 4 : 2;

const standardWait = 100;

function timeout(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms * factor);
  });
}

mocha.timeout(12000 * factor);

function testName(test: any): string {
  return test.test!.fullTitle().trim();
}

async function tryViewportSet(): Promise<void> {
  // target 1920x1080 screen-resolution, giving typical browser size of...
  await setViewport({ width: 1745, height: 1045 });
}

async function resetMouseState(): Promise<void> {
  await timeout(70);
  await resetMouse();
  await sendMouse({ type: 'click', position: [0, 0] });
}

// avoid prefix on screenshots
const pluginName = '';

describe(pluginName, () => {
  let editor: OpenSCD;
  let plugin: ImportTemplateIedPlugin;
  let script: HTMLScriptElement;

  beforeEach(async () => {
    const plugins = {
      menu: [
        {
          name: 'Open File',
          translations: { de: 'Datei öffnen' },
          icon: 'folder_open',
          active: true,
          src: 'https://openscd.github.io/oscd-open/oscd-open.js'
        },
        {
          name: 'Save File',
          translations: { de: 'Datei speichern' },
          icon: 'save',
          active: true,
          src: 'https://openscd.github.io/oscd-save/oscd-save.js'
        },
        {
          name: 'Import Templates',
          icon: 'extension',
          active: true,
          src: '/dist/oscd-import-templates.js'
        }
      ]
    };

    script = document.createElement('script');
    script.type = 'module';

    script.textContent = `
    const _customElementsDefine = window.customElements.define;
    window.customElements.define = (name, cl, conf) => {
      if (!customElements.get(name)) {
        try {
          _customElementsDefine.call(
            window.customElements,
            name,
            cl,
            conf
          );
        } catch (e) {
          console.warn(e);
        }
      }
    };
  `;
    document.head.appendChild(script);

    const ed: OpenSCD = await fixture(
      html`<open-scd language="en" .plugins="${plugins}"></open-scd>`
    );
    document.body.prepend(ed);

    editor = document.querySelector('open-scd')!;

    // select the last menu plugin
    plugin = document
      .querySelector('open-scd')!
      .shadowRoot!.querySelector('aside')!
      .lastElementChild! as ImportTemplateIedPlugin;

    await timeout(standardWait * 4);

    await document.fonts.ready;
  });

  afterEach(() => {
    editor.remove();
    plugin.remove();
    script.remove();
  });

  let doc: XMLDocument;

  describe('imports templates', () => {
    describe('loads and shows templates', () => {
      beforeEach(async () => {
        localStorage.clear();
        await tryViewportSet();
        resetMouse();

        doc = await fetch('/test/fixtures/new.scd')
          .then(response => response.text())
          .then(str => new DOMParser().parseFromString(str, 'application/xml'));

        editor.docName = 'new.scd';
        editor.docs[editor.docName] = doc;

        await editor.updateComplete;
      });

      afterEach(async () => {
        localStorage.clear();
      });

      it('attempts to load files', async function () {
        const pluginSpy = spy(plugin, 'renderInput');
        console.log(plugin);
        const menuButton: IconButton = editor
          .shadowRoot!.querySelector('mwc-top-app-bar-fixed')!
          .querySelector('mwc-icon-button[label="Menu"]')!;
        menuButton.click();
        await timeout(standardWait);

        const menuList = editor
          .shadowRoot!.querySelector('mwc-drawer')!
          .querySelector('mwc-list')!;
        // it is the third plugin
        const menuPlugin = menuList.querySelector(
          'mwc-list-item:nth-of-type(3)'
        )! as ListItem;

        menuPlugin.click();

        expect(pluginSpy.called);
        (<any>pluginSpy).renderInput.restore();

        // doc = await fetch('/test/fixtures/no-IEDs-present.scd')
        //   .then(response => response.text())
        //   .then(str => new DOMParser().parseFromString(str, 'application/xml'));

        // editor.docName = 'no-IEDS.scd';
        // editor.docs[editor.docName] = doc;

        // await editor.updateComplete;
        // await plugin.updateComplete;

        await timeout(standardWait * 2);
        await resetMouseState();
        await visualDiff(plugin, testName(this));
      });
    });
  });
});

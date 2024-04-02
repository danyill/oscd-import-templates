/* eslint-disable func-names */
import { visualDiff } from '@web/test-runner-visual-regression';

import { setViewport, resetMouse } from '@web/test-runner-commands';

import { expect, fixture, html } from '@open-wc/testing';

import '@openscd/open-scd-core/open-scd.js';
import type { OpenSCD } from '@openscd/open-scd-core/open-scd.js';
import { SinonStub, restore, stub } from 'sinon';

import { IconButton } from '@material/mwc-icon-button';
import { ListItem } from '@material/mwc-list/mwc-list-item.js';

import type { TextField } from '@material/mwc-textfield';
import type ImportTemplateIedPlugin from '../../oscd-import-templates.js';

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

    await timeout(standardWait * 6);
    await document.fonts.ready;
  });

  afterEach(() => {
    restore();
    // TODO: Why? The following line needs to be commented, otherwise, errors in tests
    // editor.remove();
    plugin.remove();
    script.remove();
  });

  let doc: XMLDocument;

  describe('imports templates', () => {
    beforeEach(async () => {
      localStorage.clear();
      await tryViewportSet();
      resetMouse();

      doc = await fetch('/test/fixtures/new.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'));

      editor.docName = 'new.scd';
      editor.docs[editor.docName] = doc;

      await timeout(standardWait);
      await editor.updateComplete;
    });

    afterEach(async () => {
      localStorage.clear();
      restore();
    });

    it('attempts to load files', async () => {
      // expect(plugin.pluginFileUI).to.not.be.null;

      // we stub this as the file chooser dialog can only
      // be shown with a user activation
      const inputElement = (<SinonStub>(
        stub(plugin.pluginFileUI, 'click')
      )).callsFake(() => {});

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
      await timeout(standardWait * 5);

      expect(inputElement).calledOnce;
      inputElement.restore();
    });

    it('opens a dialog for a single IED', async function () {
      // we stub the files input as the file chooser dialog can only
      // be shown with a user activation
      const inputElement = (<SinonStub>(
        stub(plugin.pluginFileUI, 'click')
      )).callsFake(() => {});

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

      // results from file chooser dialog
      const template = await fetch('/test/fixtures/valid.icd');
      const fileList = new DataTransfer();
      const file = new File([await template.blob()], 'valid.icd', {
        type: 'application/xml'
      });
      fileList.items.add(file);

      // TODO: Figure out how to stub this using sinon
      Object.defineProperty(plugin.pluginFileUI, 'files', {
        writable: true,
        value: fileList.files
      });

      menuPlugin.click();
      plugin.pluginFileUI.dispatchEvent(new Event('change'));

      await timeout(standardWait * 2);
      await visualDiff(editor, testName(this));
      inputElement.restore();
    });

    it('imports a single IED', async () => {
      // we stub the files input as the file chooser dialog can only
      // be shown with a user activation
      const inputElement = (<SinonStub>(
        stub(plugin.pluginFileUI, 'click')
      )).callsFake(() => {});

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

      // results from file chooser dialog
      const template = await fetch('/test/fixtures/valid.icd');
      const fileList = new DataTransfer();
      const file = new File([await template.blob()], 'valid.icd', {
        type: 'application/xml'
      });
      fileList.items.add(file);

      // TODO: Figure out how to stub this using sinon
      Object.defineProperty(plugin.pluginFileUI, 'files', {
        writable: true,
        value: fileList.files
      });

      menuPlugin.click();
      plugin.pluginFileUI.dispatchEvent(new Event('change'));

      await timeout(standardWait);

      const addButton = plugin.shadowRoot!.querySelector(
        'mwc-button[slot="primaryAction"]'
      )! as HTMLElement;
      addButton.click();

      await plugin.updateComplete;
      await editor.updateComplete;
      await timeout(standardWait * 2);

      const iedName = editor.doc.querySelector('IED')!.getAttribute('name')!;
      expect(iedName).to.equal('TestMan_TestType_01');
      expect(editor.doc.querySelectorAll('IED').length).to.equal(1);
      expect(editor.doc.querySelectorAll('Communication').length).to.equal(1);
      expect(editor.doc.querySelectorAll('ConnectedAP').length).to.equal(1);
      inputElement.restore();
    });

    it('imports a single IED without communications addresses', async function () {
      // we stub the files input as the file chooser dialog can only
      // be shown with a user activation
      const inputElement = (<SinonStub>(
        stub(plugin.pluginFileUI, 'click')
      )).callsFake(() => {});

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

      // results from file chooser dialog
      const template = await fetch('/test/fixtures/valid.icd');
      const fileList = new DataTransfer();
      const file = new File([await template.blob()], 'valid.icd', {
        type: 'application/xml'
      });
      fileList.items.add(file);

      // TODO: Figure out how to stub this using sinon
      Object.defineProperty(plugin.pluginFileUI, 'files', {
        writable: true,
        value: fileList.files
      });

      menuPlugin.click();
      plugin.pluginFileUI.dispatchEvent(new Event('change'));

      await timeout(standardWait);

      const noCommsAddresses = plugin.shadowRoot!.querySelector(
        'mwc-checkbox[id="comms-addresses"]'
      )! as HTMLElement;
      noCommsAddresses.click();

      await resetMouse();
      await timeout(standardWait);
      await visualDiff(editor, testName(this));

      const addButton = plugin.shadowRoot!.querySelector(
        'mwc-button[slot="primaryAction"]'
      )! as HTMLElement;
      addButton.click();

      await plugin.updateComplete;
      await editor.updateComplete;
      await timeout(standardWait * 2);

      expect(editor.doc.querySelectorAll('IED').length).to.equal(1);
      expect(editor.doc.querySelectorAll('Communication').length).to.equal(0);
      expect(editor.doc.querySelectorAll('ConnectedAP').length).to.equal(0);
      inputElement.restore();
    });

    it('imports a single IED multiple times', async () => {
      // we stub the files input as the file chooser dialog can only
      // be shown with a user activation
      const inputElement = (<SinonStub>(
        stub(plugin.pluginFileUI, 'click')
      )).callsFake(() => {});

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

      // results from file chooser dialog
      const template = await fetch('/test/fixtures/valid.icd');
      const fileList = new DataTransfer();
      const file = new File([await template.blob()], 'valid.icd', {
        type: 'application/xml'
      });
      fileList.items.add(file);

      // TODO: Figure out how to stub this using sinon
      Object.defineProperty(plugin.pluginFileUI, 'files', {
        writable: true,
        value: fileList.files
      });

      menuPlugin.click();
      plugin.pluginFileUI.dispatchEvent(new Event('change'));

      await timeout(standardWait);

      const iedCount = plugin.shadowRoot!.querySelector(
        'ul[id="icd-list"] mwc-textfield:nth-of-type(1)'
      )! as TextField;
      iedCount.value = '2';

      const addButton = plugin.shadowRoot!.querySelector(
        'mwc-button[slot="primaryAction"]'
      )! as HTMLElement;
      addButton.click();

      await plugin.updateComplete;
      await editor.updateComplete;
      await timeout(standardWait * 2);

      expect(editor.doc.querySelectorAll('IED').length).to.equal(2);
      const iedNames = Array.from(editor.doc.querySelectorAll('IED')).map(ied =>
        ied.getAttribute('name')
      );
      expect(iedNames).to.deep.equal([
        'TestMan_TestType_02',
        'TestMan_TestType_01'
      ]);
      expect(editor.doc.querySelectorAll('Communication').length).to.equal(1);
      expect(editor.doc.querySelectorAll('ConnectedAP').length).to.equal(2);
      inputElement.restore();
    });

    it('imports multiple IEDs', async function () {
      // we stub the files input as the file chooser dialog can only
      // be shown with a user activation
      const inputElement = (<SinonStub>(
        stub(plugin.pluginFileUI, 'click')
      )).callsFake(() => {});

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

      // results from file chooser dialog
      const fileList = new DataTransfer();
      const template = await fetch('/test/fixtures/valid.icd');
      const file = new File([await template.blob()], 'valid.icd', {
        type: 'application/xml'
      });

      fileList.items.add(file);

      const template2 = await fetch('/test/fixtures/alsovalid.icd');
      const file2 = new File([await template2.blob()], 'alsovalid.icd', {
        type: 'application/xml'
      });

      fileList.items.add(file2);
      // TODO: Figure out how to stub this using sinon
      Object.defineProperty(plugin.pluginFileUI, 'files', {
        writable: true,
        value: fileList.files
      });

      menuPlugin.click();
      plugin.pluginFileUI.dispatchEvent(new Event('change'));

      await resetMouse();
      await timeout(standardWait);
      await visualDiff(editor, testName(this));

      const addButton = plugin.shadowRoot!.querySelector(
        'mwc-button[slot="primaryAction"]'
      )! as HTMLElement;
      addButton.click();

      await plugin.updateComplete;
      await editor.updateComplete;
      await timeout(standardWait * 2);

      expect(editor.doc.querySelectorAll('IED').length).to.equal(2);
      const iedNames = Array.from(editor.doc.querySelectorAll('IED')).map(ied =>
        ied.getAttribute('name')
      );
      expect(iedNames).to.deep.equal([
        'TestMan2_AnotherTestType_01',
        'TestMan_TestType_01'
      ]);
      expect(editor.doc.querySelectorAll('Communication').length).to.equal(1);
      expect(editor.doc.querySelectorAll('ConnectedAP').length).to.equal(2);
      inputElement.restore();
    });
  });
});

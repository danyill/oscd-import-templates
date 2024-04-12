import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { insertIed, isPublic } from '@openenergytools/scl-lib';
import { newEditEvent } from '@openscd/open-scd-core';
import type { Dialog } from '@material/mwc-dialog';
import type { Checkbox } from '@material/mwc-checkbox';

import '@material/dialog';
import '@material/mwc-button';
import '@material/mwc-checkbox';
import '@material/mwc-formfield';
import '@material/mwc-textfield';

import type { TextField } from '@material/mwc-textfield';

function uniqueTemplateIedName(doc: XMLDocument, ied: Element): string {
  // replace invalid characters
  const [manufacturer, type] = ['manufacturer', 'type'].map(attr =>
    ied.getAttribute(attr)?.replace(/[^A-Za-z0-9_]/, '')
  );
  const nameCore =
    manufacturer || type
      ? `${manufacturer ?? ''}${manufacturer && type ? '_' : ''}${type ? `${type}` : ''}`
      : 'TEMPLATE_IED';

  const siblingNames = Array.from(doc.querySelectorAll('IED'))
    .filter(isPublic)
    .map(child => child.getAttribute('name'));
  if (!siblingNames.length) return `${nameCore}_01`;

  let newName = '';
  for (let i = 0; i < siblingNames.length + 1; i += 1) {
    const newDigit = (i + 1).toString().padStart(2, '0');
    newName = `${nameCore}_${newDigit}`;

    if (!siblingNames.includes(newName)) return newName;
  }

  return newName;
}

function getTemplateIedDescription(doc: Document): {
  firstLine: string;
  secondLine: string;
} {
  const templateIed = doc.querySelector(':root > IED[name="TEMPLATE"]');
  const [
    manufacturer,
    type,
    desc,
    configVersion,
    originalSclVersion,
    originalSclRevision,
    originalSclRelease
  ] = [
    'manufacturer',
    'type',
    'desc',
    'configVersion',
    'originalSclVersion',
    'originalSclRevision',
    'originalSclRelease'
  ].map(attr => templateIed!.getAttribute(attr));

  const firstLine =
    manufacturer || type
      ? [manufacturer, type].filter(val => val !== null).join(' - ')
      : 'Unknown Manufacturer or Type';

  const schemaInformation = [
    originalSclVersion,
    originalSclRevision,
    originalSclRelease
  ]
    .filter(val => val !== null)
    .join('');

  const secondLine = [desc, configVersion, schemaInformation]
    .filter(val => val !== null)
    .join(' - ');

  return { firstLine, secondLine };
}

/**
 * Transfer namespace definitions from one element to another
 * @param destElement - Element to transfer namespaces to
 * @param sourceElement  - Element to transfer namespaces from
 */
function updateNamespaces(destElement: Element, sourceElement: Element) {
  Array.prototype.slice
    .call(sourceElement.attributes)
    .filter(attr => attr.name.startsWith('xmlns:'))
    .filter(attr => !destElement.hasAttribute(attr.name))
    .forEach(attr => {
      destElement.setAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        attr.name,
        attr.value
      );
    });
}

function validateOrReplaceInput(tf: TextField): void {
  if (!(parseInt(tf.value, 10) >= 0 && parseInt(tf.value, 10) <= 99)) {
    // eslint-disable-next-line no-param-reassign
    tf.value = '1';
  }
}

export default class ImportTemplateIedPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @state()
  importDocs?: XMLDocument[] = [];

  @state()
  editCount = -1;

  @query('#importTemplateIED-plugin-input') pluginFileUI!: HTMLInputElement;

  @query('mwc-dialog') dialog!: Dialog;

  @query('#icd-list') icdList!: HTMLUListElement;

  @query('#comms-addresses') importCommsAddressesUI!: Checkbox;

  @property({ attribute: false })
  inputSelected = false;

  @property({ attribute: false })
  importIedCount: number | null = null;

  failFast = false;

  errorString: string[] = [];

  async run(): Promise<void> {
    this.importDocs = [];
    this.inputSelected = false;
    this.importIedCount = null;
    this.pluginFileUI.click();
  }

  async docUpdate(): Promise<void> {
    await ((this.getRootNode() as ShadowRoot).host as LitElement)
      .updateComplete;
  }

  private async importTemplateIED(
    ied: Element,
    importQuantity: number
  ): Promise<void> {
    // This doesn't provide redo/undo capability as it is not using the Editing
    // action API. To use it would require us to cache the full SCL file in
    // OpenSCD as it is now which could use significant memory.
    // TODO: In open-scd core update this to allow including in undo/redo.

    updateNamespaces(
      this.doc.documentElement,
      ied.ownerDocument.documentElement
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _iedNumber of Array(importQuantity)) {
      const oldDocument = ied.ownerDocument;

      const newDocument = document.implementation.createDocument(
        'http://www.iec.ch/61850/2003/SCL',
        null,
        null
      );
      newDocument.appendChild(
        newDocument.importNode(oldDocument.documentElement, true)
      );

      const newIedName = uniqueTemplateIedName(this.doc, ied);
      const newIed = newDocument.querySelector(":root > IED[name='TEMPLATE']")!;

      newIed!.setAttribute('name', newIedName);

      // Update communication elements for new name
      // TODO: What else needs to be updated if anything?
      // Could also consider using updateIED from scl-lib
      Array.from(
        newDocument.querySelectorAll(
          ':root > Communication > SubNetwork > ConnectedAP[iedName="TEMPLATE"]'
        )
      ).forEach(connectedAp => connectedAp.setAttribute('iedName', newIedName));

      const edits = insertIed(this.doc.documentElement, newIed, {
        addCommunicationSection: this.importCommsAddressesUI.checked
      });

      this.dispatchEvent(newEditEvent(edits));

      await this.docUpdate();
    }
  }

  private async importTemplateIEDs(): Promise<void> {
    const itemImportCountArray = Array.from(
      this.dialog.querySelector('ul')!.querySelectorAll('mwc-textfield')
    ).map(item => parseInt(item.value, 10));

    for await (const [
      importQuantity,
      importDoc
    ] of this.importDocs!.entries()) {
      const templateIed = importDoc.querySelector('IED[name="TEMPLATE"]')!;
      const newIedCount = itemImportCountArray[importQuantity];
      if (newIedCount !== 0)
        await this.importTemplateIED(templateIed, newIedCount);
    }

    this.dialog.close();
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  public isImportValid(templateDoc: Document, filename: string): boolean {
    // TODO: Handle errorStrings and display to user in case of failure.
    if (!templateDoc) {
      // this.errorString.push(`Could not load file in ${filename}`);
      return false;
    }

    if (templateDoc.querySelector('parsererror')) {
      // this.errorString.push(`Parser error in ${filename}`);
      return false;
    }

    const ied = templateDoc.querySelector(':root > IED[name="TEMPLATE"]');
    if (!ied) {
      // this.errorString.push(`No Template IED element in the file ${filename}`);
      return false;
    }
    return true;
  }

  /** Loads the file `event.target.files[0]` into [[`src`]] as a `blob:...`. */
  protected async onLoadFiles(event: Event): Promise<void> {
    const files = Array.from(
      (<HTMLInputElement | null>event.target)?.files ?? []
    );

    const promises = files.map(async file => {
      const templateDoc = new DOMParser().parseFromString(
        await file.text(),
        'application/xml'
      );

      const validTemplate = this.isImportValid(templateDoc, file.name);
      if (validTemplate) this.importDocs!.push(templateDoc);
    });

    Promise.allSettled(promises).then(async () => {
      this.inputSelected = true;
      this.render();
      await this.updateComplete;
      this.icdList.querySelectorAll('mwc-textfield').forEach(textField =>
        textField.addEventListener('input', () => {
          validateOrReplaceInput(textField);
          this.getSumOfIedsToCreate();
        })
      );
      this.dialog.show();
    });
  }

  renderInput(): TemplateResult {
    return html`<input
      multiple
      @change=${(event: Event) => {
        this.onLoadFiles(event);
        // eslint-disable-next-line no-param-reassign
        (<HTMLInputElement>event.target).value = '';
      }}
      id="importTemplateIED-plugin-input"
      accept=".icd"
      type="file"
    />`;
  }

  // eslint-disable-next-line class-methods-use-this
  protected renderIcdListItem(doc: Document): TemplateResult {
    const { firstLine, secondLine } = getTemplateIedDescription(doc);

    return html`<li class="item">
      <mwc-icon>developer_board</mwc-icon>
      <div
        class="list-text"
        title="${firstLine}
${secondLine}"
      >
        <div class="first-line">${firstLine}</div>
        <div class="second-line">${secondLine}</div>
      </div>
      <mwc-textfield
        class="template-count"
        min="0"
        max="99"
        maxLength="2"
        type="number"
        value="1"
        required
      ></mwc-textfield>
    </li>`;
  }

  protected getSumOfIedsToCreate(): void {
    if (!this.dialog) return;
    let importIedCount = 0;

    const items = this.icdList.querySelectorAll('li');

    items.forEach(item => {
      importIedCount += parseInt(
        item.querySelector('mwc-textfield')!.value,
        10
      );
    });

    this.importIedCount = importIedCount;
  }

  protected renderIedSelection(): TemplateResult {
    const iedImportCount = this.importIedCount ?? this.importDocs?.length ?? 0;
    return html`<mwc-dialog heading="Import Template IEDs">
      <mwc-formfield label="Include Communications Addresses">
        <mwc-checkbox id="comms-addresses" checked></mwc-checkbox>
      </mwc-formfield>
      <ul id="icd-list">
        ${this.importDocs!.sort((a, b) => {
          const aSortstring = Array.from(
            Object.entries(getTemplateIedDescription(a))
          ).join(' ');
          const bSortstring = Array.from(
            Object.entries(getTemplateIedDescription(b))
          ).join(' ');
          return aSortstring.localeCompare(bSortstring);
        }).map(doc => this.renderIcdListItem(doc))}
      </ul>
      <mwc-button
        class="close-button"
        dialogAction="close"
        label="Close"
        slot="secondaryAction"
      ></mwc-button>
      <mwc-button
        label="IEDs (${iedImportCount})"
        slot="primaryAction"
        icon="add"
        @click=${this.importTemplateIEDs}
        ?disabled=${iedImportCount === 0}
      ></mwc-button>
    </mwc-dialog>`;
  }

  render(): TemplateResult {
    return this.inputSelected
      ? html`${this.renderIedSelection()}${this.renderInput()}`
      : html`${this.renderInput()}`;
  }

  static styles = css`
    input {
      width: 0;
      height: 0;
      opacity: 0;
    }

    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 15px;
      max-width: 100%;
    }

    .second-line {
      font-weight: 400;
      color: var(--mdc-theme-secondary, rgba(0, 0, 0, 0.54));
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .list-text {
      width: 100%;
      overflow: hidden;
    }

    mwc-icon {
      --mdc-icon-size: 32px;
    }

    mwc-icon {
      padding-right: 15px;
    }

    .close-button {
      --mdc-theme-primary: var(--mdc-theme-error);
    }
  `;
}

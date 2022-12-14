import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { msg, str } from '@lit/localize';

// import { configureLocalization, localized, msg, str } from '@lit/localize';
// import { get, translate } from 'lit-translate';

import '@material/mwc-list/mwc-check-list-item';
import '@material/dialog';
import '@material/mwc-button';
import { Dialog } from '@material/mwc-dialog';
import { List } from '@material/mwc-list';
import { ListItemBase } from '@material/mwc-list/mwc-list-item-base';
import { TextField } from '@material/mwc-textfield';

import { Edit, newEditEvent } from '@openscd/open-scd-core';

import { OscdFilteredList } from './foundation/components/oscd-filtered-list.js';
import './foundation/components/oscd-textfield.js';

// import {,
//   // newActionEvent,
//     newLogEvent,
//   // newPendingStateEvent,
//   SimpleAction,
//   ComplexAction,
// } from 'foundation/';

import { isPublic } from './foundation.js';
import { createElement } from './foundation/elements/create.js';
import { selector } from './foundation/identities/selector.js';

function uniqueTemplateIedName(doc: XMLDocument, ied: Element): string {
  const [manufacturer, type] = ['manufacturer', 'type'].map(attr =>
    ied.getAttribute(attr)?.replace(/[^A-Za-z0-9_]/, '')
  );
  const nameCore =
    manufacturer || type
      ? `${manufacturer ?? ''}${type ? `_${type}` : ''}`
      : 'TEMPLATE_IED';

  const siblingNames = Array.from(doc.querySelectorAll('IED'))
    .filter(isPublic)
    .map(child => child.getAttribute('name') ?? child.tagName);
  if (!siblingNames.length) return `${nameCore}_01`;

  let newName = '';
  for (let i = 0; i < siblingNames.length + 1; i += 1) {
    const newDigit = (i + 1).toString().padStart(2, '0');
    newName = `${nameCore}_${newDigit}`;

    if (!siblingNames.includes(newName)) return newName;
  }

  return newName;
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

function getSubNetwork(elements: Element[], element: Element): Element {
  const existElement = elements.find(
    item => item.getAttribute('name') === element.getAttribute('name')
  );
  return existElement || <Element>element.cloneNode(false);
}

/**
 * Creates and array of actions to transfer an SCL Communication section from an SCL document containing
 * ied to doc, creating an SCL Communication element if required.
 * Adds elements to existing Subnetworks where possible and creates the Subnetworks when necessary. Then
 * transfers ConnectedAP elements.
 * @param ied - SCL IED containing ConnectedAPs
 * @param doc - SCL document to receive Communication elements
 * @returns Array of actions to transfer the SCL section
 */
function addCommunicationElements(ied: Element, doc: XMLDocument): Edit[] {
  const edits = [];

  const oldCommunicationElement = doc.querySelector(':root > Communication');

  const communication =
    oldCommunicationElement || createElement(doc, 'Communication', {});

  if (!oldCommunicationElement)
    // edits.push({
    //   new: {
    //     parent: doc.querySelector(':root')!,
    //     element: communication,
    //   },
    // });
    edits.push({
      parent: doc.querySelector(':root')!,
      node: communication,
      reference: null,
    });

  const connectedAPs = Array.from(
    ied.ownerDocument.querySelectorAll(
      `:root > Communication > SubNetwork > ConnectedAP[iedName="${ied.getAttribute(
        'name'
      )}"]`
    )
  );

  const createdSubNetworks: Element[] = [];

  connectedAPs.forEach(connectedAP => {
    const newSubNetwork = <Element>connectedAP.parentElement!;
    const oldSubNetworkMatch = communication.querySelector(
      `:root > Communication > SubNetwork[name="${newSubNetwork.getAttribute(
        'name'
      )}"]`
    );

    const subNetwork =
      oldSubNetworkMatch || getSubNetwork(createdSubNetworks, newSubNetwork);
    const element = <Element>connectedAP.cloneNode(true);

    if (!oldSubNetworkMatch && !createdSubNetworks.includes(subNetwork)) {
      // edits.push({
      //   new: {
      //     parent: communication,
      //     element: subNetwork,
      //   },
      // });
      edits.push({
        parent: communication,
        node: subNetwork,
        reference: null,
      });

      createdSubNetworks.push(subNetwork);
    }

    edits.push({
      parent: subNetwork,
      node: element,
      reference: null,
    });

    // edits.push({
    //   new: {
    //     parent: subNetwork,
    //     element,
    //   },
    // });
  });

  return edits;
}

/**
 * Recursively checks from children to parents that an SCL Datatype Template called type
 * is used within an ied. When the first one is found returns true.
 * @param type - An SCL DataTypeTemplate.
 * @param ied - An SCL IED element.
 * @returns true if there is a connection, otherwise false.
 */
function hasConnectionToIed(type: Element, ied: Element): boolean {
  const data: Element = type.parentElement!;
  const id = type.getAttribute('id');

  if (!data || !id) return false;

  if (type.tagName === 'EnumType')
    return Array.from(
      data.querySelectorAll(
        `DOType > DA[type="${id}"],DAType > BDA[type="${id}"]`
      )
    ).some(typeChild => hasConnectionToIed(typeChild.parentElement!, ied));

  if (type.tagName === 'DAType')
    return Array.from(
      data.querySelectorAll(
        `DOType > DA[type="${id}"],DAType > BDA[type="${id}"]`
      )
    ).some(typeChild => hasConnectionToIed(typeChild.parentElement!, ied));

  if (type.tagName === 'DOType')
    return Array.from(
      data.querySelectorAll(
        `LNodeType > DO[type="${id}"], DOType > SDO[type="${id}"]`
      )
    ).some(typeChild => hasConnectionToIed(typeChild.parentElement!, ied));

  return Array.from(ied.getElementsByTagName('LN0'))
    .concat(Array.from(ied.getElementsByTagName('LN')))
    .some(anyln => anyln.getAttribute('lnType') === id);
}

/**
 * Adds new EnumType used by ied to parent. Parent would typically be the DataTypeTemplate SCL section.
 * NOTE: Updates the EnumType id within the ied if it already exists in the parent.
 * @param ied - SCL IED
 * @param enumType - SCL EnumType (typically associated with ied)
 * @param parent - element where changes are required (e.g. DataTypeTemplates)
 * @returns a SimpleAction representing the change.
 */
function addEnumType(
  ied: Element,
  enumType: Element,
  parent: Element
): Edit | undefined {
  if (!hasConnectionToIed(enumType, ied)) return;

  const existEnumType = parent.querySelector(
    `EnumType[id="${enumType.getAttribute('id')}"]`
  );
  if (existEnumType && enumType.isEqualNode(existEnumType)) return;

  if (existEnumType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const data: Element = enumType.parentElement!;
    const idOld = enumType.getAttribute('id');
    const idNew = ied.getAttribute('name')! + idOld;
    enumType.setAttribute('id', idNew);

    data
      .querySelectorAll(
        `DOType > DA[type="${idOld}"],DAType > BDA[type="${idOld}"]`
      )
      .forEach(type => type.setAttribute('type', idNew));
  }

  // eslint-disable-next-line consistent-return
  return {
    parent,
    node: enumType,
    reference: null,
  };
  // eslint-disable-next-line consistent-return
  // return {
  //   new: {
  //     parent,
  //     element: enumType,
  //   },
  // };
}

/**
 * Adds new DAType used by ied to parent. Parent would typically be the DataTypeTemplate SCL section.
 * NOTE: Updates the DAType id within the ied if it already exists in the parent.
 * @param ied - SCL IED
 * @param dAType - SCL DAType (typically associated with ied)
 * @param parent - element where changes are required (e.g. DataTypeTemplates)
 * @returns a SimpleAction representing the change.
 */
function addDAType(
  ied: Element,
  daType: Element,
  parent: Element
): Edit | undefined {
  if (!hasConnectionToIed(daType, ied)) return;

  const existDAType = parent.querySelector(
    `DAType[id="${daType.getAttribute('id')}"]`
  );
  if (existDAType && daType.isEqualNode(existDAType)) return;

  if (existDAType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const data: Element | null = daType.parentElement!;
    const idOld = daType.getAttribute('id');
    const idNew = ied.getAttribute('name')! + idOld;
    daType.setAttribute('id', idNew);

    data
      .querySelectorAll(
        `DOType > DA[type="${idOld}"],DAType > BDA[type="${idOld}"]`
      )
      .forEach(type => type.setAttribute('type', idNew));
  }

  // eslint-disable-next-line consistent-return
  return {
    parent,
    node: daType,
    reference: null,
  };

  // return {
  //   new: {
  //     parent,
  //     element: daType,
  //   },
  // };
}

/**
 * Adds new DOType used by ied to parent. Parent would typically be the DataTypeTemplate SCL section.
 * NOTE: Updates the DOType id within the ied if it already exists in the parent.
 * @param ied - SCL IED
 * @param doType - SCL DOType (typically associated with ied)
 * @param parent - element where changes are required (e.g. DataTypeTemplates)
 * @returns a SimpleAction representing the change.
 */
function addDOType(
  ied: Element,
  doType: Element,
  parent: Element
): Edit | undefined {
  if (!hasConnectionToIed(doType, ied)) return;

  const existDOType = parent.querySelector(
    `DOType[id="${doType.getAttribute('id')}"]`
  );
  if (existDOType && doType.isEqualNode(existDOType)) return;

  if (existDOType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const data: Element = doType.parentElement!;
    const idOld = doType.getAttribute('id');
    const idNew = ied.getAttribute('name')! + idOld;
    doType.setAttribute('id', idNew);

    data
      .querySelectorAll(
        `LNodeType > DO[type="${idOld}"], DOType > SDO[type="${idOld}"]`
      )
      .forEach(type => type.setAttribute('type', idNew));
  }

  // eslint-disable-next-line consistent-return
  return {
    parent,
    node: doType,
    reference: null,
  };
  // eslint-disable-next-line consistent-return
  // return {
  //   new: {
  //     parent,
  //     element: doType,
  //   },
  // };
}

/**
 * Adds new LNodeType used by ied to parent. Parent would typically be the DataTypeTemplate SCL section.
 * NOTE: Updates the lNodeType id within the ied if it already exists in the parent.
 * @param ied - SCL IED
 * @param lNodeType - SCL LNodeType (typically associated with ied)
 * @param parent - element where changes are required (e.g. DataTypeTemplates)
 * @returns a SimpleAction representing the change.
 */
function addLNodeType(
  ied: Element,
  lNodeType: Element,
  parent: Element
): Edit | undefined {
  if (!hasConnectionToIed(lNodeType, ied)) return;

  const existLNodeType = parent.querySelector(
    `LNodeType[id="${lNodeType.getAttribute('id')}"]`
  );
  if (existLNodeType && lNodeType.isEqualNode(existLNodeType)) return;

  if (existLNodeType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const idOld = lNodeType.getAttribute('id')!;
    const idNew = ied.getAttribute('name')!.concat(idOld);
    lNodeType.setAttribute('id', idNew);

    Array.from(
      ied.querySelectorAll(`LN0[lnType="${idOld}"],LN[lnType="${idOld}"]`)
    )
      .filter(isPublic)
      .forEach(ln => ln.setAttribute('lnType', idNew));
  }

  // eslint-disable-next-line consistent-return
  // return {
  //   new: {
  //     parent,
  //     element: lNodeType,
  //   },
  // };
  // eslint-disable-next-line consistent-return
  return {
    parent,
    node: lNodeType,
    reference: null,
  };
}

/**
 * Get datatype templates used by ied to doc and return actions array for changes required.
 * Will create an SCL or DataTypeTemplates section if not present.
 * NOTE: Will adjust the ied type names if there is a conflict in type ids with the existing doc.
 * @param ied - SCL IED beingwhich uses datatype templates
 * @param doc - project where SCL datatype templates
 * @returns an array of actions consisting of LNodeType, DOType, DAType and EnumTypes
 */
function addDataTypeTemplates(ied: Element, doc: XMLDocument): Edit[] {
  const edits: Edit[] | undefined = [];

  const dataTypeTemplates = doc.querySelector(':root > DataTypeTemplates')
    ? doc.querySelector(':root > DataTypeTemplates')!
    : createElement(doc, 'DataTypeTemplates', {});

  if (!dataTypeTemplates.parentElement) {
    // edits.push({
    //   new: {
    //     parent: doc.querySelector('SCL')!,
    //     element: dataTypeTemplates,
    //   },
    // });
    edits.push({
      parent: doc.querySelector('SCL')!,
      node: dataTypeTemplates,
      reference: null,
    });
  }

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > LNodeType')
    .forEach(lNodeType =>
      edits.push(<Edit>addLNodeType(ied, lNodeType, dataTypeTemplates!))
    );

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > DOType')
    .forEach(doType =>
      edits.push(<Edit>addDOType(ied, doType, dataTypeTemplates!))
    );

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > DAType')
    .forEach(daType =>
      edits.push(<Edit>addDAType(ied, daType, dataTypeTemplates!))
    );

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > EnumType')
    .forEach(enumType =>
      edits.push(<Edit>addEnumType(ied, enumType, dataTypeTemplates!))
    );

  return <Edit[]>edits.filter(item => item !== undefined);
}

// function isIedNameUnique(ied: Element, doc: Document): boolean {
//   const existingIedNames = Array.from(doc.querySelectorAll(':root > IED')).map(
//     ied => ied.getAttribute('name')!
//   );
//   const importedIedName = ied.getAttribute('name')!;

//   if (existingIedNames.includes(importedIedName)) return false;

//   return true;
// }

// function resetSelection(dialog: Dialog): void {
//   (
//     (dialog.querySelector('filtered-list') as List).selected as ListItemBase[]
//   ).forEach(item => (item.selected = false));
// }

function validateOrReplaceInput(tf: TextField): void {
  /* eslint no-param-reassign: ["error", { "props": false }] */
  if (!(parseInt(tf.value, 10) >= 0 && parseInt(tf.value, 10) <= 99))
    tf.value = '1';
}

// function sleep(milliseconds: number) {
//   const date = Date.now();
//   let currentDate = null;
//   do {
//     currentDate = Date.now();
//   } while (currentDate - date < milliseconds);
// }

export default class ImportTemplateIedPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @state()
  importDocs?: XMLDocument[] = [];

  @query('#importTemplateIED-plugin-input') pluginFileUI!: HTMLInputElement;

  @query('mwc-dialog') dialog!: Dialog;

  @query('oscd-filtered-list') filteredList!: OscdFilteredList;

  @property({ attribute: false })
  inputSelected = false;

  @property({ attribute: false })
  importIedCount: number | null = null;

  failFast = false;

  // constructor() {
  //   super();
  //   // this.play = this.play.bind(this);
  // }

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

    for (let iedCount = 0; iedCount < importQuantity; iedCount += 1) {
      const iedCopy = <Element>ied.cloneNode(true);
      const newIedName = uniqueTemplateIedName(this.doc, iedCopy);
      iedCopy.setAttribute('name', newIedName);

      let edits: Edit[] = addDataTypeTemplates(iedCopy, this.doc);

      Array.from(
        iedCopy.ownerDocument.querySelectorAll(
          ':root > Communication > SubNetwork > ConnectedAP[iedName="TEMPLATE"]'
        )
      ).forEach(connectedAp => connectedAp.setAttribute('iedName', newIedName));
      edits = edits.concat(addCommunicationElements(iedCopy, this.doc));

      // edits.push({
      //   new: {
      //     parent: this.doc!.querySelector(':root')!,
      //     element: iedCopy,
      //   },
      // });
      edits.push({
        parent: this.doc!.querySelector(':root')!,
        node: iedCopy,
        reference: null,
      });

      // const complexAction: ComplexAction = {
      //   actions: actions,
      //   title: msg(str`'Imported ${newIedName} of type ${ied.getAttribute('type') ?? 'Unknown'}`),
      // };

      // sleep(1000)
      // if (this.failFast) return
      this.dispatchEvent(newEditEvent(edits));
      // this.dispatchEvent(newEditEvent(complexAction));
      // eslint-disable-next-line no-await-in-loop
      await this.docUpdate();
      // if (this.failFast) return
      // sleep(1000)
    }
  }

  // private play() {
  //   console.log(this.doc);
  // }

  private async importTemplateIEDs(): Promise<void> {
    // window.addEventListener('log', event => {
    //   console.log(event.detail);
    //   if (event.detail.kind === 'warning') {
    //     this.failFast = true
    //     console.log('please give up')
    //     this.play()
    //     console.log(this.doc)
    //   }
    // });

    // const itemImportCountArray = (<List>(
    //   this.dialog.querySelector('oscd-filtered-list')
    // )).items.map(item =>
    //   parseInt(item.querySelector('mwc-textfield')!.value, 10)
    // );

    const itemImportCountArray = Array.from((<List>(
      this.dialog.querySelector('oscd-filtered-list')
    )).querySelectorAll('oscd-textfield')).map(item =>
      parseInt((<TextField>item).value, 10)
    );

    for (const [importQuantity, importDoc] of this.importDocs!.entries()) {
      const templateIed = importDoc.querySelector(selector('IED', 'TEMPLATE'))!;
      const newIedCount = itemImportCountArray[importQuantity];
      if (newIedCount !== 0)
        // eslint-disable-next-line no-await-in-loop
        await this.importTemplateIED(templateIed, newIedCount);
    }

    this.dialog.close();
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  public isImportValid(templateDoc: Document, filename: string): boolean {
    if (!templateDoc) {
      // TODO:
      // this.dispatchEvent(
      //   newLogEvent({
      //     kind: 'error',
      //     title: msg(str`Could not load file in ${filename}`),
      //   })
      // );
      return false;
    }

    if (templateDoc.querySelector('parsererror')) {
      // TODO:
      // this.dispatchEvent(
      //   newLogEvent({
      //     kind: 'error',
      //     title: msg(str`Parser error in ${filename}`),
      //   })
      // );
      return false;
    }

    const ied = templateDoc.querySelector(':root > IED[name="TEMPLATE"]');
    if (!ied) {
      // TODO:
      // this.dispatchEvent(
      //   newLogEvent({
      //     kind: 'error',
      //     title: msg(str`No Template IED element in the file ${filename}`),
      //   })
      // );
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
      // render the dialog after processing imports
      this.render();
      await this.updateComplete;
      // listener to validate textfield input and display total IEDs
      (<TextField[]>(
        (<unknown>this.filteredList.querySelectorAll('oscd-textfield'))
      )).forEach(textField =>
        textField.addEventListener('input', () => {
          validateOrReplaceInput(textField);
          this.getSumOfIedsToCreate();
        })
      );
      
    }).then(() => this.dialog.show());
    // .then(()=>{
      
    // })

    
  }

  protected renderInput(): TemplateResult {
    // this.inputSelected = true;
    return html`<input multiple @change=${(event: Event) => {
      this.onLoadFiles(event);
      (<HTMLInputElement>event.target).value = '';
    }} id="importTemplateIED-plugin-input" accept=".icd" type="file"></input>`;
  }

  // eslint-disable-next-line class-methods-use-this
  protected renderIcdListItem(doc: Document): TemplateResult {
    const templateIed = doc?.querySelector(':root > IED[name="TEMPLATE"]');
    const [
      manufacturer,
      type,
      desc,
      configVersion,
      originalSclVersion,
      originalSclRevision,
      originalSclRelease,
    ] = [
      'manufacturer',
      'type',
      'desc',
      'configVersion',
      'originalSclVersion',
      'originalSclRevision',
      'originalSclRelease',
    ].map(attr => templateIed?.getAttribute(attr));

    const firstLine = [manufacturer, type]
      .filter(val => val !== null)
      .join(' - ');

    const schemaInformation = [
      originalSclVersion,
      originalSclRevision,
      originalSclRelease,
    ]
      .filter(val => val !== null)
      .join('');

    const secondLine = [desc, configVersion, schemaInformation]
      .filter(val => val !== null)
      .join(' - ');

    return html`<mwc-list-item twoline value="${firstLine}" graphic="icon">
      <span class="first-line">${firstLine}</span>
      <span class="second-line" slot="secondary">${secondLine}</span>
      <oscd-textfield
        class="template-count"
        min="0"
        max="99"
        maxLength="2"
        type="number"
        value="1"
        required
      ></oscd-textfield>
      <mwc-icon slot="graphic">developer_board</mwc-icon>
    </mwc-list-item>`;
  }

  protected getSumOfIedsToCreate(): void {
    if (!this.dialog) return;
    let importIedCount = 0;
    const items = <ListItemBase[]>(
      (<List>this.dialog?.querySelector('oscd-filtered-list')).items
    );
    items.forEach(item => {
      importIedCount += parseInt(
        (<TextField>item.querySelector('oscd-textfield')!).value,
        10
      );
    });
    this.importIedCount = importIedCount;
  }

  protected renderIedSelection(): TemplateResult {
    const iedImportCount = this.importIedCount ?? this.importDocs?.length ?? 0;
    return html`<mwc-dialog heading="${msg('Import Template IEDs')}">
      <oscd-filtered-list multi>
        ${this.importDocs!.map(doc => this.renderIcdListItem(doc))}
      </oscd-filtered-list>
      <mwc-button
        class="close-button"
        dialogAction="close"
        label="${msg('close')}"
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
    /* input {
      width: 0;
      height: 0;
      opacity: 0;
    }

    .close-button {
      --mdc-theme-primary: var(--mdc-theme-error);
    }

    .first-line,
    .second-line {
      display: inline-flex;
      overflow: hidden;
      text-overflow: clip;
      width: 250px;
    }

    .template-count {
      display: inline-flex;
      padding-left: 5px;
    }

    mwc-list-item {
      display: flex;
    }

    mwc-list-item.hidden {
      display: none;
    }

    @media (max-width: 499px) {
      .first-line,
      .second-line {
        width: 200px;
        overflow: hidden;
        text-overflow: clip;
      }
    } */
  `;
}

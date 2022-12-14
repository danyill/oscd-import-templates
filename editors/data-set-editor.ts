import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import '@material/mwc-button';
import '@material/mwc-list/mwc-list-item';
import type { Button } from '@material/mwc-button';
import type { ListItem } from '@material/mwc-list/mwc-list-item';

import './data-set-element-editor.js';
import '../foundation/components/oscd-filtered-list.js';
import type { OscdFilteredList } from '../foundation/components/oscd-filtered-list.js';

import { styles, updateElementReference } from '../foundation.js';
import { selector } from '../foundation/identities/selector.js';
import { identity } from '../foundation/identities/identity.js';

@customElement('data-set-editor')
export class DataSetEditor extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @state()
  selectedDataSet?: Element;

  @query('.selectionlist') selectionList!: OscdFilteredList;

  @query('mwc-button') selectDataSetButton!: Button;

  /** Resets selected GOOSE, if not existing in new doc */
  update(props: Map<string | number | symbol, unknown>): void {
    if (props.has('doc') && this.selectedDataSet) {
      const newDataSet = updateElementReference(this.doc, this.selectedDataSet);

      this.selectedDataSet = newDataSet ?? undefined;

      if (!newDataSet && this.selectionList && this.selectionList.selected)
        (this.selectionList.selected as ListItem).selected = false;
    }

    super.update(props);
  }

  private selectDataSet(evt: Event): void {
    const id = ((evt.target as OscdFilteredList).selected as ListItem).value;
    const dataSet = this.doc.querySelector(selector('DataSet', id));

    if (dataSet) {
      this.selectedDataSet = dataSet;
      (evt.target as OscdFilteredList).classList.add('hidden');
      this.selectDataSetButton.classList.remove('hidden');
    }
  }

  private renderElementEditorContainer(): TemplateResult {
    if (this.selectedDataSet)
      return html`<div class="elementeditorcontainer">
        <data-set-element-editor
          .element=${this.selectedDataSet}
        ></data-set-element-editor>
      </div>`;

    return html``;
  }

  private renderSelectionList(): TemplateResult {
    return html`<oscd-filtered-list
      activatable
      @action=${this.selectDataSet}
      class="selectionlist"
      >${Array.from(this.doc.querySelectorAll('IED')).flatMap(ied => {
        const ieditem = html`<mwc-list-item
            class="listitem header"
            noninteractive
            graphic="icon"
            value="${Array.from(ied.querySelectorAll('DataSet'))
              .map(element => {
                const id = identity(element) as string;
                return typeof id === 'string' ? id : '';
              })
              .join(' ')}"
          >
            <span>${ied.getAttribute('name')}</span>
            <mwc-icon slot="graphic">developer_board</mwc-icon>
          </mwc-list-item>
          <li divider role="separator"></li>`;

        const dataSets = Array.from(ied.querySelectorAll('DataSet')).map(
          dataSet =>
            html`<mwc-list-item twoline value="${identity(dataSet)}"
              ><span>${dataSet.getAttribute('name')}</span
              ><span slot="secondary">${identity(dataSet)}</span>
            </mwc-list-item>`
        );

        return [ieditem, ...dataSets];
      })}</oscd-filtered-list
    >`;
  }

  private renderToggleButton(): TemplateResult {
    return html`<mwc-button
      outlined
      label="publisher.selectbutton.DataSet"
      @click=${() => {
        this.selectionList.classList.remove('hidden');
        this.selectDataSetButton.classList.add('hidden');
      }}
    ></mwc-button>`;
  }

  render(): TemplateResult {
    return html`${this.renderToggleButton()}
      <div class="content">
        ${this.renderSelectionList()}${this.renderElementEditorContainer()}
      </div>`;
  }

  static styles = css`
    ${styles}

    data-set-element-editor {
      flex: auto;
    }
  `;
}

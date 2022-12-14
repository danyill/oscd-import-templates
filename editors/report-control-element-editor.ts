import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../foundation/components/oscd-checkbox.js';
import '../foundation/components/oscd-textfield.js';
import '../foundation/components/oscd-select.js';
import { maxLength, patterns } from '../foundation/pattern.js';
import { identity } from '../foundation/identities/identity.js';

@customElement('report-control-element-editor')
export class ReportControlElementEditor extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** The element being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  element!: Element;

  private renderOptFieldsContent(): TemplateResult {
    const [
      seqNum,
      timeStamp,
      dataSet,
      reasonCode,
      dataRef,
      entryID,
      configRef,
      bufOvfl,
    ] = [
      'seqNum',
      'timeStamp',
      'dataSet',
      'reasonCode',
      'dataRef',
      'entryID',
      'configRef',
      'bufOvfl',
    ].map(
      attr =>
        this.element.querySelector('OptFields')?.getAttribute(attr) ?? null
    );

    return html`<h3>Optional Fields</h3>
      ${Object.entries({
        seqNum,
        timeStamp,
        dataSet,
        reasonCode,
        dataRef,
        entryID,
        configRef,
        bufOvfl,
      }).map(
        ([key, value]) =>
          html`<oscd-checkbox
            label="${key}"
            .maybeValue=${value}
            nullable
            helper="scl.key"
            disabled
          ></oscd-checkbox>`
      )}`;
  }

  private renderTrgOpsContent(): TemplateResult {
    const [dchg, qchg, dupd, period, gi] = [
      'dchg',
      'qchg',
      'dupd',
      'period',
      'gi',
    ].map(
      attr => this.element.querySelector('TrgOps')?.getAttribute(attr) ?? null
    );

    return html` <h3>Trigger Options</h3>
      ${Object.entries({ dchg, qchg, dupd, period, gi }).map(
        ([key, value]) =>
          html`<oscd-checkbox
            label="${key}"
            .maybeValue=${value}
            nullable
            helper="scl.key"
            disabled
          ></oscd-checkbox>`
      )}`;
  }

  private renderChildElements(): TemplateResult {
    return html`<div class="content">
      ${this.renderTrgOpsContent()}${this.renderOptFieldsContent()}
    </div>`;
  }

  private renderReportControlContent(): TemplateResult {
    const [name, desc, buffered, rptID, indexed, bufTime, intgPd] = [
      'name',
      'desc',
      'buffered',
      'rptID',
      'indexed',
      'bufTime',
      'intgPd',
    ].map(attr => this.element?.getAttribute(attr));
    const max =
      this.element.querySelector('RptEnabled')?.getAttribute('max') ?? null;

    return html`<div class="content">
      <oscd-textfield
        label="name"
        .maybeValue=${name}
        helper="'scl.name')}"
        required
        validationMessage="'textfield.required')}"
        pattern="${patterns.asciName}"
        maxLength="${maxLength.cbName}"
        dialogInitialFocus
        disabled
      ></oscd-textfield
      ><oscd-textfield
        label="desc"
        .maybeValue=${desc}
        nullable
        helper="'scl.desc')}"
        disabled
      ></oscd-textfield
      ><oscd-checkbox
        label="buffered"
        .maybeValue=${buffered}
        helper="'scl.buffered')}"
        disabled
      ></oscd-checkbox
      ><oscd-textfield
        label="rptID"
        .maybeValue=${rptID}
        nullable
        required
        helper="'report.rptID')}"
        disabled
      ></oscd-textfield
      ><oscd-checkbox
        label="indexed"
        .maybeValue=${indexed}
        nullable
        helper="'scl.indexed')}"
        disabled
      ></oscd-checkbox
      ><oscd-textfield
        label="max Clients"
        .maybeValue=${max}
        helper="'scl.maxReport')}"
        nullable
        type="number"
        suffix="#"
        disabled
      ></oscd-textfield
      ><oscd-textfield
        label="bufTime"
        .maybeValue=${bufTime}
        helper="'scl.bufTime')}"
        nullable
        required
        type="number"
        min="0"
        suffix="ms"
        disabled
      ></oscd-textfield
      ><oscd-textfield
        label="intgPd"
        .maybeValue=${intgPd}
        helper="'scl.intgPd')}"
        nullable
        required
        type="number"
        min="0"
        suffix="ms"
        disabled
      ></oscd-textfield>
    </div>`;
  }

  render(): TemplateResult {
    if (this.element)
      return html`<h2 style="display: flex;">
          <div style="flex:auto">
            <div>ReportControl</div>
            <div class="headersubtitle">${identity(this.element)}</div>
          </div>
        </h2>
        <div class="parentcontent">
          ${this.renderReportControlContent()}${this.renderChildElements()}
        </div>`;

    return html`<div class="content">
      <h2>'publisher.nodataset')}</h2>
    </div>`;
  }

  static styles = css`
    .parentcontent {
      display: grid;
      grid-gap: 12px;
      box-sizing: border-box;
      grid-template-columns: repeat(auto-fit, minmax(316px, auto));
    }

    .content {
      border-left: thick solid var(--mdc-theme-on-primary);
    }

    .content > * {
      display: block;
      margin: 4px 8px 16px;
    }

    h2,
    h3 {
      color: var(--mdc-theme-on-surface);
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      margin: 4px 8px 16px;
      padding-left: 0.3em;
    }

    .headersubtitle {
      font-size: 16px;
      font-weight: 200;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    *[iconTrailing='search'] {
      --mdc-shape-small: 28px;
    }

    @media (max-width: 950px) {
      .content {
        border-left: 0px solid var(--mdc-theme-on-primary);
      }
    }
  `;
}

import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '@material/mwc-formfield';
import '@material/mwc-checkbox';

import '../foundation/components/oscd-checkbox.js';
import '../foundation/components/oscd-select.js';
import '../foundation/components/oscd-textfield.js';
import {
  maxLength,
  patterns,
  typeNullable,
  typePattern,
} from '../foundation/pattern.js';
import { identity } from '../foundation/identities/identity.js';

@customElement('sampled-value-control-element-editor')
export class SampledValueControlElementEditor extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** The element being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  element!: Element;

  @property({ attribute: false })
  get sMV(): Element | null {
    const cbName = this.element.getAttribute('name');
    const iedName = this.element.closest('IED')?.getAttribute('name');
    const apName = this.element.closest('AccessPoint')?.getAttribute('name');
    const ldInst = this.element.closest('LDevice')?.getAttribute('inst');

    return this.element.ownerDocument.querySelector(
      `:root > Communication > SubNetwork > ` +
        `ConnectedAP[iedName="${iedName}"][apName="${apName}"] > ` +
        `SMV[ldInst="${ldInst}"][cbName="${cbName}"]`
    );
  }

  private renderSmvContent(): TemplateResult {
    const { sMV } = this;
    if (!sMV)
      return html` <h3>
        <div>'publisher.smv.commsetting</div>
        <div class="headersubtitle">publisher.smv.noconnectionap'</div>
      </h3>`;

    const hasInstType = Array.from(sMV.querySelectorAll('Address > P')).some(
      pType => pType.getAttribute('xsi:type')
    );

    const attributes: Record<string, string | null> = {};

    ['MAC-Address', 'APPID', 'VLAN-ID', 'VLAN-PRIORITY'].forEach(key => {
      if (!attributes[key])
        attributes[key] =
          sMV
            .querySelector(`Address > P[type="${key}"]`)
            ?.textContent?.trim() ?? null;
    });

    return html` <h3>'publisher.smv.commsetting'</h3>
      <mwc-formfield label="'connectedap.wizard.addschemainsttype')}"
        ><mwc-checkbox
          id="instType"
          ?checked="${hasInstType}"
          disabled
        ></mwc-checkbox></mwc-formfield
      >${Object.entries(attributes).map(
        ([key, value]) =>
          html`<oscd-textfield
            label="${key}"
            ?nullable=${typeNullable[key]}
            .maybeValue=${value}
            pattern="${typePattern[key]!}"
            required
            disabled
          ></oscd-textfield>`
      )}`;
  }

  private renderSmvOptsContent(): TemplateResult {
    const [refreshTime, sampleRate, dataSet, security, synchSourceId] = [
      'refreshTime',
      'sampleRate',
      'dataSet',
      'security',
      'synchSourceId',
    ].map(
      attr => this.element.querySelector('SmvOpts')?.getAttribute(attr) ?? null
    );

    return html`<h3>'publisher.smv.smvopts'</h3>
      ${Object.entries({
        refreshTime,
        sampleRate,
        dataSet,
        security,
        synchSourceId,
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

  private renderOtherElements(): TemplateResult {
    return html`<div class="content">
      ${this.renderSmvOptsContent()}${this.renderSmvContent()}
    </div>`;
  }

  private renderSmvControlContent() {
    const [
      name,
      desc,
      multicast,
      smvID,
      smpMod,
      smpRate,
      nofASDU,
      securityEnabled,
    ] = [
      'name',
      'desc',
      'multicast',
      'smvID',
      'smpMod',
      'smpRate',
      'nofASDU',
      'securityEnabled',
    ].map(attr => this.element?.getAttribute(attr));

    return html`<div class="content">
      <oscd-textfield
        label="name"
        .maybeValue=${name}
        helper="scl.name"
        required
        validationMessage="textfield.required')}"
        pattern="${patterns.asciName}"
        maxLength="${maxLength.cbName}"
        dialogInitialFocus
        disabled
      ></oscd-textfield>
      <oscd-textfield
        label="desc"
        .maybeValue=${desc}
        nullable
        helper="scl.desc')}"
        disabled
      ></oscd-textfield>
      ${multicast === 'true'
        ? html``
        : html`<oscd-checkbox
            label="multicast"
            .maybeValue=${multicast}
            helper="scl.multicast')}"
            disabled
          ></oscd-checkbox>`}
      <oscd-textfield
        label="smvID"
        .maybeValue=${smvID}
        helper="scl.id')}"
        required
        voscd-textfield="textfield.nonempty')}"
        disabled
      ></oscd-textfield>
      <oscd-select
        label="smpMod"
        .maybeValue=${smpMod}
        nullable
        required
        helper="scl.smpMod')}"
        disabled
        >${['SmpPerPeriod', 'SmpPerSec', 'SecPerSmp'].map(
          option =>
            html`<mwc-list-item value="${option}">${option}</mwc-list-item>`
        )}</oscd-select
      >
      <oscd-textfield
        label="smpRate"
        .maybeValue=${smpRate}
        helper="scl.smpRate')}"
        required
        type="number"
        moscd-textfield
        oscd-textfield
      ></oscd-textfield>
      <oscd-textfield
        label="nofASDU"
        .maybeValue=${nofASDU}
        helper="scl.nofASDU')}"
        required
        type="number"
        min="0"
        disabled
      ></oscd-textfield>
      <oscd-select
        label="securityEnabled"
        .maybeValue=${securityEnabled}
        nullable
        required
        helper="scl.securityEnable')}"
        disabled
        >${['None', 'Signature', 'SignatureAndEncryption'].map(
          type => html`<mwc-list-item value="${type}">${type}</mwc-list-item>`
        )}</oscd-select
      >
    </div>`;
  }

  render(): TemplateResult {
    return html`<h2 style="display: flex;">
        <div style="flex:auto">
          <div>SampledValueControl</div>
          <div class="headersubtitle">${identity(this.element)}</div>
        </div>
      </h2>
      <div class="parentcontent">
        ${this.renderSmvControlContent()}${this.renderOtherElements()}
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

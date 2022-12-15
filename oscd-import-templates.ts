import { html, LitElement, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { msg, str } from '@lit/localize';
import { Dialog } from '@material/mwc-dialog';

export default class ImportTemplateIedPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @query('.dialog')
  dialog!: Dialog;

  run(): void {
    this.dialog.show();
  }

  render(): TemplateResult {
    return html`<mwc-dialog
      class="dialog"
      heading="${msg('Import Template IEDs')}"
    >
    </mwc-dialog>`;
  }
}

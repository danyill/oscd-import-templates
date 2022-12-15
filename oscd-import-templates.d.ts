import { LitElement, TemplateResult } from 'lit';
import { Dialog } from '@material/mwc-dialog';
export default class ImportTemplateIedPlugin extends LitElement {
    doc: XMLDocument;
    dialog: Dialog;
    run(): void;
    render(): TemplateResult;
}

import { LitElement, TemplateResult } from 'lit';
import '@material/mwc-list/mwc-check-list-item';
import '@material/dialog';
import '@material/mwc-button';
import { Dialog } from '@material/mwc-dialog';
import { OscdFilteredList } from './foundation/components/oscd-filtered-list.js';
import './foundation/components/oscd-textfield.js';
export default class ImportTemplateIedPlugin extends LitElement {
    doc: XMLDocument;
    importDocs?: XMLDocument[];
    pluginFileUI: HTMLInputElement;
    dialog: Dialog;
    filteredList: OscdFilteredList;
    inputSelected: boolean;
    importIedCount: number | null;
    failFast: boolean;
    run(): Promise<void>;
    docUpdate(): Promise<void>;
    private importTemplateIED;
    private importTemplateIEDs;
    isImportValid(templateDoc: Document, filename: string): boolean;
    /** Loads the file `event.target.files[0]` into [[`src`]] as a `blob:...`. */
    protected onLoadFiles(event: Event): Promise<void>;
    protected renderInput(): TemplateResult;
    protected renderIcdListItem(doc: Document): TemplateResult;
    protected getSumOfIedsToCreate(): void;
    protected renderIedSelection(): TemplateResult;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}

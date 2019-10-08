const KEY = "output_auto_scroll";
const PLUGIN_NAME = `@wallneradam/${KEY}`;

import { IDisposable, DisposableDelegate } from '@phosphor/disposable';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { NotebookPanel, INotebookModel, Notebook } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ICellModel, CodeCellModel, CodeCell } from '@jupyterlab/cells';
import { IObservableList } from '@jupyterlab/observables';
import { ToolbarButton, MainAreaWidget } from '@jupyterlab/apputils';
import { each } from '@phosphor/algorithm';
import { SimplifiedOutputArea } from '@jupyterlab/outputarea';


/**
 * Notebook panel extension
 */
class OutputAutoScroll implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
    private notebook: Notebook;

    createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
        // The content of the notebook panel will be the actual notebook object
        this.notebook = panel.content;

        // Callback of the button
        let cbBtnAutoScroll = () => {
            // Toggle button state (selected - not selected)
            if (btnAutoScroll.hasClass('selected')) btnAutoScroll.removeClass('selected');
            else btnAutoScroll.addClass('selected');
            // Store the state in notebook's metadata
            this.notebook.model.metadata.set(KEY, btnAutoScroll.hasClass('selected'));
        }

        // Create a toolbar button
        let btnAutoScroll = new ToolbarButton({
            className: 'btnAutoScroll',
            iconClassName: 'wll-ScrollIcon',
            onClick: cbBtnAutoScroll,
            tooltip: 'Output auto scroll on/off'
        });

        // Insert as last toolbar button (before spacer)
        panel.toolbar.insertBefore('spacer', KEY, btnAutoScroll);

        // Connect to cell change signal, to be able to detect if otutput cells changed
        this.notebook.model.cells.changed.connect(this.onCellsChanged, this);

        // Wait for notebook is ready
        context.ready.then(() => {
            // Restore the button's state from notebook's metadata
            if (context.model.metadata.get(KEY)) btnAutoScroll.addClass('selected');
        });

        // Return a delegate which can dispose our created button
        return new DisposableDelegate(() => {
            btnAutoScroll.dispose();
        });
    }

    private onCellsChanged(
        cells: IObservableList<ICellModel>,
        changed_cells: IObservableList.IChangedArgs<ICellModel>): void {

        // If new cells added
        if (changed_cells.type == 'add') {
            // Go through all cells
            each(changed_cells.newValues, (cellModel, idx) => {
                if (cellModel instanceof CodeCellModel) {
                    // Detect output changes
                    cellModel.outputs.changed.connect((output, arg) => {
                        let autoScrollEnabled = this.notebook.model.metadata.get(KEY);
                        // If the change type is 'set', the output has changed.
                        // Check if scroll and auto scroll is enabled in metadata
                        if (['add', 'set'].includes(arg.type) &&
                            cellModel.metadata.get("scrolled") && autoScrollEnabled) {

                            // Find the widget for the model.
                            //TODO: is there any other method then iteration
                            for (let cell of this.notebook.widgets) {
                                if (cell instanceof CodeCell && cell.model == cellModel) {
                                    let codeCell: CodeCell = cell;

                                    // Scroll to bottom
                                    codeCell.outputArea.node.scrollTop = codeCell.outputArea.node.scrollHeight;

                                    // Find output view widgets
                                    //TODO: there must be a better way!!
                                    each(this.notebook.parent.parent.layout, widget => {
                                        if (widget instanceof MainAreaWidget) {
                                            each(widget.layout, widget => {
                                                if (widget.constructor.name == 'ClonedOutputArea') {
                                                    each(widget.layout, widget => {
                                                        if (widget instanceof SimplifiedOutputArea &&
                                                            widget.model == codeCell.outputArea.model) {
                                                            let node = widget.node;
                                                            // We don't have the last results added here :-/
                                                            setTimeout(() => {
                                                                let sum = 0;
                                                                // We need this because the normal node is not scrollable here :-/
                                                                let firstChild = node.children[0];
                                                                for (let i = 0; i < node.children.length; i++)
                                                                    sum += node.children[i].scrollHeight;
                                                                firstChild.scrollTop = sum
                                                                // WHY????!!! - It needed when we have multiple outputs (e.g. exception)
                                                                if (firstChild.scrollTop == 0) node.scrollTop = sum;
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            });
        }
    }
}


const extension: JupyterFrontEndPlugin<void> = {
    id: PLUGIN_NAME,
    autoStart: true,
    activate: (app: JupyterFrontEnd) => {
        console.log('JupyterLab extension output_auto_scroll is activated!');
        // Register our extension
        app.docRegistry.addWidgetExtension('notebook', new OutputAutoScroll);
    }
};


export default extension;

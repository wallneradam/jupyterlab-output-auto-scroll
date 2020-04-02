const KEY = "output_auto_scroll";
const PLUGIN_NAME = `@wallneradam/${KEY}`;

import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { NotebookPanel, INotebookModel, Notebook } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ICellModel, CodeCellModel, CodeCell } from '@jupyterlab/cells';
import { IObservableList } from '@jupyterlab/observables';
import { ToolbarButton, MainAreaWidget } from '@jupyterlab/apputils';
import { each } from '@lumino/algorithm';
import { SimplifiedOutputArea } from '@jupyterlab/outputarea';
import { ResizeObserver, install as install_resizeObserver } from 'resize-observer';

// Install ResizeObserver polyfill if needed
if (!('ResizeObserver' in window)) install_resizeObserver();


/**
 * Notebook panel extension
 */
class OutputAutoScroll {
    private notebook: Notebook;
    private resizeObserver: ResizeObserver;
    private resizeObserverOutputView: ResizeObserver;

    createNew(panel: NotebookPanel): IDisposable {
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
            iconClass: 'wll-ScrollIcon',
            onClick: cbBtnAutoScroll,
            tooltip: 'Output auto scroll on/off'
        });

        // Insert as last toolbar button (before spacer)
        panel.toolbar.insertBefore('spacer', KEY, btnAutoScroll);

        // Connect to cell change signal, to be able to detect if otutput cells changed
        this.notebook.model.cells.changed.connect(this.onCellsChanged, this);

        // Wait for notebook is ready
        panel.context.ready.then(() => {
            // Restore the button's state from notebook's metadata
            if (panel.context.model.metadata.get(KEY)) btnAutoScroll.addClass('selected');
        });

        // Observer to detect HTML element resize events
        this.resizeObserver = new ResizeObserver(entries => {
            // Scroll to bottom of the parent
            let parent = entries[0].target.parentElement;
            parent.scrollTop = parent.scrollHeight;
        });
        // Resize events for cloned outputs
        this.resizeObserverOutputView = new ResizeObserver(entries => {
            // Scroll to bottom of the parent
            let parent = entries[0].target.parentElement;
            this.clonedOutputScroll(parent);
        });

        // Return a delegate which can dispose our created button
        return new DisposableDelegate(() => {
            btnAutoScroll.dispose();
        });
    }

    private clonedOutputScroll(node: HTMLElement) {
        let sum = 0;
        // We need this because the normal node is not scrollable here :-/
        let firstChild = node.children[0];
        for (let i = 0; i < node.children.length; i++)
            sum += node.children[i].scrollHeight;
        firstChild.scrollTop = sum
        // WHY????!!! - It needed when we have multiple outputs (e.g. exception)
        if (firstChild.scrollTop == 0) node.scrollTop = sum;
    }

    //TODO: there must be a better way!!
    private scrollOutputViews(codeCell: CodeCell) {
        each(this.notebook.parent.parent.layout, widget => {
            if (widget instanceof MainAreaWidget) {
                each(widget.layout, widget => {
                    // Find cloned output view
                    if (widget.constructor.name == 'ClonedOutputArea') {
                        each(widget.layout, widget => {
                            // Check if we found a view with same model
                            if (widget instanceof SimplifiedOutputArea &&
                                widget.model == codeCell.outputArea.model) {
                                let node = widget.node;

                                // We don't have the last results added here :-/, so we need to wait for the next cycle
                                setTimeout(() => {
                                    this.clonedOutputScroll(node);
                                });

                                // Detect size changes
                                for (let i = 0; i < node.children.length; i++) {
                                    this.resizeObserverOutputView.unobserve(node.children[i]);
                                    this.resizeObserverOutputView.observe(node.children[i]);
                                }
                            }
                        });
                    }
                });
            }
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
                                    // Scroll to bottom
                                    cell.outputArea.node.scrollTop = cell.outputArea.node.scrollHeight;

                                    // Place resize observer for output widgets
                                    for (let widget of (cell as CodeCell).outputArea.widgets) {
                                        this.resizeObserver.unobserve(widget.node);
                                        (widget => {
                                            setTimeout(() => {
                                                this.resizeObserver.observe(widget.node);
                                            });
                                        })(widget);
                                    }

                                    // Find output view widgets
                                    this.scrollOutputViews(cell)
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
        app.docRegistry.addWidgetExtension('notebook', {
            // Create new autoscroller for every document
            createNew: (panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable => {
                return new OutputAutoScroll().createNew(panel);
            }
        });
    }
};


export default extension;

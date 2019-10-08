# output_auto_scroll

Automatically scrolls scrollable output cells to bottom when content has changed.

It creates toolbar button: <img src="https://raw.githubusercontent.com/wallneradam/jupyterlab-output-auto-scroll/master/style/vertical_align_bottom.svg?sanitize=true" > . The button is selectable (2 state). If it is switched on, the outputs will be pinned to the bottom. If it is off, outputs won't scrolled automatically.

It can scroll normal outputs and cloned output views as well.

## Prerequisites

* JupyterLab

## Installation

```bash
jupyter labextension install @wallneradam/output_auto_scroll
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
npm run build
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```


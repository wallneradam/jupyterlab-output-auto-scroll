# output_auto_scroll

Automatically scrolls scrollable output cells to bottom when content has changed.

It creates toolbar button: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"/><path d="M0 0h24v24H0z" fill="none"/></svg> . The button is selectable (2 state). If it is switched on, the outputs will be pinned to the bottom. If it is off, outputs won't scrolled automatically.

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


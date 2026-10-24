# Drag palette blocks into a drill sequence

Implementation: `data/script.js` and `data/style.css`.

The palette uses Sortable's fallback dragging with a four-pixel movement threshold.
The floating copy renders outside the modal's scrolling container, and touch gestures
on a held palette block do not start a page scroll. Existing clone-on-drop logic,
click-to-add, sequence handles, and database serialization are preserved.

Validation: JavaScript syntax and isolated Edge browser checks using the existing
localhost test adapter. Real mouse/touch input covered empty, beginning, middle,
and end drops; repeated copies; cancelled drops; click/tap-to-add; handle reordering;
unique control IDs; delay edits; and save/reload persistence. Checks passed with no
browser exceptions or controller API traffic. The source database was unchanged.
The temporary browser harness and screenshots are outside the repository.

Hardware and firmware were not changed. Device deployment of the frontend requires
`uploadfs`.

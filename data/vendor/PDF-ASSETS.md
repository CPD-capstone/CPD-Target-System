PDF exports load these vendored files only when needed. No CDN or internet connection is used at runtime.

- jsPDF 4.2.1: https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js
  MIT license: jspdf-LICENSE.txt
  Uncompressed SHA-256: E6551FCDC32F09D6853B2C5126D18D01D9447E0DA618A41A11EBEEE0F6C20D54
- jsPDF-AutoTable 5.0.9: https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.9/dist/jspdf.plugin.autotable.min.js
  MIT license: jspdf-autotable-LICENSE.txt
  Uncompressed SHA-256: 83DD8E5AE29436BD3D3EF4F4A915125B3951264994C25DE0359D3FBD105ABE15
- Noto Sans Regular: https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf
  SIL Open Font License: fonts/NotoSans-LICENSE.txt
  Uncompressed SHA-256: B85C38ECEA8A7CFB39C24E395A4007474FA5A4FC864F6EE33309EB4948D232D5

The JavaScript and font files are stored as gzip assets, matching the controller's static-file serving. Request their normal `.js` / `.ttf` URLs; LittleFS serves the `.gz` variants with gzip content encoding. Keep the font embedded in PDFs so officer and qualification names retain accented characters.

To update an asset, download it from its source, keep its license, and gzip it with level 9 and a zero timestamp. Record and review the version and SHA-256 of the uncompressed file when updating dependencies.

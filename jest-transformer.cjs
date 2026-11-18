const ts = require('typescript')

module.exports = {
  process(source, filename) {
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: filename.endsWith('.tsx') ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        strict: true,
      },
      fileName: filename,
    })
    return { code: output.outputText }
  },
}

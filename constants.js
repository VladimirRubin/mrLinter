module.exports = {
    CHECKED_DIR: 'checkedDir',
    IGNORE_ESLINT: [
        RegExp('(InitializeApp.js)$'),
        RegExp('^(editor/src/styles)'),
        RegExp('^(editor/src/images)'),
        RegExp('^(editor/src/fonts)'),
        RegExp('^(editor/public/js)'),
        RegExp('(.scss)$'),
        RegExp('(.svg)$'),
        RegExp('(.config.dev.js)$'),
        RegExp('(.config.prod.js)$'),
        RegExp('^(editor/src/containers/main/editor/textEditors/tinyMceEditor/tinymce/)')
    ],
}


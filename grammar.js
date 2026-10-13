/**
 * tree-sitter grammar for rocstache templates: HTML (or any text) with
 * Mustache tags whose expressions are `path | formatter "arg"`.
 *
 * `content` nodes are the text between tags; editors inject HTML into them
 * (combined, so an element may span tags). Tags mirror roux's
 * tools/rocstache/parse.zig:
 *   {{ a.b | formatter "arg" }}   a value, escaped, through formatters
 *   {{{ a }}}                     unescaped
 *   {{# a }} ... {{/ a }}         section (list / record / Bool)
 *   {{^ a }} ... {{/ a }}         inverted section
 *   {{? a }} ... {{/ a }}         conditional, in the same scope
 *   {{> Name }}  {{> Name a }}    partial, inlined or called with a context
 *   {{ ../a }}  {{ . }}           enclosing scope; the element itself
 *   {{! comment }}                comment
 *   {{% Ctx : { ... } %}}         first in the file: the contract
 *
 * Which formatters exist and how many arguments each takes is roux's
 * check (`roux lsp` reports it), not the grammar's.
 */
module.exports = grammar({
  name: 'rocstache',

  extras: $ => [/\s/],

  rules: {
    template: $ => seq(optional($.pragma), repeat(choice(
      $.content,
      $.comment,
      $.section_open,
      $.inverted_open,
      $.conditional_open,
      $.section_close,
      $.partial,
      $.raw_tag,
      $.tag,
    ))),

    // `{{% ... %}}`: the contract, `Ctx : { ... }`, and `#` comments (editors
    // inject Roc into `roc_code`). It ends at `%}}`, since the Roc may itself
    // contain `}}`.
    pragma: $ => seq('{{%', optional(alias(token(prec(-1, /([^%]|%[^}]|%\}[^}])+/)), $.roc_code)), '%}}'),

    // Anything up to the next `{{`. Lower precedence than whitespace extras so
    // a whitespace-only gap between two tags is not a content node.
    content: $ => token(prec(-1, /([^{]|\{[^{])+/)),

    comment: $ => seq($.comment_open, optional(alias(token(prec(-1, /([^}]|\}[^}])+/)), $.comment_text)), '}}'),
    comment_open: $ => token(seq('{{', /\s*/, '!')),

    section_open: $ => seq($.section_open_delim, $.path, '}}'),
    section_open_delim: $ => token(seq('{{', /\s*/, '#')),
    inverted_open: $ => seq($.inverted_open_delim, $.path, '}}'),
    inverted_open_delim: $ => token(seq('{{', /\s*/, '^')),
    conditional_open: $ => seq($.conditional_open_delim, $.path, '}}'),
    conditional_open_delim: $ => token(seq('{{', /\s*/, '?')),
    section_close: $ => seq($.section_close_delim, $.path, '}}'),
    section_close_delim: $ => token(seq('{{', /\s*/, '/')),

    partial: $ => seq($.partial_delim, $.partial_name, optional($.path), '}}'),
    partial_delim: $ => token(seq('{{', /\s*/, '>')),
    partial_name: $ => /[A-Z][A-Za-z0-9]*/,

    raw_tag: $ => seq('{{{', $.expression, '}}}'),

    tag: $ => seq('{{', $.expression, '}}'),

    expression: $ => seq($.path, repeat(seq('|', $.formatter))),

    path: $ => seq(
      repeat($.parent),
      choice(
        $.this,
        seq(
          $.identifier,
          repeat(seq(token.immediate('.'), alias(token.immediate(/[a-z_][A-Za-z0-9_]*/), $.identifier))),
        ),
      ),
    ),
    this: $ => '.',
    parent: $ => '../',
    identifier: $ => /[a-z_][A-Za-z0-9_]*/,

    formatter: $ => seq(field('name', $.formatter_name), repeat($.string)),
    formatter_name: $ => /[a-z][a-z0-9_]*/,
    // No escapes: the string ends at the next `"`.
    string: $ => /"[^"]*"/,
  },
});

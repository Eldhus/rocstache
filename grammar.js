/**
 * tree-sitter grammar for rocstache templates: HTML (or any text) with
 * Mustache tags whose holes are Roc.
 *
 * `content` nodes are the text between tags; editors inject HTML into them
 * (combined, so an element may span tags). A hole's inside is Roc (a path,
 * `dish.name`, is Roc too), and editors inject Roc into it. Tags mirror
 * roux's tools/rocstache/parse.zig:
 *   {{ dish.name }}  {{ Fmt.kr(dish.price) }}   a hole, escaped
 *   {{{ html }}}                               a hole, unescaped
 *   {{# dishes |dish| }} ... {{/ dishes }}     a section naming its element
 *   {{^ dishes }} ... {{/ dishes }}            inverted: empty, or false
 *   {{? open }} ... {{/ open }}                a condition
 *   {{$ Row }} ... {{/ Row }}                  a fragment
 *   {{> Name }}                                a partial
 *   {{! comment }}                             a comment
 *   {{% import Fmt  Ctx : { ... } %}}          first in the file: the block
 *
 * What a hole may hold, and that every section names its element, is
 * roux's check (`roux lsp` reports it), not the grammar's: a section
 * without its binder still parses while it is typed.
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
      $.fragment_open,
      $.section_close,
      $.partial,
      $.raw_tag,
      $.tag,
    ))),

    // `{{% ... %}}`: `import` lines, then the contract, `Ctx : { ... }`, and
    // `#` comments (editors inject Roc into `roc_code`). It ends at `%}}`,
    // since the Roc may itself contain `}}`.
    pragma: $ => seq('{{%', optional(alias(token(prec(-1, /([^%]|%[^}]|%\}[^}])+/)), $.roc_code)), '%}}'),

    // Anything up to the next `{{`. Lower precedence than whitespace extras so
    // a whitespace-only gap between two tags is not a content node.
    content: $ => token(prec(-1, /([^{]|\{[^{])+/)),

    comment: $ => seq($.comment_open, optional(alias(token(prec(-1, /([^}]|\}[^}])+/)), $.comment_text)), '}}'),
    comment_open: $ => token(seq('{{', /\s*/, '!')),

    section_open: $ => seq($.section_open_delim, $.path, optional($.binder), '}}'),
    section_open_delim: $ => token(seq('{{', /\s*/, '#')),
    // `|dish|`: the name the section gives its element, as a Roc lambda
    // names its argument.
    binder: $ => seq('|', field('name', $.identifier), '|'),
    inverted_open: $ => seq($.inverted_open_delim, $.path, '}}'),
    inverted_open_delim: $ => token(seq('{{', /\s*/, '^')),
    conditional_open: $ => seq($.conditional_open_delim, $.path, '}}'),
    conditional_open_delim: $ => token(seq('{{', /\s*/, '?')),
    fragment_open: $ => seq($.fragment_open_delim, $.type_name, '}}'),
    fragment_open_delim: $ => token(seq('{{', /\s*/, '$')),
    section_close: $ => seq($.section_close_delim, choice($.path, $.type_name), '}}'),
    section_close_delim: $ => token(seq('{{', /\s*/, '/')),

    partial: $ => seq($.partial_delim, $.type_name, '}}'),
    partial_delim: $ => token(seq('{{', /\s*/, '>')),
    type_name: $ => /[A-Z][A-Za-z0-9]*/,

    raw_tag: $ => seq('{{{', optional($.roc_expression), '}}}'),

    tag: $ => seq('{{', optional($.roc_expression), '}}'),

    // A hole's Roc, up to the tag's closing braces.
    roc_expression: $ => token(prec(-1, /([^}\s]|\}[^}])([^}]|\}[^}])*/)),

    path: $ => seq(
      $.identifier,
      repeat(seq(token.immediate('.'), alias(token.immediate(/[a-z_][A-Za-z0-9_]*/), $.identifier))),
    ),
    identifier: $ => /[a-z_][A-Za-z0-9_]*/,
  },
});

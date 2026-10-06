/**
 * tree-sitter grammar for rocstache templates: HTML (or any text) with
 * Mustache tags whose expressions are `path | formatter args`.
 *
 * `content` nodes are the text between tags; editors inject HTML into them
 * (combined, so an element may span tags). Tags mirror gen/src/mustache.zig:
 *   {{ path | fmt "arg" 3 other.path }}   escaped variable with formatter pipes
 *   {{{ path }}}  {{& path }}             unescaped
 *   {{# path }} ... {{/ path }}            section (list / bool / record)
 *   {{^ path }} ... {{/ path }}            inverted section
 *   {{> Partial }}                         partial (capitalized module name)
 *   {{! comment }}                         comment
 *   {{=<% %>=}}                            set delimiters (parsed, not applied)
 *   {{% roc %}}                            a block of Roc at the top of the file:
 *                                          imports, formatters, a `Ctx` type
 *   {{ x | Str.trim }}                     a qualified function as a formatter
 */
module.exports = grammar({
  name: 'rocstache',

  extras: $ => [/\s/],

  rules: {
    template: $ => seq(optional($.pragma), repeat(choice(
      $.content,
      $.comment,
      $.set_delimiter,
      $.section_open,
      $.inverted_open,
      $.conditional_open,
      $.section_close,
      $.partial,
      $.raw_tag,
      $.tag,
    ))),

    // `{{% ... %}}`: Roc source (editors inject Roc into `roc_code`). It
    // ends at `%}}`, since the Roc may itself contain `}}`.
    pragma: $ => seq('{{%', optional(alias(token(prec(-1, /([^%]|%[^}]|%\}[^}])+/)), $.roc_code)), '%}}'),

    // Anything up to the next `{{`. Lower precedence than whitespace extras so
    // a whitespace-only gap between two tags is not a content node.
    content: $ => token(prec(-1, /([^{]|\{[^{])+/)),

    comment: $ => seq($.comment_open, optional(alias(token(prec(-1, /([^}]|\}[^}])+/)), $.comment_text)), '}}'),
    comment_open: $ => token(seq('{{', /\s*/, '!')),

    set_delimiter: $ => token(seq('{{=', /[^=]*/, '=}}')),

    section_open: $ => seq($.section_open_delim, $.path, '}}'),
    section_open_delim: $ => token(seq('{{', /\s*/, '#')),
    inverted_open: $ => seq($.inverted_open_delim, $.path, '}}'),
    inverted_open_delim: $ => token(seq('{{', /\s*/, '^')),
    conditional_open: $ => seq($.conditional_open_delim, $.path, '}}'),
    conditional_open_delim: $ => token(seq('{{', /\s*/, '?')),
    section_close: $ => seq($.section_close_delim, $.path, '}}'),
    section_close_delim: $ => token(seq('{{', /\s*/, '/')),

    partial: $ => seq($.partial_delim, $.partial_name, '}}'),
    partial_delim: $ => token(seq('{{', /\s*/, '>')),
    partial_name: $ => /[A-Z][A-Za-z0-9]*/,

    raw_tag: $ => choice(
      seq('{{{', $.expression, '}}}'),
      seq($.raw_delim, $.expression, '}}'),
    ),
    raw_delim: $ => token(seq('{{', /\s*/, '&')),

    tag: $ => seq('{{', $.expression, '}}'),

    expression: $ => seq($.path, repeat(seq('|', $.formatter))),

    path: $ => choice(
      $.this,
      seq(
        optional(choice($.root, repeat1($.parent))),
        $.identifier,
        repeat(seq(token.immediate('.'), alias(token.immediate(/[a-z][a-z0-9_]*/), $.identifier))),
      ),
    ),
    this: $ => '.',
    root: $ => '@',
    parent: $ => '../',
    identifier: $ => /[a-z][a-z0-9_]*/,

    formatter: $ => seq(field('name', $.formatter_name), repeat($.argument)),
    // `money`, or qualified: `Str.trim`, `List.len`.
    formatter_name: $ => /([A-Z][A-Za-z0-9]*\.)*[a-z][a-z0-9_]*/,
    argument: $ => choice($.string, $.number, $.path),
    string: $ => /"([^"\\]|\\.)*"/,
    number: $ => /-?[0-9][A-Za-z0-9_.]*/,
  },
});

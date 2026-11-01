; Delimiters and sigils
[
  "{{" "}}" "{{{" "}}}" "{{%" "%}}"
  (section_open_delim) (inverted_open_delim) (conditional_open_delim) (fragment_open_delim)
  (section_close_delim) (partial_delim)
] @punctuation.special

; Comments
(comment) @comment
(comment_open) @comment
(comment_text) @comment

; A section's path: a name in scope, then its fields
(path . (identifier) @variable)
(path (identifier) (identifier) @property)

; The name a section gives its element, as a lambda's argument
(binder name: (identifier) @variable.parameter)
(binder "|" @punctuation.bracket)

; Partials are Roc modules; fragments are types nested in their page
(type_name) @type

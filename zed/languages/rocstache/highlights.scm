; Delimiters and sigils
[
  "{{" "}}" "{{{" "}}}" "{{%" "%}}"
  (section_open_delim) (inverted_open_delim) (conditional_open_delim) (section_close_delim)
  (partial_delim) (raw_delim)
] @punctuation.special

(set_delimiter) @keyword

; Comments
(comment) @comment
(comment_open) @comment
(comment_text) @comment

; Paths (context fields)
(path (identifier) @variable)
(path (identifier) @property . )
(this) @variable.special
(root) @variable.special
(parent) @variable.special

; Section names get the same treatment as paths
(section_open (path (identifier) @variable))
(inverted_open (path (identifier) @variable))
(conditional_open (path (identifier) @variable))
(section_close (path (identifier) @variable))

; Partials are Roc modules
(partial_name) @type

; Formatter pipes: `| name args`
"|" @operator
(formatter_name) @function
(string) @string
(number) @number

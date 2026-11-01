((content) @injection.content
  (#set! injection.language "html")
  (#set! injection.combined))

((roc_code) @injection.content
  (#set! injection.language "roc"))

; A hole is Roc: a path, `dish.name`, as much as `Fmt.kr(dish.price)`.
((roc_expression) @injection.content
  (#set! injection.language "roc"))

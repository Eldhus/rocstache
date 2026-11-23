# rocstache

Editor support for rocstache (Roc and mustache), the template language of
[roux](https://github.com/Eldhus/roux): HTML with mustache tags, each template's contract a Roc type.
A tree-sitter grammar that follows roux's parser, and a Zed extension: highlighting, with HTML and
Roc injected, and `roux lsp` for diagnostics, hover and completion, the tags' and the HTML's both
(HTML checked in the pages that render a template, by SuperHTML's rules). roux defines and compiles
the language; this repository only reads it.


## Use it

In Zed: `zed: extensions`, "Rocstache" (once listed in Zed's registry; until then `zed: install dev
extension` on `zed/`). It wants `roux` on PATH, built from roux's master, for the language server.


## The road ahead

- Listed in Zed's extension registry.


## Working on it

```sh
tree-sitter generate --js-runtime native --abi 14   # src/, committed
tree-sitter test
```

The tree-sitter CLI is one binary from its GitHub release, 0.27.2 (`tree-sitter-linux-x64.gz`,
sha256 `7ed56d152c52437397b9fcaa43cf341f49933cecc1ca291843f0d347c6e2cb3a`); no npm. Zed builds the
grammar from `zed/extension.toml`'s `repository` at `rev`, a pushed commit.


## License

MIT.

Part of [Eldhus](https://github.com/Eldhus).

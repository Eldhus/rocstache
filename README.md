# rocstache

Editor support for rocstache (Roc and mustache), the template language of
[roux](https://github.com/Eldhus/roux): HTML with mustache tags, each template's contract a Roc type.
A tree-sitter grammar that follows roux's parser, and a Zed extension: highlighting, with HTML and
Roc injected, and `roux lsp` for diagnostics, hover and completion. roux defines and compiles the
language; this repository only reads it.


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

The tree-sitter CLI is one binary from its GitHub release, 0.27.0; no npm. Zed builds the grammar
from `zed/extension.toml`'s `repository` at `rev`, a pushed commit.


## License

MIT.

Part of [Eldhus](https://github.com/Eldhus).

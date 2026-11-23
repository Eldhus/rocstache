//! Zed extension for rocstache templates.
//!
//! One language server is registered for the "Rocstache" language: `roux lsp`,
//! what `roux build` would report in a template, as it is typed, from roux's
//! own parser and contract checker. Found on PATH. Zed's own `lsp.roux.binary`
//! setting, when it has a `path`, replaces this command entirely, arguments
//! included: it then needs `"arguments": ["lsp"]`.

use zed::settings::LspSettings;
use zed_extension_api::{self as zed, LanguageServerId, Result};

const ROUX_BINARY: &str = "roux";

struct RocstacheExtension;

impl RocstacheExtension {
    fn roux_command(worktree: &zed::Worktree) -> Result<zed::Command> {
        let path = worktree.which(ROUX_BINARY).ok_or_else(|| {
            format!(
                "{ROUX_BINARY} not found. Build it (in roux: zig build tools, then zig-out/bin/roux), \
                 put it on PATH, or set lsp.roux.binary in Zed settings, its path and \"arguments\": [\"lsp\"]."
            )
        })?;
        Ok(zed::Command { command: path, args: vec!["lsp".into()], env: Default::default() })
    }
}

impl zed::Extension for RocstacheExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(&mut self, id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        match id.as_ref() {
            "roux" => Self::roux_command(worktree),
            other => Err(format!("unknown language server {other}")),
        }
    }

    fn language_server_workspace_configuration(
        &mut self,
        id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<zed::serde_json::Value>> {
        LspSettings::for_worktree(id.as_ref(), worktree).map(|s| s.settings)
    }
}

zed::register_extension!(RocstacheExtension);

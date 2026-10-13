//! Zed extension for rocstache templates.
//!
//! Two language servers are registered for the "Rocstache" language:
//!   - `roux lsp`: what `roux build` would report in a template, as it is
//!     typed, from roux's own parser and contract checker. Found on PATH.
//!     Zed's own `lsp.roux.binary` setting, when it has a `path`, replaces
//!     this command entirely, arguments included: it then needs
//!     `"arguments": ["lsp"]`.
//!   - `vscode-html-language-server`: HTML support for the markup between
//!     tags (installed through npm into the extension's work directory,
//!     the same way Zed's HTML extension does).

use std::{env, fs};
use zed::settings::LspSettings;
use zed_extension_api::{self as zed, LanguageServerId, Result, serde_json::json};

const ROUX_BINARY: &str = "roux";
const HTML_BINARY: &str = "vscode-html-language-server";
const HTML_PACKAGE: &str = "@zed-industries/vscode-langservers-extracted";
/// Pinned: nothing floats. Update by hand.
const HTML_VERSION: &str = "4.10.8";
const HTML_SERVER_PATH: &str =
    "node_modules/@zed-industries/vscode-langservers-extracted/bin/vscode-html-language-server";

struct RocstacheExtension {
    html_server_installed: bool,
}

impl RocstacheExtension {
    fn roux_command(worktree: &zed::Worktree) -> Result<zed::Command> {
        let path = worktree.which(ROUX_BINARY).ok_or_else(|| {
            format!(
                "{ROUX_BINARY} not found. Build it (in roux: zig build tools, then zig-out/bin/roux), \
                 put it on PATH, or set lsp.roux.binary.path in Zed settings."
            )
        })?;
        Ok(zed::Command { command: path, args: vec!["lsp".into()], env: Default::default() })
    }

    fn html_server_exists() -> bool {
        fs::metadata(HTML_SERVER_PATH).is_ok_and(|stat| stat.is_file())
    }

    fn html_command(&mut self, id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        if let Some(path) = worktree.which(HTML_BINARY) {
            return Ok(zed::Command { command: path, args: vec!["--stdio".into()], env: Default::default() });
        }
        if !(self.html_server_installed && Self::html_server_exists()) {
            zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::CheckingForUpdate);
            let version = HTML_VERSION.to_string();
            if !Self::html_server_exists() || zed::npm_package_installed_version(HTML_PACKAGE)?.as_ref() != Some(&version) {
                zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::Downloading);
                let result = zed::npm_install_package(HTML_PACKAGE, &version);
                if !Self::html_server_exists() {
                    result?;
                    return Err(format!("installed {HTML_PACKAGE} but {HTML_SERVER_PATH} is missing"));
                }
            }
            self.html_server_installed = true;
        }
        let server_path = env::current_dir().unwrap().join(HTML_SERVER_PATH).to_string_lossy().to_string();
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![server_path, "--stdio".into()],
            env: Default::default(),
        })
    }
}

impl zed::Extension for RocstacheExtension {
    fn new() -> Self {
        Self { html_server_installed: false }
    }

    fn language_server_command(&mut self, id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        match id.as_ref() {
            "roux" => Self::roux_command(worktree),
            "vscode-html-language-server" => self.html_command(id, worktree),
            other => Err(format!("unknown language server {other}")),
        }
    }

    fn language_server_initialization_options(
        &mut self,
        id: &LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> Result<Option<zed::serde_json::Value>> {
        Ok(match id.as_ref() {
            // The HTML server's formatter would mangle the template tags.
            "vscode-html-language-server" => Some(json!({ "provideFormatter": false })),
            _ => None,
        })
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

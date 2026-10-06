//! Zed extension for rocstache templates.
//!
//! Two language servers are registered for the "Rocstache" language:
//!   - `rocstache-gen lsp`: diagnostics, hovers and completions for the
//!     template language, from the generator's own parser and type
//!     inference. Found on PATH, or set `lsp.rocstache-gen.binary.path` in
//!     Zed settings.
//!   - `vscode-html-language-server`: HTML support for the markup between
//!     tags (installed through npm into the extension's work directory,
//!     the same way Zed's HTML extension does).

use std::{env, fs};
use zed::settings::LspSettings;
use zed_extension_api::{self as zed, LanguageServerId, Result, serde_json::json};

const GEN_BINARY: &str = "rocstache-gen";
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
    fn gen_command(&self, id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        let settings = LspSettings::for_worktree(id.as_ref(), worktree).ok();
        let configured = settings
            .as_ref()
            .and_then(|s| s.binary.as_ref())
            .and_then(|b| b.path.clone());
        let path = match configured.or_else(|| worktree.which(GEN_BINARY)) {
            Some(p) => p,
            None => {
                return Err(format!(
                    "{GEN_BINARY} not found. Build it (cd rocstache/gen && zig build -Doptimize=ReleaseFast), \
                     put it on PATH, or set lsp.rocstache-gen.binary.path in Zed settings."
                ))
            }
        };
        let mut args = settings
            .as_ref()
            .and_then(|s| s.binary.as_ref())
            .and_then(|b| b.arguments.clone())
            .unwrap_or_default();
        if args.is_empty() {
            args.push("lsp".to_string());
        }
        Ok(zed::Command { command: path, args, env: Default::default() })
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
            "rocstache-gen" => self.gen_command(id, worktree),
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
            // Formatting would mangle the template tags; leave it to the generator's whitespace rules.
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

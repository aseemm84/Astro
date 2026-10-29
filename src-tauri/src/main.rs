// Nirayana — the desktop wrapper.
//
// Deliberately thin. Everything the application does is already in the pages the
// build produces; this opens a window on them, remembers where that window was,
// lays the system material behind it, and puts a real menu bar above it.
//
// What is NOT here is as much the point as what is. There is no HTTP plugin, no
// shell plugin and no filesystem plugin, so the binary has no capability to
// reach the network or the disk beyond its own bundle. The site has always said
// nothing is sent anywhere; in the app that stops being a promise about
// behaviour and becomes a property of the build.
//
// Opening a saved chart needs no dialog plugin either: the Kundli page already
// carries a hidden file input, and the menu item clicks it. The file picker is
// the system's, the capability is not the app's.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let handle = app.handle();

            // ---- the menu bar ----
            // The Edit menu matters more than it looks: without it, Cmd-C and
            // Cmd-V do nothing at all in a macOS window. The standard items are
            // the system's own, so they behave the way every other application's
            // do rather than the way a web page's would.
            let about = MenuItemBuilder::with_id("about", "About Nirayana").build(app)?;
            let open = MenuItemBuilder::with_id("open", "Open chart\u{2026}")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let print = MenuItemBuilder::with_id("print", "Print\u{2026}")
                .accelerator("CmdOrCtrl+P")
                .build(app)?;
            let find = MenuItemBuilder::with_id("find", "Find\u{2026}")
                .accelerator("CmdOrCtrl+F")
                .build(app)?;

            let app_menu = SubmenuBuilder::new(handle, "Nirayana")
                .item(&about)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&open)
                .item(&print)
                .separator()
                .close_window()
                .build()?;

            let edit_menu = SubmenuBuilder::new(handle, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let view_menu = SubmenuBuilder::new(handle, "View").item(&find).build()?;

            let window_menu = SubmenuBuilder::new(handle, "Window")
                .minimize()
                .maximize()
                .separator()
                .fullscreen()
                .build()?;

            let menu = MenuBuilder::new(handle)
                .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu])
                .build()?;
            app.set_menu(menu)?;

            // The menu calls into the page rather than synthesising key events,
            // so a menu item and its shortcut take exactly the same path.
            app.on_menu_event(move |app, event| {
                let js = match event.id().as_ref() {
                    "find" => "window.NirayanaApp&&window.NirayanaApp.find()",
                    "open" => "window.NirayanaApp&&window.NirayanaApp.openChart()",
                    "print" => "window.NirayanaApp&&window.NirayanaApp.print()",
                    "about" => "window.NirayanaApp&&window.NirayanaApp.about()",
                    _ => return,
                };
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.eval(js);
                }
            });

            // ---- the window material ----
            // Liquid Glass where the system has it, the older vibrancy where it
            // does not. apply_liquid_glass checks the AppKit version itself and
            // errors below macOS 26, so the fallback is the error path rather
            // than a version test written here that would drift.
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{
                    apply_liquid_glass, apply_vibrancy, LiquidGlassOptions, NSVisualEffectMaterial,
                };
                if let Some(window) = app.get_webview_window("main") {
                    if apply_liquid_glass(&window, LiquidGlassOptions::default()).is_err() {
                        let _ = apply_vibrancy(
                            &window,
                            NSVisualEffectMaterial::Sidebar,
                            None,
                            None,
                        );
                    }
                }
            }

            // Mica on Windows 11. Native decorations stay on, so the system
            // draws the caption bar and extends Mica into it itself; this call
            // is for the client area behind our own chrome.
            //
            // The error is dropped on purpose. apply_mica fails below Windows
            // build 22000, and the fallback is not acrylic — the crate warns it
            // lags on drag and resize — but simply no material. The stylesheet
            // keeps the Windows chrome at 86% and 92% opacity precisely so that
            // a window with no backdrop still reads as a sidebar and a header
            // rather than as holes.
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    // None: follow the system light/dark preference rather than
                    // pinning one, which would disagree with the palette the
                    // page picks for itself from the same preference.
                    let _ = window_vibrancy::apply_mica(&window, None);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Nirayana");
}

// Nirayana — the desktop wrapper.
//
// Deliberately thin. Everything the application does is already in the pages
// the build produces; this opens a window on them, remembers where that window
// was, and on macOS lays the Liquid Glass or vibrancy material behind it.
//
// What is NOT here is as much the point as what is. There is no HTTP plugin, no
// shell plugin and no filesystem plugin, so the binary has no capability to
// reach the network or the disk beyond its own bundle. The site has always said
// nothing is sent anywhere; in the app that stops being a promise about
// behaviour and becomes a property of the build.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    // The material is applied in a later stage, once the content
                    // layer carries its own surface colour: a translucent window
                    // under an opaque page shows nothing. Holding the handle here
                    // keeps that change to one place.
                    let _ = &window;
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Nirayana");
}

// Reel Agent — the native pieces the web page cannot do for itself.
//
// Offline first. Every command here works with no network: the system voice
// is the operating system's own (macOS `say`, Windows SpeechSynthesis), the
// save dialog is the system's, and "show in folder" opens the file manager
// on a file this app itself just wrote.
//
// SAFETY OF THE TWO THAT TOUCH THE SYSTEM:
// * `say` is run with a fixed argument vector and no shell. The text goes in
//   through a temporary file (-f), never as an argument, so nothing in it can
//   be read as an option; the voice name must be one `say -v ?` listed.
// * reveal_in_folder only reveals paths this process saved in this session.
//   The page cannot ask it to open an arbitrary path.

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, State};

#[derive(Default)]
pub struct Saved(pub Mutex<HashSet<PathBuf>>);

#[derive(Serialize, Clone, Debug)]
pub struct Voice {
    pub id: String,
    pub name: String,
    pub lang: String,
    pub preferred: bool,
}

// ---------------------------------------------------------------------------
// system voices

#[cfg(target_os = "macos")]
fn list_voices() -> Result<Vec<Voice>, String> {
    let out = std::process::Command::new("/usr/bin/say")
        .args(["-v", "?"])
        .output()
        .map_err(|e| format!("could not run say: {e}"))?;
    let text = String::from_utf8_lossy(&out.stdout);
    Ok(parse_say_list(&text))
}

/// `say -v ?` prints `Name (Variant)    xx_XX    # sample`. The name can hold
/// spaces and parentheses, so the locale token is what the line is split on.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn parse_say_list(text: &str) -> Vec<Voice> {
    let mut v: Vec<Voice> = Vec::new();
    for line in text.lines() {
        let head = line.split('#').next().unwrap_or("").trim_end();
        let toks: Vec<&str> = head.split_whitespace().collect();
        let Some(pos) = toks.iter().rposition(|t| {
            let b = t.as_bytes();
            (b.len() == 5 || b.len() == 6)
                && b[0].is_ascii_lowercase()
                && b[1].is_ascii_lowercase()
                && (b[2] == b'_' || b[2] == b'-')
        }) else {
            continue;
        };
        let name = toks[..pos].join(" ");
        if name.is_empty() {
            continue;
        }
        let lang = toks[pos].replace('_', "-");
        let preferred = lang.starts_with("hi");
        v.push(Voice { id: name.clone(), name, lang, preferred });
    }
    // Hindi first, then Indian English, then the rest
    v.sort_by_key(|x| {
        if x.lang.starts_with("hi") {
            0
        } else if x.lang == "en-IN" {
            1
        } else {
            2
        }
    });
    v
}

#[cfg(target_os = "macos")]
fn synth(text: &str, voice: &str) -> Result<Vec<u8>, String> {
    let voices = list_voices()?;
    let chosen = if voice.is_empty() {
        voices.iter().find(|v| v.preferred).map(|v| v.id.clone())
    } else if voices.iter().any(|v| v.id == voice) {
        Some(voice.to_string())
    } else {
        return Err(format!("voice not installed: {voice}"));
    };
    let dir = std::env::temp_dir().join(format!("nirayana-tts-{}", std::process::id()));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let txt = dir.join(format!("{stamp}.txt"));
    let wav = dir.join(format!("{stamp}.wav"));
    std::fs::write(&txt, text).map_err(|e| e.to_string())?;
    let mut cmd = std::process::Command::new("/usr/bin/say");
    if let Some(v) = &chosen {
        cmd.arg("-v").arg(v);
    }
    cmd.arg("-o")
        .arg(&wav)
        .arg("--file-format=WAVE")
        .arg("--data-format=LEI16@24000")
        .arg("-f")
        .arg(&txt);
    let st = cmd.status().map_err(|e| format!("could not run say: {e}"))?;
    let _ = std::fs::remove_file(&txt);
    if !st.success() {
        return Err("say failed".into());
    }
    let bytes = std::fs::read(&wav).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&wav);
    if bytes.len() <= 44 {
        return Err("the system voice returned no audio".into());
    }
    Ok(bytes)
}

#[cfg(target_os = "windows")]
fn list_voices() -> Result<Vec<Voice>, String> {
    use windows::Media::SpeechSynthesis::SpeechSynthesizer;
    let all = SpeechSynthesizer::AllVoices().map_err(|e| e.to_string())?;
    let mut v = Vec::new();
    for i in 0..all.Size().map_err(|e| e.to_string())? {
        let info = all.GetAt(i).map_err(|e| e.to_string())?;
        let name = info.DisplayName().map_err(|e| e.to_string())?.to_string();
        let lang = info.Language().map_err(|e| e.to_string())?.to_string();
        let preferred = lang.starts_with("hi");
        v.push(Voice { id: name.clone(), name, lang, preferred });
    }
    v.sort_by_key(|x| if x.lang.starts_with("hi") { 0 } else if x.lang == "en-IN" { 1 } else { 2 });
    Ok(v)
}

#[cfg(target_os = "windows")]
fn synth(text: &str, voice: &str) -> Result<Vec<u8>, String> {
    use windows::core::HSTRING;
    use windows::Media::SpeechSynthesis::SpeechSynthesizer;
    use windows::Storage::Streams::DataReader;
    let s = SpeechSynthesizer::new().map_err(|e| e.to_string())?;
    let all = SpeechSynthesizer::AllVoices().map_err(|e| e.to_string())?;
    let mut found = voice.is_empty();
    for i in 0..all.Size().map_err(|e| e.to_string())? {
        let info = all.GetAt(i).map_err(|e| e.to_string())?;
        let name = info.DisplayName().map_err(|e| e.to_string())?.to_string();
        let lang = info.Language().map_err(|e| e.to_string())?.to_string();
        if (!voice.is_empty() && name == voice) || (voice.is_empty() && lang.starts_with("hi")) {
            s.SetVoice(&info).map_err(|e| e.to_string())?;
            found = true;
            break;
        }
    }
    if !found {
        return Err(format!("voice not installed: {voice}"));
    }
    let stream = s
        .SynthesizeTextToStreamAsync(&HSTRING::from(text))
        .map_err(|e| e.to_string())?
        .join()
        .map_err(|e| e.to_string())?;
    let size = stream.Size().map_err(|e| e.to_string())? as u32;
    let input = stream.GetInputStreamAt(0).map_err(|e| e.to_string())?;
    let reader = DataReader::CreateDataReader(&input).map_err(|e| e.to_string())?;
    reader.LoadAsync(size).map_err(|e| e.to_string())?.join().map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; size as usize];
    reader.ReadBytes(&mut buf).map_err(|e| e.to_string())?;
    if buf.len() <= 44 {
        return Err("the system voice returned no audio".into());
    }
    Ok(buf)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn list_voices() -> Result<Vec<Voice>, String> {
    Ok(Vec::new())
}
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn synth(_text: &str, _voice: &str) -> Result<Vec<u8>, String> {
    Err("no system voice on this platform".into())
}

#[tauri::command]
pub async fn tts_list_voices() -> Result<Vec<Voice>, String> {
    tauri::async_runtime::spawn_blocking(list_voices)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn tts_system(text: String, voice: String) -> Result<Response, String> {
    if text.len() > 8000 {
        return Err("line too long for one clip".into());
    }
    let bytes = tauri::async_runtime::spawn_blocking(move || synth(&text, &voice))
        .await
        .map_err(|e| e.to_string())??;
    Ok(Response::new(bytes))
}

// ---------------------------------------------------------------------------
// files

pub fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// A file name the save dialog may suggest: no directories, no control
/// characters, nothing that walks out of the folder the user chooses.
pub fn safe_name(s: &str) -> String {
    let n: String = s
        .chars()
        .filter(|c| !c.is_control() && !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
        .collect();
    let n = n.trim().trim_start_matches('.').to_string();
    if n.is_empty() {
        "reel".into()
    } else {
        n.chars().take(120).collect()
    }
}

/// The bytes arrive as the raw request body (no JSON array of numbers for a
/// twenty-megabyte video); the suggested name in the x-name header.
#[tauri::command]
pub async fn save_file(app: AppHandle, saved: State<'_, Saved>, request: Request<'_>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected the file as raw bytes".into());
    };
    let name = request
        .headers()
        .get("x-name")
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .map(|s| safe_name(&s))
        .unwrap_or_else(|| "reel".into());
    let bytes = bytes.clone();
    let app2 = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app2.dialog().file().set_file_name(&name).blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;
    let Some(fp) = picked else { return Ok(None) };
    let path = fp.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    saved.0.lock().map_err(|e| e.to_string())?.insert(path.clone());
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn reveal_in_folder(saved: State<'_, Saved>, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !saved.0.lock().map_err(|e| e.to_string())?.contains(&p) {
        return Err("only a file saved by this app can be shown".into());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("/usr/bin/open").arg("-R").arg(&p).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        let mut arg = std::ffi::OsString::from("/select,");
        arg.push(p.as_os_str());
        std::process::Command::new("explorer.exe").arg(arg).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_say_listing() {
        let t = "Alex                en_US    # Most people recognize me by my voice.\n\
                 Lekha               hi_IN    # नमस्ते, मेरा नाम लेखा है।\n\
                 Lekha (Enhanced)    hi_IN    # नमस्ते\n\
                 Rishi               en_IN    # Hello, my name is Rishi.\n";
        let v = parse_say_list(t);
        assert_eq!(v.len(), 4);
        assert_eq!(v[0].lang, "hi-IN");
        assert!(v.iter().any(|x| x.id == "Lekha (Enhanced)"));
        assert_eq!(v[2].id, "Rishi");
    }

    #[test]
    fn names_are_made_safe() {
        assert_eq!(safe_name("../../etc/passwd"), "etcpasswd");
        assert_eq!(safe_name("learn.nakshatra.4.mp4"), "learn.nakshatra.4.mp4");
        assert_eq!(safe_name(""), "reel");
        assert_eq!(percent_decode("%E0%A4%B0%E0%A5%80%E0%A4%B2.mp4"), "रील.mp4");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn system_voice_returns_wav() {
        let v = list_voices().unwrap();
        assert!(!v.is_empty(), "no voices listed");
        let id = v.iter().find(|x| x.preferred).or(v.first()).unwrap().id.clone();
        let wav = synth("नमस्ते", &id).unwrap();
        assert!(wav.len() > 1000);
        assert_eq!(&wav[0..4], b"RIFF");
    }
}

// ---------------------------------------------------------------------------
// Connected mode — strictly opt-in. Off unless the reader switches it on in
// the page; even then only these three hosts can be reached, and the key is
// read here, from the keychain, so it never travels back into the webview.

const SERVICE: &str = "com.aseemm84.nirayana.reel-agent";

fn host_for(provider: &str) -> Option<&'static str> {
    match provider {
        "anthropic" => Some("https://api.anthropic.com"),
        "gemini" => Some("https://generativelanguage.googleapis.com"),
        "elevenlabs" => Some("https://api.elevenlabs.io"),
        _ => None,
    }
}

/// A path the page may ask for: an API path on the chosen host and nothing
/// that could change the host or walk out of the API.
pub fn path_ok(path: &str) -> bool {
    (path.starts_with("/v1/") || path.starts_with("/v1beta/"))
        && !path.contains("://")
        && !path.contains("..")
        && !path.contains('@')
        && !path.contains('\\')
        && path.len() < 512
}

#[derive(Serialize)]
pub struct KeyStatus {
    pub stored: bool,
    pub hint: String,
}

fn entry(provider: &str) -> Result<keyring::Entry, String> {
    if host_for(provider).is_none() {
        return Err(format!("unknown provider {provider}"));
    }
    keyring::Entry::new(SERVICE, provider).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn keychain_get(provider: String) -> Result<KeyStatus, String> {
    match entry(&provider)?.get_password() {
        Ok(k) => {
            let tail: String = k.chars().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect();
            Ok(KeyStatus { stored: true, hint: format!("…{tail}") })
        }
        Err(keyring::Error::NoEntry) => Ok(KeyStatus { stored: false, hint: String::new() }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn keychain_set(provider: String, key: String) -> Result<(), String> {
    let key = key.trim().to_string();
    if key.is_empty() || key.len() > 512 {
        return Err("that does not look like a key".into());
    }
    entry(&provider)?.set_password(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn keychain_delete(provider: String) -> Result<(), String> {
    match entry(&provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn b64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::with_capacity(data.len().div_ceil(3) * 4);
    for c in data.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        s.push(T[(n >> 18) as usize & 63] as char);
        s.push(T[(n >> 12) as usize & 63] as char);
        s.push(if c.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        s.push(if c.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    s
}

/// One request to one of the three hosts, with the reader's key injected
/// here. A JSON reply is returned as JSON; anything else (audio) as
/// { "b64": … }. The page already refused any body carrying chart or birth
/// fields before calling this; Rust refuses an unknown host or a stray path.
#[tauri::command]
pub async fn ai_request(provider: String, path: String, body: Option<String>, method: Option<String>) -> Result<serde_json::Value, String> {
    let host = host_for(&provider).ok_or("unknown provider")?;
    if !path_ok(&path) {
        return Err("refused: not an API path".into());
    }
    let key = match entry(&provider)?.get_password() {
        Ok(k) => k,
        Err(keyring::Error::NoEntry) => return Err(format!("no {provider} key stored in the keychain")),
        Err(e) => return Err(e.to_string()),
    };
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{host}{path}");
    let get = method.as_deref() == Some("GET");
    let mut rq = if get { client.get(&url) } else { client.post(&url) };
    rq = match provider.as_str() {
        "anthropic" => rq.header("x-api-key", &key).header("anthropic-version", "2023-06-01"),
        "gemini" => rq.header("x-goog-api-key", &key),
        _ => rq.header("xi-api-key", &key),
    };
    if !get {
        rq = rq.header("content-type", "application/json").body(body.unwrap_or_default());
    }
    let resp = rq.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let ctype = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() > 60 * 1024 * 1024 {
        return Err("response too large".into());
    }
    if !status.is_success() {
        let t = String::from_utf8_lossy(&bytes);
        return Err(format!("{provider} {}: {}", status.as_u16(), t.chars().take(300).collect::<String>()));
    }
    if ctype.contains("json") {
        serde_json::from_slice(&bytes).map_err(|e| e.to_string())
    } else {
        Ok(serde_json::json!({ "b64": b64(&bytes), "contentType": ctype }))
    }
}

#[cfg(test)]
mod connected_tests {
    use super::*;

    #[test]
    fn only_api_paths_pass() {
        assert!(path_ok("/v1/messages"));
        assert!(path_ok("/v1beta/models/gemini-3.5-flash-lite:generateContent"));
        assert!(!path_ok("https://evil.example/v1/x"));
        assert!(!path_ok("/v1/../../etc"));
        assert!(!path_ok("/v2/messages"));
        assert!(!path_ok("/v1/@evil.example"));
        assert!(host_for("openai").is_none());
    }

    #[test]
    fn base64_matches_the_standard() {
        assert_eq!(b64(b"Man"), "TWFu");
        assert_eq!(b64(b"Ma"), "TWE=");
        assert_eq!(b64(b"M"), "TQ==");
    }

    // The real keychain, on the macOS CI runner.
    #[cfg(target_os = "macos")]
    #[test]
    fn keychain_round_trip() {
        let p = "elevenlabs".to_string();
        let _ = keychain_delete(p.clone());
        keychain_set(p.clone(), "test-key-1234".into()).unwrap();
        let s = keychain_get(p.clone()).unwrap();
        assert!(s.stored);
        assert_eq!(s.hint, "…1234");
        keychain_delete(p.clone()).unwrap();
        assert!(!keychain_get(p).unwrap().stored);
    }
}

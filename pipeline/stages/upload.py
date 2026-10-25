"""Stage 6: upload to YouTube as PRIVATE for final human review.

Private-first is deliberate, not a limitation:
- You review the finished video on YouTube itself before publishing.
- Unverified API projects can ONLY upload private videos until they pass
  Google's compliance audit, so this default always works.
- Each upload costs 1,600 quota units of the 10,000/day default (~6/day max).

First run opens a browser OAuth flow; the token is cached for later runs.
Setup (one-time): create a Google Cloud project, enable "YouTube Data API v3",
create OAuth client credentials (Desktop app), download the JSON to the path
in config.yaml (upload.client_secrets).
"""

from pathlib import Path

from core.config import PIPELINE_ROOT

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def run(ctx):
    cfg, manifest = ctx["config"], ctx["manifest"]
    if manifest.dry_run:
        print("  dry run: skipping YouTube upload.")
        return {"skipped": "dry_run"}

    youtube = _authenticated_client(cfg)
    from googleapiclient.http import MediaFileUpload

    meta = manifest.data["meta"]
    body = {
        "snippet": {
            "title": meta.get("title", manifest.topic)[:100],
            "description": meta.get("description", ""),
            "tags": meta.get("tags", []),
            "categoryId": str(cfg.get("upload.category_id", "27")),  # 27 = Education
        },
        "status": {
            "privacyStatus": cfg.get("upload.privacy", "private"),
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(str(ctx["project_dir"] / "final.mp4"),
                            chunksize=8 * 1024 * 1024, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  uploading... {int(status.progress() * 100)}%")
    video_id = response["id"]
    print(f"  uploaded: https://youtube.com/watch?v={video_id} (private)")

    thumb = ctx["project_dir"] / "thumbnail.jpg"
    if thumb.exists():
        try:  # custom thumbnails require a phone-verified channel
            youtube.thumbnails().set(videoId=video_id,
                                     media_body=MediaFileUpload(str(thumb))).execute()
        except Exception as exc:
            print(f"  thumbnail not set ({exc}); set it manually in YouTube Studio.")

    return {"video_id": video_id, "url": f"https://youtube.com/watch?v={video_id}"}


def _authenticated_client(cfg):
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        raise RuntimeError(
            "YouTube upload needs the Google API packages: "
            "pip install google-api-python-client google-auth-oauthlib"
        )

    secrets_path = _resolve(cfg.get("upload.client_secrets", "secrets/client_secret.json"))
    token_path = _resolve(cfg.get("upload.token_file", "secrets/token.json"))

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not secrets_path.exists():
                raise RuntimeError(
                    f"OAuth client secrets not found at {secrets_path}. "
                    "See the setup notes at the top of stages/upload.py."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(secrets_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(creds.to_json())

    return build("youtube", "v3", credentials=creds)


def _resolve(path_str: str) -> Path:
    path = Path(path_str)
    return path if path.is_absolute() else PIPELINE_ROOT / path

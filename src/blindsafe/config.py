from __future__ import annotations

from dataclasses import asdict, dataclass, fields
import json
from pathlib import Path


CONFIG_PATH = Path("local_config.json")


@dataclass
class AppConfig:
    webhook_url: str = ""
    templates_folder_id: str = ""
    supporting_folder_id: str = "332"
    output_dir: str = "outputs"
    gemini_api_key: str = ""


def load_config() -> AppConfig:
    if not CONFIG_PATH.exists():
        return AppConfig()

    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    known = {f.name for f in fields(AppConfig)}
    return AppConfig(**{k: v for k, v in data.items() if k in known})


def save_config(config: AppConfig) -> None:
    CONFIG_PATH.write_text(
        json.dumps(asdict(config), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

import json
from pathlib import Path
from typing import List, Dict


class OutlineSerializer:
    """
    Serializes a document title + outline into the required JSON schema.
    """

    def __init__(self, title: str, outline: List[Dict[str, object]]):
        self.title = title
        self.outline = outline

    def to_json(self, out_path: Path) -> None:
        payload = {"title": self.title, "outline": self.outline}
        out_path = out_path.with_suffix(".json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

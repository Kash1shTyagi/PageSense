from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict

import pdfplumber


@dataclass(frozen=True)
class TextBlock:
    text: str
    size: float
    fontname: str
    flags: int  # bitmask: 1 = italic, 2 = bold
    page: int


class PDFParser:
    """
    Parses a PDF into a list of TextBlock(line) instances,
    where each block is a single line of text with its
    dominant font size & name.
    """

    def __init__(self, pdf_path: Path):
        self.pdf_path = pdf_path

    def extract_blocks(self) -> List[TextBlock]:
        blocks: List[TextBlock] = []

        with pdfplumber.open(self.pdf_path) as pdf:
            for page_index, page in enumerate(pdf.pages):
                chars = page.chars or []

                lines: Dict[int, List[dict]] = {}
                for ch in chars:
                    line_key = int(round(ch.get("top", 0)))
                    lines.setdefault(line_key, []).append(ch)

                for top, char_list in sorted(lines.items()):
                    char_list.sort(key=lambda c: c.get("x0", 0))

                    runs: List[List[dict]] = []
                    for ch in char_list:
                        if (
                            not runs
                            or round(ch.get("size", 0), 3) != round(runs[-1][-1].get("size", 0), 3)
                            or ch.get("fontname", "") != runs[-1][-1].get("fontname", "")
                        ):
                            runs.append([ch])
                        else:
                            runs[-1].append(ch)

                    for run in runs:
                        text = "".join([c.get("text", "") for c in run]).strip()
                        if not text:
                            continue

                        fontname = run[0].get("fontname", "") or ""
                        size = float(run[0].get("size", 0.0))

                        fname_lower = fontname.lower()
                        italic = any(token in fname_lower for token in ("italic", "oblique", "it"))
                        bold = "bold" in fname_lower or "bd" in fname_lower or "demibold" in fname_lower

                        flags = (1 if italic else 0) | (2 if bold else 0)

                        blocks.append(
                            TextBlock(
                                text=text,
                                size=size,
                                fontname=fontname,
                                flags=flags,
                                page=page_index + 1,
                            )
                        )

        return blocks

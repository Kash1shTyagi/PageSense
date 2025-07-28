from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Dict

import pdfplumber


@dataclass(frozen=True)
class TextBlock:
    text: str
    size: float
    fontname: str
    flags: int 
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
                chars = page.chars 

                lines: Dict[int, List[dict]] = {}
                for ch in chars:
                    line_key = int(round(ch["top"]))
                    lines.setdefault(line_key, []).append(ch)

                for top, char_list in sorted(lines.items()):
                    char_list.sort(key=lambda c: c["x0"])

                    runs: List[List[dict]] = []
                    for ch in char_list:
                        if not runs or (
                            ch["size"] != runs[-1][-1]["size"]
                            or ch["fontname"] != runs[-1][-1]["fontname"]
                        ):
                            runs.append([ch])
                        else:
                            runs[-1].append(ch)

                    for run in runs:
                        text = "".join([c["text"] for c in run]).strip()
                        if not text:
                            continue
                        blocks.append(
                            TextBlock(
                                text=text,
                                size=run[0]["size"],
                                fontname=run[0]["fontname"],
                                flags=0,
                                page=page_index + 1,
                            )
                        )

        return blocks


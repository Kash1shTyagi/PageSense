from typing import List, Optional, Dict
import numpy as np

from .parser import TextBlock


class HeadingDetector:
    """
    Uses dynamic, per-document font-size percentiles and style flags
    to classify TextBlocks into H1, H2, H3 headings.
    """

    def __init__(self, blocks: List[TextBlock]):
        self.blocks = blocks or []
        sizes = np.array([b.size for b in blocks], dtype=float) if blocks else np.array([], dtype=float)

        if sizes.size == 0:
            p99 = p90 = p75 = 0.0
        else:
            p99, p90, p75 = np.percentile(sizes, [99, 90, 75])

        if p99 <= 0:
            p99 = p90 = p75 = max(sizes.max() if sizes.size else 0.0, 0.0)
        if p90 >= p99:
            p90 = p99 * 0.9 if p99 > 0 else p99
        if p75 >= p90:
            p75 = p90 * 0.9 if p90 > 0 else p75

        self.thresholds = {"H1": p99, "H2": p90, "H3": p75}
        self.document_title: Optional[str] = None

    def detect_headings(self) -> List[Dict[str, object]]:
        outline: List[Dict[str, object]] = []
        for block in self.blocks:
            level = self._classify(block)
            if level:
                if level == "H1" and self.document_title is None:
                    self.document_title = block.text.strip()
                outline.append(
                    {
                        "level": level,
                        "text": block.text.strip(),
                        "page": block.page,
                    }
                )
        return outline

    def _classify(self, block: TextBlock) -> Optional[str]:
        """
        Classification rules (heuristic):
        - H1: size >= p99
        - H2: size >= p90 AND bold flag present (flags & 2)
        - H3: size >= p75 AND single-line (no newline inside)
        """
        size = block.size
        flags = block.flags or 0
        if size >= self.thresholds["H1"] and size > 0:
            return "H1"
        if size >= self.thresholds["H2"] and (flags & 2):
            return "H2"
        if size >= self.thresholds["H3"] and "\n" not in block.text:
            return "H3"
        return None

import argparse
import logging
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

from utils.parser import PDFParser
from utils.heading import HeadingDetector
from utils.serializer import OutlineSerializer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

logger = logging.getLogger(__name__)


def process_file(pdf_path: Path, output_dir: Path) -> None:
    """
    Parse a single PDF, detect headings, and write JSON outline.
    """
    logger.info(f"Processing {pdf_path.name}")
    parser = PDFParser(pdf_path)
    blocks = parser.extract_blocks()

    if not blocks:
        logger.warning("No text blocks extracted from %s", pdf_path.name)
        return

    detector = HeadingDetector(blocks)
    outline = detector.detect_headings()

    title = detector.document_title or (blocks[0].text[:50] if blocks else pdf_path.stem)
    serializer = OutlineSerializer(title=title, outline=outline)
    out_path = output_dir / f"{pdf_path.stem}.json"
    serializer.to_json(out_path)

    logger.info(f"Saved outline to {out_path.name}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch PDF → JSON outline extractor"
    )
    parser.add_argument(
        "-i", "--input-dir",
        type=Path, required=True,
        help="Directory containing .pdf files"
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=Path, required=True,
        help="Directory to write .json outlines"
    )
    parser.add_argument(
        "-p", "--processes",
        type=int, default=4,
        help="Number of parallel processes"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    pdf_files = list(args.input_dir.glob("*.pdf"))
    if not pdf_files:
        logger.error("No PDF files found in %s", args.input_dir)
        return

    with ProcessPoolExecutor(max_workers=args.processes) as executor:
        futures = {
            executor.submit(process_file, pdf, args.output_dir): pdf
            for pdf in pdf_files
        }
        for fut in as_completed(futures):
            pdf = futures[fut]
            try:
                fut.result()
            except Exception as e:
                logger.exception("Failed on %s: %s", pdf.name, e)


if __name__ == "__main__":
    main()

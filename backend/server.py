from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import tempfile
import shutil
import logging
from typing import Optional
import os

from utils.parser import PDFParser
from utils.heading import HeadingDetector
from utils.serializer import OutlineSerializer

app = FastAPI(title="PageSense Outline Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("pagesense_server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DEFAULT_INPUT_DIR = Path("input").resolve()
DEFAULT_OUTPUT_DIR = Path("output").resolve()


def clean_directory(dir_path: Path) -> None:
    """Delete all files and subdirectories inside dir_path.

    Safety: only allow cleaning directories that are inside the current working directory.
    This avoids accidental deletion of system folders.
    """
    try:
        dir_path = dir_path.resolve()
        cwd = Path.cwd().resolve()
        if not str(dir_path).startswith(str(cwd)):
            logger.warning("Refusing to clean outside-directory: %s", dir_path)
            return
        if not dir_path.exists():
            return
        for entry in dir_path.iterdir():
            try:
                if entry.is_file() or entry.is_symlink():
                    entry.unlink()
                    logger.info("Deleted file: %s", entry)
                elif entry.is_dir():
                    shutil.rmtree(entry)
                    logger.info("Deleted directory: %s", entry)
            except Exception as e:
                logger.exception("Failed to delete %s: %s", entry, e)
    except Exception as e:
        logger.exception("Failed to clean directory %s: %s", dir_path, e)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract_outline(
    file: UploadFile = File(...),
    save_json: Optional[bool] = Query(False, description="If true, server will write the JSON file to output_dir"),
    output_dir: Optional[str] = Query(None, description="Directory where to save JSON if save_json is true"),
    cleanup_dirs: Optional[bool] = Query(True, description="If true, clean DEFAULT input/output dirs after processing")
):
    """
    Accepts a single PDF file upload and returns JSON with the extracted outline.

    Query params:
    - save_json (bool): whether to save a .json file on the server
    - output_dir (str): directory path where to save the json (created if missing)
    - cleanup_dirs (bool): whether to delete files inside default input/output directories after successful processing
    """

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

    tmp_pdf = None
    out_path_obj = None
    saved = False
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp_pdf = Path(tmp.name)
            while True:
                chunk = await file.read(2 ** 16)
                if not chunk:
                    break
                tmp.write(chunk)

        parser = PDFParser(tmp_pdf)
        blocks = parser.extract_blocks()

        if not blocks:
            raise HTTPException(status_code=422, detail="No text blocks could be extracted from the PDF")

        detector = HeadingDetector(blocks)
        outline = detector.detect_headings()
        title = detector.document_title or (blocks[0].text[:200] if blocks else tmp_pdf.stem)

        payload = {"title": title, "outline": outline}

        if save_json:
            if not output_dir:
                raise HTTPException(status_code=400, detail="output_dir must be provided when save_json=true")
            out_path = Path(output_dir)
            out_path.mkdir(parents=True, exist_ok=True)
            serializer = OutlineSerializer(title=title, outline=outline)
            serializer.to_json(out_path / f"{tmp_pdf.stem}.json")
            out_path_obj = out_path
            saved = True

        if cleanup_dirs:
            if out_path_obj:
                clean_directory(out_path_obj)
            clean_directory(DEFAULT_INPUT_DIR)
            clean_directory(DEFAULT_OUTPUT_DIR)

        return JSONResponse(content=payload)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to extract outline: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if tmp_pdf and tmp_pdf.exists():
                tmp_pdf.unlink()
        except Exception:
            pass


@app.post("/extract_from_path")
async def extract_from_path(
    path: str = Query(..., description="Path to a .pdf file on server filesystem"),
    cleanup_dirs: Optional[bool] = Query(True, description="If true, clean default input/output dirs after processing")
):
    p = Path(path)
    if not p.exists() or p.suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Path does not exist or is not a PDF")

    try:
        parser = PDFParser(p)
        blocks = parser.extract_blocks()
        if not blocks:
            raise HTTPException(status_code=422, detail="No text blocks could be extracted from the PDF")
        detector = HeadingDetector(blocks)
        outline = detector.detect_headings()
        title = detector.document_title or (blocks[0].text[:200] if blocks else p.stem)

        try:
            p.unlink()
            logger.info("Deleted source PDF: %s", p)
        except Exception:
            logger.exception("Failed to delete source PDF: %s", p)

        if cleanup_dirs:
            clean_directory(DEFAULT_INPUT_DIR)
            clean_directory(DEFAULT_OUTPUT_DIR)

        return JSONResponse(content={"title": title, "outline": outline})
    except Exception as e:
        logger.exception("Failed to extract from path %s: %s", p, e)
        raise HTTPException(status_code=500, detail=str(e))

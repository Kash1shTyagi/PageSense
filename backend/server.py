from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import tempfile
import shutil
import logging
from typing import Optional

from backend.utils.parser import PDFParser
from backend.utils.heading import HeadingDetector
from backend.utils.serializer import OutlineSerializer

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


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract_outline(
    file: UploadFile = File(...),
    save_json: Optional[bool] = Query(False, description="If true, server will write the JSON file to output_dir"),
    output_dir: Optional[str] = Query(None, description="Directory where to save JSON if save_json is true")
):
    """
    Accepts a single PDF file upload and returns JSON with the extracted outline.

    Query params:
    - save_json (bool): whether to save a .json file on the server
    - output_dir (str): directory path where to save the json (created if missing)
    """

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

    tmp_pdf = None
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

        return JSONResponse(content=payload)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to extract outline: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # cleanup temp file
        try:
            if tmp_pdf and tmp_pdf.exists():
                tmp_pdf.unlink()
        except Exception:
            pass


@app.post("/extract_from_path")
async def extract_from_path(path: str = Query(..., description="Path to a .pdf file on server filesystem")):
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
        return JSONResponse(content={"title": title, "outline": outline})
    except Exception as e:
        logger.exception("Failed to extract from path %s: %s", p, e)
        raise HTTPException(status_code=500, detail=str(e))

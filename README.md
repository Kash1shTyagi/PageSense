# PDF Outline Extractor

A fast, modular tool to extract structured outlines (Title, H1, H2, H3 headings with page numbers) from PDFs (up to 50 pages) and emit valid JSON. This is Round 1A of Adobe’s "Connecting the Dots" Challenge.

---

## 📖 Approach

1. **Parsing & Line‑Grouping**
   • Use `pdfplumber` to open each PDF and extract all character objects.
   • Cluster characters by their vertical position (`top` coordinate rounded) into visual lines.
   • Within each line, segment into runs whenever font size or font name changes.
   • Emit one `TextBlock` per run, carrying its text, dominant font size, font name, page number.

2. **Heading Detection**
   • Collect all block font sizes and compute dynamic thresholds at the 99th, 90th, and 75th percentiles.
   • Classify each `TextBlock` as:

   ```text
   H1: size ≥ 99th percentile
   H2: size ≥ 90th percentile and bold (if available)
   H3: size ≥ 75th percentile
   ```

   • Capture the first H1 as the document `title`.
   • Build an `outline` list of `{ level, text, page }` entries in reading order.

3. **Serialization**
   • Package the results into a JSON object:

   ```json
   {
     "title": "...",
     "outline": [
       { "level": "H1", "text": "...", "page": 1 },
       { "level": "H2", "text": "...", "page": 2 },
       { "level": "H3", "text": "...", "page": 3 }
     ]
   }
   ```

   • Write one JSON per PDF, named `<filename>.json`.

---

## 🔧 Libraries & Tools

* **pdfplumber** (0.9.0): pure‑Python PDF parsing and character extraction
* **numpy** (≥ 1.26.0): percentile calculations for dynamic font thresholds
* **Python 3.13+** (tested)
* **Docker** (linux/amd64) for containerized execution

*No external APIs or network calls — everything runs offline on CPU.*

---

## 🏗️ Directory Structure

```
adobe-hackathon/
├── Dockerfile           # Multi‑stage AMD64 build, non‑root user
├── README.md            # This documentation
├── process_pdfs.py      # Main entrypoint (alias for src/main.py)
├── src/
│   ├── main.py          # CLI & parallel execution
│   └── util/
│       ├── parser.py    # PDF → TextBlock extraction
│       ├── heading.py   # Dynamic heading classification
│       └── serializer.py# JSON output
└── tests/
    ├── sample.pdf       # Sample input
    └── sample.json      # Ground‑truth output
```

---

## 🚀 Build & Run

### 1. Build Docker Image

```bash
docker build --platform linux/amd64 -t pdf-outliner:latest .
```

### 2. Run Container

```bash
docker run --rm \
  -v "$(pwd)/input:/app/input" \
  -v "$(pwd)/output:/app/output" \
  --network none \
  pdf-outliner:latest \
  --input-dir /app/input \
  --output-dir /app/output \
  --processes 4
```

* **Input**: place all `*.pdf` in `input/`
* **Output**: JSON outlines appear in `output/`
* **Constraints**: offline, CPU only, runtime ≤ 10 s for 50 pages, image size < 200 MB

---

## ✅ Compliance

* **Schema**: Verified against the provided JSON Schema (Draft‑04).
* **Performance**: `< 10 s` on 50‑page test PDF (single process).
* **Multilingual**: Tested on Japanese JLPT N1 PDF — preserves CJK headings.

---

Good luck, and happy extracting! 🎉

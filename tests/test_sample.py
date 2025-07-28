import json
from pathlib import Path
from subprocess import run, PIPE

def test_sample_roundtrip(tmp_path):
    (tmp_path / "input").mkdir()
    (tmp_path / "output").mkdir()
    src_pdf = Path(__file__).parent / "sample.pdf"
    dest_pdf = tmp_path / "input" / "sample.pdf"
    dest_pdf.write_bytes(src_pdf.read_bytes())

    cmd = [
        "python", "src/main.py",
        "-i", str(tmp_path / "input"),
        "-o", str(tmp_path / "output"),
        "-p", "1"
    ]
    result = run(cmd, stdout=PIPE, stderr=PIPE, text=True)
    assert result.returncode == 0

    got = json.loads((tmp_path / "output" / "sample.json").read_text())
    want = json.loads((Path(__file__).parent / "sample.json").read_text())
    assert got == want
"""Generate sample document images for testing OCR.

    python -m scripts.make_demo_docs

Writes PNGs to backend/demo_docs/. Upload these in the application wizard to see
real OCR extraction (requires Tesseract to be installed).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path("demo_docs")


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _doc(filename: str, title: str, lines: list[str]) -> None:
    img = Image.new("RGB", (900, 560), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 880, 540], outline="black", width=2)
    d.text((450, 60), title, font=_font(34), fill="black", anchor="mm")
    d.line([120, 95, 780, 95], fill="black", width=1)
    y = 150
    for line in lines:
        d.text((80, y), line, font=_font(24), fill="black")
        y += 55
    img.save(OUT / filename)
    print(f"  wrote {OUT / filename}")


def run() -> None:
    OUT.mkdir(exist_ok=True)
    _doc(
        "income_certificate_match.png",
        "INCOME CERTIFICATE",
        [
            "Name: Ramakrishnan G",
            "Father's Name: Gopal K",
            "Annual Income: Rs 1,80,000",
            "Certificate No: TN123456",
            "Date: 12/06/2026",
            "Issued by: Tahsildar, Chennai",
        ],
    )
    _doc(
        "income_certificate_mismatch.png",
        "INCOME CERTIFICATE",
        [
            "Name: Ramakrishnan G",
            "Father's Name: Gopal K",
            "Annual Income: Rs 2,40,000",
            "Certificate No: TN998877",
            "Date: 05/06/2026",
            "Issued by: Tahsildar, Chennai",
        ],
    )
    _doc(
        "aadhaar.png",
        "IDENTITY DOCUMENT",
        ["Name: Ramakrishnan G", "DOB: 12/06/2004", "Number: XXXX XXXX 1234"],
    )
    _doc(
        "marksheet.png",
        "MARKSHEET - CLASS XII",
        ["Name: Ramakrishnan G", "Percentage: 91%", "Board: State Board", "Year: 2022"],
    )
    print("Done. Upload demo_docs/income_certificate_mismatch.png to trigger a flag.")


if __name__ == "__main__":
    run()

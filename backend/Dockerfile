FROM python:3.12-slim

# OCR: Tesseract + the languages this deployment uses
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr tesseract-ocr-eng tesseract-ocr-tam tesseract-ocr-hin \
        libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1 \
    TESSERACT_CMD=/usr/bin/tesseract \
    STORAGE_DIR=/app/storage

EXPOSE 8000

# entrypoint decides: run the API, or the Kafka worker
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["api"]

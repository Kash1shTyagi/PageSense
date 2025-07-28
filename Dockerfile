FROM --platform=linux/amd64 python:3.11-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM --platform=linux/amd64 python:3.11-slim

RUN useradd --create-home appuser
WORKDIR /app

COPY --from=builder /install /usr/local
COPY src/ ./src/

RUN chown -R appuser:appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "-u", "src/main.py"]

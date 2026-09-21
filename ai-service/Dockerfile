FROM python:3.9-slim

WORKDIR /app

# Install system dependencies required for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HuggingFace spaces default to 7860, Render uses PORT env var
ENV PORT=7860
EXPOSE $PORT

# Run the FastAPI server
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

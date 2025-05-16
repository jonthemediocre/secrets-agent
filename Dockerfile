FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir pyyaml watchdog cryptography flask requests python-dotenv

# Copy application code
COPY . .

# Install the package in development mode
RUN pip install -e .

# Create necessary directories
RUN mkdir -p data projects secrets_secure logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PRODUCTION=true
ENV PYTHONPATH=/app

# Expose ports
EXPOSE 5000
EXPOSE 5001

# Default command (will be overridden by docker-compose)
CMD ["python", "agent_core/router.py"]
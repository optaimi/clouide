# Use a lightweight Python image
FROM python:3.11-slim

# Install system dependencies (Git is required)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create a non-root user 'coder' to hide 'adamenty' and restrict access
RUN useradd -m coder
RUN mkdir -p /home/coder/clouide_workspaces && chown -R coder:coder /home/coder/clouide_workspaces

USER coder

# Run the backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

# Clear any ENTRYPOINT from the base image
ENTRYPOINT []

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "start.py"]

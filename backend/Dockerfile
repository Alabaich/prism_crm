FROM python:3.11-slim

WORKDIR /code

# Install system dependencies required for building Postgres drivers
RUN apt-get update && apt-get install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# No CMD here because docker-compose handles it for both the API and the Worker
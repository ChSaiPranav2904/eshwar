FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY model.py engine.py server.py ./
COPY artifacts ./artifacts
RUN useradd --uid 10001 --create-home model && mkdir state && chown -R model:model /app
USER model
ENV ML_HOST=0.0.0.0 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
EXPOSE 8001
CMD ["python", "server.py"]

web: gunicorn app:app --bind 0.0.0.0:8000 --workers=3 --threads=2 --worker-class=gthread --worker-connections=1000 --timeout=120 --keep-alive=5 --max-requests=1000 --max-requests-jitter=50

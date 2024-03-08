FROM python:3.11-slim

RUN apt-get update && apt-get install -y gcc

# RUN apt-get install -y libpangocairo-1.0-0
# RUN apt-get install -y libcairo2-dev libcairo2 libpango-1.0.0 libpangocairo-1.0-0


# RUN apk update && apk add git gcc
#
# RUN apk add cairo cairo-dev pango pango-dev
#
# RUN apk add musl-dev libffi-dev jpeg-dev zlib-dev libjpeg freetype-dev lcms2-dev
#
# RUN apk add linux-headers g++ python3-dev build-base cmake
#
# RUN apk add openblas openblas-dev


WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
COPY . .
RUN mkdir -p junk
RUN mkdir -p uploads
EXPOSE 5002
CMD ["python", "run.py"]

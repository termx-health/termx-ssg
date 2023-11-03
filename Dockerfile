FROM node:20
RUN apt-get update

ENV PUPPETEER_SKIP_DOWNLOAD true

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 libnss3  \
      ruby-full build-essential zlib1g-dev \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && gem install bundler

COPY _generate.sh ./_generate.sh
COPY __codegen ./__codegen
COPY template/ ./template

RUN cd __codegen && npm install
RUN cd template && bundle install

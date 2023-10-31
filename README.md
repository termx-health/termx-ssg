# TermX Experimental SSG

See `__codegen` README.md file before running commands below:

```sh
bundle install
```

```sh
bundle exec jekyll serve
```


## Docker

```shell
docker build -t docker.kodality.com/termx-jekyll-builder:latest .
```

```shell
this="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

docker run --rm -it -v $this:/ssg  \
  docker.kodality.com/termx-jekyll-builder /bin/bash -c "chmod -R 777 ./_generate.sh && ./_generate.sh"
```


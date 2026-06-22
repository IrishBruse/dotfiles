# Deploy

There is no build step. Host the folder containing `index.html` and the markdown.

## GitHub Pages

Put the site in `docs/` on the `main` branch, then set Pages source to `main branch /docs folder`. Include an empty `.nojekyll` in the deploy location so files starting with `_` are served.

## Netlify

Base directory `docs`, build command blank, publish directory `docs/`. For `routerMode: 'history'`, add `docs/_redirects`:

```text
/*    /index.html   200
```

## Vercel

```bash
npm i -g vercel
cd docs
vercel
```

## GitLab Pages

`.gitlab-ci.yml`:

```yaml
pages:
  stage: deploy
  script:
    - cp -r docs/. public
  artifacts:
    paths:
      - public
  only:
    - main
```

## Nginx

```nginx
server {
  listen 80;
  server_name your.domain.com;
  location / {
    alias /path/to/docs/;
    index index.html;
  }
}
```

For `routerMode: 'history'`, rewrite to `index.html` instead:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Docker

```dockerfile
FROM node:latest
WORKDIR /docs
RUN npm install -g docsify-cli@latest
EXPOSE 3000
ENTRYPOINT docsify serve .
```

```bash
docker build -t docsify/demo .
docker run -itp 3000:3000 -v $(pwd):/docs docsify/demo
```

## History mode note

Any static host serving history-mode URLs must rewrite all paths to `index.html` (rewrite rules, `_redirects`, `try_files`, etc.). Hash mode needs no rewrites.

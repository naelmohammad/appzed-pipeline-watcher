# AppZed Pipeline Watcher Agent

Watches data jobs for failures and schema drift, and pinpoints the break. Jobs report results as webhooks; schema snapshots diff against the last baseline. Schema self-initializes. No AI needed.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/naelmohammad/appzed-pipeline-watcher)

Click **Deploy to Cloudflare**: it clones this repo to your GitHub account, provisions the bindings below on your Cloudflare account, and wires CI/CD with preview URLs on every PR.

## Bindings (auto-provisioned)

```jsonc
{
  "name": "appzed-pipeline-watcher",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "appzed-pipeline-watcher-meta"
    }
  ]
}
```

## Try it

```bash
curl -X POST https://<your-worker>.workers.dev/runs \
  -H 'content-type: application/json' \
  -d '{"job":"nightly-sync","status":"failed","detail":"connection timeout after 30s"}'

curl -X POST https://<your-worker>.workers.dev/schema \
  -H 'content-type: application/json' \
  -d '{"job":"nightly-sync","columns":["id","email","plan"]}'

curl https://<your-worker>.workers.dev/failures
```

GET /health for a liveness check. Managed by AppZed (https://dev.appzed.com/solutions/pipeline-watcher).

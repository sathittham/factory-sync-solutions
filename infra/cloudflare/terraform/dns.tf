# DNS ownership note — most records for this zone are NOT standalone here:
#
#   *.pages.dev-backed hostnames (app, backoffice, official + staging) → created
#     by attaching the custom domain to the Cloudflare Pages project.
#   api / api-staging → created by the api-gateway Worker's `custom_domain`
#     routes in ../workers/api-gateway/wrangler.toml (Wrangler owns them).
#   cdn / cdn-staging → R2 custom domains, currently managed out-of-band
#     (dashboard) because the provider can't import cloudflare_r2_custom_domain
#     yet; see the commented block in r2.tf.
#
# Managing those same hostnames as raw cloudflare_dns_record here would fight
# Pages/Wrangler/R2 for ownership. Add records below ONLY for hostnames not
# owned by another system (e.g. MX, SPF/DKIM TXT, apex verification).
